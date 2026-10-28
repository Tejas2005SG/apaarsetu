import { digitsOnly, fmtApaar, fmtDate, parseDate } from "./format";
import { matchNames, NAME_ACCEPT, normalizeName } from "./match";
import { isValidVerhoeff } from "./verhoeff";
import { ADMISSION_CUTOFF, getWorld } from "./world";
import { QUOTAS, type Check, type Ledger, type Programme, type Quota, type RowResult, type Suggestion, type UploadRow } from "./types";

export const RULE_LABEL: Record<string, string> = {
  required: "Required fields",
  apaar_format: "APAAR ID format",
  dob_format: "Date of birth",
  quota_value: "Admission quota",
  file_duplicate: "Duplicate in file",
  not_found: "APAAR registry",
  name_match: "Name match",
  dob_match: "DOB match",
  gender_match: "Gender match",
  national_duplicate: "Other enrolment",
  late_admission: "Admission date",
};

const GENDERS: Record<string, string> = { m: "M", male: "M", f: "F", female: "F", o: "O", other: "O", t: "O" };

export function normaliseGender(g: string) {
  return GENDERS[g.trim().toLowerCase()] ?? "";
}

export function normaliseQuota(q: string): Quota | null {
  const s = q.trim().toLowerCase().replace(/\s+/g, "");
  if (!s || s === "regular" || s === "general" || s === "normal") return "Regular";
  if (s.startsWith("tfw") || s.includes("tuitionfee")) return "TFW";
  if (s.startsWith("pmsss")) return "PMSSS";
  if (s.startsWith("fn") || s.includes("oci") || s.includes("pio") || s.includes("foreign")) return "FN/OCI/PIO";
  return null;
}

interface Context {
  institutionId: string;
  allRows: UploadRow[];
}

export function validateRow(row: UploadRow, ctx: Context): RowResult {
  const w = getWorld();
  const checks: Check[] = [];
  const suggestions: Suggestion[] = [];
  const add = (c: Check) => checks.push(c);
  const apaar = digitsOnly(row.apaarId);
  const dob = parseDate(row.dob);
  const gender = normaliseGender(row.gender);
  let registryName: string | undefined;
  let matchScore: number | undefined;
  let matchNote: string | undefined;
  let other: RowResult["other"];

  const missing: string[] = [];
  if (!row.apaarId.trim()) missing.push("APAAR ID");
  if (!row.name.trim()) missing.push("name");
  if (!row.dob.trim()) missing.push("date of birth");
  if (!row.gender.trim()) missing.push("gender");
  if (!row.admissionDate.trim()) missing.push("admission date");
  const firstMissingField = !row.gender.trim() ? "gender" : !row.admissionDate.trim() ? "admissionDate" : !row.dob.trim() ? "dob" : !row.name.trim() ? "name" : "apaarId";
  add({
    rule: "required", severity: "fix", ok: missing.length === 0, field: firstMissingField,
    message: missing.length ? `Missing ${missing.join(", ")}` : "All required fields present",
  });

  const formatOk = apaar.length === 12 && isValidVerhoeff(apaar);
  add({
    rule: "apaar_format", severity: "fix", ok: formatOk, field: "apaarId",
    message: formatOk ? "12 digits, check digit valid"
      : apaar.length !== 12 ? `APAAR ID must have 12 digits (found ${apaar.length})`
      : "Check digit does not match. Two digits are probably swapped or mistyped",
  });

  add({
    rule: "dob_format", severity: "fix", ok: !row.dob.trim() || !!dob, field: "dob",
    message: !row.dob.trim() || dob ? "Valid date" : `“${row.dob}” is not a real date`,
  });

  const quota = normaliseQuota(row.quota);
  add({
    rule: "quota_value", severity: "fix", ok: !!quota, field: "quota",
    message: quota ? `${quota}` : `Unknown quota “${row.quota}”. Use Regular, TFW, PMSSS or FN/OCI/PIO`,
  });

  const dupInFile = ctx.allRows.filter((r) => r.rowNo !== row.rowNo && digitsOnly(r.apaarId) === apaar && apaar.length === 12);
  add({
    rule: "file_duplicate", severity: "fix", ok: dupInFile.length === 0, field: "apaarId",
    message: dupInFile.length ? `Same APAAR ID also on row ${dupInFile.map((r) => r.rowNo).join(", ")}` : "Unique in this file",
  });

  if (!formatOk && row.name.trim() && dob) {
    const hit = w.registryByNameDob.get(`${normalizeName(row.name)}|${dob}`);
    if (hit) suggestions.push({ field: "apaarId", value: hit, reason: `APAAR record found for ${row.name}, born ${fmtDate(dob)}` });
  }

  if (formatOk) {
    const person = w.registry.get(apaar);
    add({
      rule: "not_found", severity: "review", ok: !!person,
      message: person ? "Record found in APAAR registry" : "No APAAR record exists for this ID. Possible non-existent student",
    });
    if (person) {
      registryName = person.name;
      const m = row.name.trim() ? matchNames(row.name, person.name) : { score: 0, method: "fuzzy" as const };
      matchScore = m.score;
      const ok = m.score >= NAME_ACCEPT;
      if (ok && m.method !== "exact") {
        matchNote = m.method === "normalised" ? "Abbreviation expanded" : m.method === "transliterated" ? "Spelling variant (transliteration)" : m.method === "reordered" ? "Name order differs" : "Close spelling";
      }
      add({
        rule: "name_match", severity: "review", ok, field: "name",
        message: ok ? (m.method === "exact" ? "Exact match" : `Matches “${person.name}” (${m.score.toFixed(2)}, ${matchNote?.toLowerCase()})`)
          : `“${row.name}” does not match APAAR name “${person.name}” (score ${m.score.toFixed(2)})`,
      });
      if (dob) {
        const ok2 = dob === person.dob;
        add({
          rule: "dob_match", severity: "fix", ok: ok2, field: "dob",
          message: ok2 ? "Matches APAAR record" : `APAAR record has ${fmtDate(person.dob)}, file has ${fmtDate(dob)}`,
        });
        if (!ok2) suggestions.push({ field: "dob", value: person.dob, reason: "Date of birth from APAAR record" });
      } else if (row.dob.trim()) {
        suggestions.push({ field: "dob", value: person.dob, reason: "Date of birth from APAAR record" });
      }
      if (gender) {
        const ok3 = gender === person.gender;
        add({
          rule: "gender_match", severity: "fix", ok: ok3, field: "gender",
          message: ok3 ? "Matches APAAR record" : `APAAR record has ${person.gender}, file has ${gender}`,
        });
        if (!ok3) suggestions.push({ field: "gender", value: person.gender, reason: "Gender from APAAR record" });
      } else {
        suggestions.push({ field: "gender", value: person.gender, reason: "Gender from APAAR record" });
      }
    }
    const enrolled = w.nationalIndex.get(apaar);
    const elsewhere = enrolled && enrolled.institutionId !== ctx.institutionId ? enrolled : undefined;
    if (elsewhere) other = elsewhere;
    add({
      rule: "national_duplicate", severity: "review", ok: !elsewhere,
      message: elsewhere ? `Already enrolled at ${w.byId[elsewhere.institutionId]?.name} (${elsewhere.programme}, admitted ${fmtDate(elsewhere.admittedOn)})`
        : "Not enrolled in any other institution",
    });
  }

  const adm = parseDate(row.admissionDate);
  if (row.admissionDate.trim()) {
    const ok = !!adm && adm <= ADMISSION_CUTOFF;
    add({
      rule: "late_admission", severity: adm ? "review" : "fix", ok, field: "admissionDate",
      message: !adm ? `“${row.admissionDate}” is not a real date` : ok ? `Admitted ${fmtDate(adm)}` : `Admitted ${fmtDate(adm)}, after the cut-off of ${fmtDate(ADMISSION_CUTOFF)}`,
    });
  } else {
    const dates = ctx.allRows.map((r) => parseDate(r.admissionDate)).filter((d): d is string => !!d).sort();
    if (dates.length) suggestions.push({ field: "admissionDate", value: dates[Math.floor(dates.length / 2)], reason: "Typical admission date in this file; replace with the actual date" });
  }

  const failed = checks.filter((c) => !c.ok);
  const status = failed.some((c) => c.severity === "fix") ? "fix" : failed.length ? "review" : "accepted";
  return {
    row: { ...row, apaarId: apaar.length === 12 ? apaar : row.apaarId },
    status, checks, failed, matchScore, matchNote, registryName,
    suggestions: suggestions.filter((s) => failed.some((f) => f.field === s.field || (f.rule === "required" && s.field === f.field))),
    other,
  };
}

export function buildLedger(results: RowResult[], programme: Programme): Ledger {
  const counts: Record<Quota, number> = { Regular: 0, TFW: 0, PMSSS: 0, "FN/OCI/PIO": 0 };
  for (const r of results) {
    const q = normaliseQuota(r.row.quota);
    if (q) counts[q]++;
  }
  const lines = QUOTAS.map((q) => ({ quota: q, admitted: counts[q], limit: q === "Regular" ? programme.approved : programme.limits[q] }));
  const supernumeraryExcess = lines.filter((l) => l.quota !== "Regular").reduce((s, l) => s + Math.max(0, l.admitted - l.limit), 0);
  return { approved: programme.approved, lines, regular: counts.Regular, excess: Math.max(0, counts.Regular - programme.approved), supernumeraryExcess };
}

export function validateFile(rows: UploadRow[], institutionId: string, programme: Programme) {
  const results = rows.map((r) => validateRow(r, { institutionId, allRows: rows }));
  return { results, ledger: buildLedger(results, programme) };
}

export function primaryIssue(r: RowResult) {
  const f = r.failed.find((c) => c.severity === r.status) ?? r.failed[0];
  return f;
}

export const describeApaar = (id: string) => fmtApaar(id);
