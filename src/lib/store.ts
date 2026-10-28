"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { sha512Hex, signCredential, type CredentialPayload } from "./crypto";
import { maskApaar, uid } from "./format";
import { buildLedger, validateRow, validateFile } from "./validate";
import { ACADEMIC_YEAR, getWorld, OFFICER, PRINCIPAL, programmeOf } from "./world";
import type {
  AuditEntry, Case, CaseRule, ConsentRequest, Correction, Decision, Notice, RegisterRecord, RowResult, ShareField,
  Submission, UploadRow, Verification,
} from "./types";

export const ROLE = { institution: "Institution", aicte: "AICTE officer", student: "Student", verifier: "Verifier", system: "System" };

const GENESIS = "0".repeat(64);

function makeEntry(prev: AuditEntry | undefined, actor: string, role: string, action: string, target: string, ts?: string): AuditEntry {
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? GENESIS;
  const t = ts ?? new Date().toISOString();
  const hash = sha512Hex(prevHash + JSON.stringify({ seq, ts: t, actor, role, action, target })).slice(0, 64);
  return { seq, ts: t, actor, role, action, target, prevHash, hash };
}

export function entryHash(e: Omit<AuditEntry, "hash">) {
  return sha512Hex(e.prevHash + JSON.stringify({ seq: e.seq, ts: e.ts, actor: e.actor, role: e.role, action: e.action, target: e.target })).slice(0, 64);
}

function genesisAudit(): AuditEntry[] {
  const a: AuditEntry[] = [];
  const push = (actor: string, role: string, action: string, target: string, ts: string) => a.push(makeEntry(a[a.length - 1], actor, role, action, target, ts));
  push("APAAR-Setu", ROLE.system, "Loaded AICTE approved-intake data for 2026-27", "40 institutions", "2026-07-01T09:00:00.000Z");
  push("APAAR-Setu", ROLE.system, "Connected to APAAR registry", "registry", "2026-07-01T09:02:00.000Z");
  push("APAAR-Setu", ROLE.system, "Imported earlier submissions and open flags", "39 institutions", "2026-10-25T18:30:00.000Z");
  return a;
}

const CASE_RULE: Record<string, CaseRule> = {
  national_duplicate: "national_duplicate",
  not_found: "not_found",
  name_match: "name_match",
  late_admission: "late_admission",
};

const caseCopy = (rule: CaseRule, n: number) => {
  const s = n > 1 ? "s" : "";
  switch (rule) {
    case "national_duplicate":
      return { title: `${n} student${s} enrolled in another college`, summary: "The same APAAR ID is active in another AICTE-approved institution for this year." };
    case "not_found":
      return { title: `${n} APAAR ID${s} not found in registry`, summary: "The IDs pass the format check but no APAAR record exists. These may be students who do not exist." };
    case "name_match":
      return { title: `${n} name${s} do not match APAAR`, summary: "The uploaded name differs from the APAAR record by more than a spelling variation." };
    case "late_admission":
      return { title: `${n} admission${s} after the cut-off date`, summary: "Admitted after the last date for admissions in the AICTE academic calendar." };
    default:
      return { title: "", summary: "" };
  }
};

function rowDetail(r: RowResult) {
  const f = r.failed.find((c) => c.severity === "review");
  return f?.message ?? "";
}

function toRecord(r: RowResult, institutionId: string, programmeCode: string, source: RegisterRecord["source"]): RegisterRecord {
  return {
    apaarId: r.row.apaarId, name: r.registryName ?? r.row.name, dob: r.row.dob, gender: r.row.gender, category: r.row.category,
    institutionId, programmeCode, quota: r.row.quota || "Regular", admissionDate: r.row.admissionDate,
    addedAt: new Date().toISOString(), version: 1, source,
  };
}

export interface SubmitInput {
  institutionId: string;
  programmeCode: string;
  fileName: string;
  rows: UploadRow[];
}

interface Data {
  submissions: Submission[];
  register: Record<string, RegisterRecord>;
  liveCases: Case[];
  decisions: Record<string, Decision>;
  consents: ConsentRequest[];
  corrections: Correction[];
  notices: Notice[];
  audit: AuditEntry[];
  verifications: Verification[];
  studentSession: string | null;
}

interface Actions {
  log: (actor: string, role: string, action: string, target: string) => void;
  submit: (input: SubmitInput) => Submission;
  applyFixes: (submissionId: string, edits: Record<number, Partial<UploadRow>>) => { accepted: number; fix: number; review: number };
  decideCase: (caseId: string, d: { outcome: "cleared" | "violation"; action?: string; remarks: string }) => void;
  requestConsent: (input: Pick<ConsentRequest, "verifierOrg" | "verifierType" | "apaarId" | "purpose" | "fields">) => ConsentRequest;
  approveConsent: (id: string, fields: ShareField[], days: number) => void;
  declineConsent: (id: string) => void;
  revokeConsent: (id: string) => void;
  requestCorrection: (input: Pick<Correction, "apaarId" | "field" | "proposed" | "reason">) => void;
  decideCorrection: (id: string, approve: boolean) => void;
  acknowledgeNotice: (id: string) => void;
  recordVerification: (v: Omit<Verification, "id" | "ts">) => void;
  studentLogin: (apaarId: string) => void;
  studentLogout: () => void;
  reset: () => void;
}

const initial = (): Data => ({
  submissions: [],
  register: {},
  liveCases: [],
  decisions: { ...getWorld().seedDecisions },
  consents: [],
  corrections: [],
  notices: [],
  audit: genesisAudit(),
  verifications: [],
  studentSession: null,
});

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => {
      const append = (audit: AuditEntry[], actor: string, role: string, action: string, target: string) => {
        const next = [...audit];
        next.push(makeEntry(next[next.length - 1], actor, role, action, target));
        return next;
      };

      return {
        ...initial(),

        log: (actor, role, action, target) => set((s) => ({ audit: append(s.audit, actor, role, action, target) })),

        submit: ({ institutionId, programmeCode, fileName, rows }) => {
          const w = getWorld();
          const inst = w.byId[institutionId];
          const prog = programmeOf(institutionId, programmeCode)!;
          const t0 = performance.now();
          const { results, ledger } = validateFile(rows, institutionId, prog);
          const durationMs = Math.round(performance.now() - t0);
          const sub: Submission = {
            id: uid("SUB"), institutionId, programmeCode, fileName, uploadedAt: new Date().toISOString(), signedBy: PRINCIPAL,
            results, ledger, round: 1, durationMs,
          };
          const s = get();
          const decisions = { ...s.decisions };
          for (const c of s.liveCases) {
            if (c.institutionId === institutionId && c.programmeCode === programmeCode && !decisions[c.id]) {
              decisions[c.id] = { outcome: "superseded", remarks: "Replaced by a newer submission", officer: "System", ts: sub.uploadedAt };
            }
          }
          const register = { ...s.register };
          const accepted = results.filter((r) => r.status === "accepted");
          accepted.forEach((r) => (register[r.row.apaarId] = toRecord(r, institutionId, programmeCode, "upload")));

          const newCases: Case[] = [];
          let next = 2001 + s.liveCases.length;
          if (ledger.excess > 0) {
            const regular = results
              .filter((r) => (r.row.quota || "Regular") === "Regular")
              .sort((a, b) => (b.row.admissionDate || "").localeCompare(a.row.admissionDate || ""))
              .slice(0, ledger.excess);
            newCases.push({
              id: `C-${next++}`, institutionId, programmeCode, rule: "over_intake",
              title: `${ledger.excess} admissions above approved intake`,
              summary: `${prog.name}: ${ledger.regular} regular admissions against ${ledger.approved} approved seats. Supernumerary seats (TFW, PMSSS, FN/OCI/PIO) are counted separately and are not part of this excess.`,
              rows: regular.map((r) => ({ apaarId: r.row.apaarId, name: r.row.name, detail: `Admitted ${r.row.admissionDate || "date missing"}`, result: r })),
              excess: ledger.excess, createdAt: sub.uploadedAt, source: "live", submissionId: sub.id,
            });
          }
          const groups = new Map<CaseRule, RowResult[]>();
          for (const r of results.filter((x) => x.status === "review")) {
            const f = r.failed.find((c) => c.severity === "review");
            const rule = f ? CASE_RULE[f.rule] : undefined;
            if (!rule) continue;
            groups.set(rule, [...(groups.get(rule) ?? []), r]);
          }
          for (const [rule, list] of groups) {
            newCases.push({
              id: `C-${next++}`, institutionId, programmeCode, rule, ...caseCopy(rule, list.length),
              rows: list.map((r) => ({ apaarId: r.row.apaarId, name: r.row.name, detail: rowDetail(r), result: r })),
              createdAt: sub.uploadedAt, source: "live", submissionId: sub.id,
            });
          }

          const counts = { a: accepted.length, f: results.filter((r) => r.status === "fix").length, r: results.filter((r) => r.status === "review").length };
          let audit = append(s.audit, PRINCIPAL, ROLE.institution, `Uploaded and e-signed ${results.length} student records`, `${inst.name} · ${prog.name}`);
          audit = append(audit, "APAAR-Setu", ROLE.system, `Validated ${results.length} records: ${counts.a} accepted, ${counts.f} to fix, ${counts.r} for review`, sub.id);
          audit = append(audit, "APAAR-Setu", ROLE.system, `Added ${counts.a} signed records to the national register`, inst.name);
          for (const c of newCases) audit = append(audit, "APAAR-Setu", ROLE.system, `Opened case ${c.id}: ${c.title}`, inst.name);

          set({ submissions: [sub, ...s.submissions], register, liveCases: [...s.liveCases, ...newCases], decisions, audit });
          return sub;
        },

        applyFixes: (submissionId, edits) => {
          const s = get();
          const sub = s.submissions.find((x) => x.id === submissionId);
          if (!sub) return { accepted: 0, fix: 0, review: 0 };
          const prog = programmeOf(sub.institutionId, sub.programmeCode)!;
          const rows = sub.results.map((r) => (edits[r.row.rowNo] ? { ...r.row, ...edits[r.row.rowNo] } : r.row));
          const changed = new Set(Object.keys(edits).map(Number));
          const results = sub.results.map((r, i) => (changed.has(r.row.rowNo) ? validateRow(rows[i], { institutionId: sub.institutionId, allRows: rows }) : r));
          const rechecked = results.filter((r) => changed.has(r.row.rowNo));
          const counts = {
            accepted: rechecked.filter((r) => r.status === "accepted").length,
            fix: rechecked.filter((r) => r.status === "fix").length,
            review: rechecked.filter((r) => r.status === "review").length,
          };
          const register = { ...s.register };
          rechecked.filter((r) => r.status === "accepted").forEach((r) => (register[r.row.apaarId] = toRecord(r, sub.institutionId, sub.programmeCode, "upload")));

          let liveCases = [...s.liveCases];
          let next = 2001 + liveCases.length;
          const opened: string[] = [];
          for (const r of rechecked.filter((x) => x.status === "review")) {
            const f = r.failed.find((c) => c.severity === "review");
            const rule = f ? CASE_RULE[f.rule] : undefined;
            if (!rule) continue;
            const row = { apaarId: r.row.apaarId, name: r.row.name, detail: rowDetail(r), result: r };
            const open = liveCases.find((c) => c.submissionId === sub.id && c.rule === rule && !s.decisions[c.id]);
            if (open) {
              liveCases = liveCases.map((c) => (c === open ? { ...c, rows: [...c.rows, row], ...caseCopy(rule, c.rows.length + 1) } : c));
            } else {
              const id = `C-${next++}`;
              opened.push(id);
              liveCases.push({ id, institutionId: sub.institutionId, programmeCode: sub.programmeCode, rule, ...caseCopy(rule, 1), rows: [row], createdAt: new Date().toISOString(), source: "live", submissionId: sub.id });
            }
          }
          const updated: Submission = { ...sub, results, ledger: buildLedger(results, prog), round: sub.round + 1 };
          let audit = append(s.audit, PRINCIPAL, ROLE.institution, `Corrected and resubmitted ${changed.size} rows`, sub.id);
          audit = append(audit, "APAAR-Setu", ROLE.system, `Re-checked ${changed.size} rows: ${counts.accepted} accepted, ${counts.fix} still to fix, ${counts.review} for review`, sub.id);
          opened.forEach((id) => (audit = append(audit, "APAAR-Setu", ROLE.system, `Opened case ${id}`, sub.id)));
          set({ submissions: s.submissions.map((x) => (x.id === sub.id ? updated : x)), register, liveCases, audit });
          return counts;
        },

        decideCase: (caseId, d) => {
          const s = get();
          const w = getWorld();
          const c = s.liveCases.find((x) => x.id === caseId) ?? w.seedCases.find((x) => x.id === caseId);
          if (!c) return;
          const ts = new Date().toISOString();
          const decisions = { ...s.decisions, [caseId]: { ...d, officer: OFFICER, ts } };
          const register = { ...s.register };
          let notices = s.notices;
          let audit = append(s.audit, OFFICER, ROLE.aicte,
            d.outcome === "cleared" ? `Cleared case ${caseId}: no violation` : `Confirmed violation in case ${caseId}: ${d.action}`,
            w.byId[c.institutionId]?.name ?? c.institutionId);
          if (c.source === "live" && d.outcome === "cleared" && c.rule !== "over_intake") {
            c.rows.forEach((r) => r.result && (register[r.apaarId] = toRecord(r.result, c.institutionId, c.programmeCode, "officer")));
            audit = append(audit, "APAAR-Setu", ROLE.system, `Added ${c.rows.length} records to the national register after officer review`, caseId);
          }
          if (d.outcome === "violation") {
            notices = [{ id: uid("NTC"), institutionId: c.institutionId, caseId, title: c.title, action: d.action ?? "", remarks: d.remarks, ts, acknowledged: false }, ...notices];
          }
          set({ decisions, register, notices, audit });
        },

        requestConsent: (input) => {
          const req: ConsentRequest = { ...input, id: uid("REQ"), status: "pending", createdAt: new Date().toISOString() };
          set((s) => ({
            consents: [req, ...s.consents],
            audit: append(s.audit, input.verifierOrg, ROLE.verifier, `Requested record of student ${maskApaar(input.apaarId)} for ${input.purpose.toLowerCase()}`, req.id),
          }));
          return req;
        },

        approveConsent: (id, fields, days) => {
          const s = get();
          const req = s.consents.find((c) => c.id === id);
          const rec = req && s.register[req.apaarId];
          if (!req || !rec) return;
          const w = getWorld();
          const inst = w.byId[rec.institutionId];
          const prog = programmeOf(rec.institutionId, rec.programmeCode);
          const all: Record<ShareField, string> = {
            name: rec.name, dob: rec.dob, institution: `${inst.name}, ${inst.city}`, programme: prog?.name ?? rec.programmeCode,
            admissionYear: ACADEMIC_YEAR, status: "Enrolled, verified by AICTE",
          };
          const claims: Record<string, string> = {};
          fields.forEach((f) => (claims[f] = all[f]));
          const now = new Date();
          const exp = new Date(now.getTime() + days * 86400000);
          const payload: CredentialPayload = {
            v: 1, typ: "APAAR-Setu.StudentRecord", cid: id, sub: maskApaar(rec.apaarId), aud: req.verifierOrg, purpose: req.purpose,
            iss: "AICTE · APAAR-Setu", iat: now.toISOString(), exp: exp.toISOString(), rv: rec.version, claims,
          };
          const token = signCredential(payload);
          set({
            consents: s.consents.map((c) => (c.id === id ? { ...c, status: "approved", decidedAt: now.toISOString(), expiresAt: exp.toISOString(), token, sharedFields: fields } : c)),
            audit: append(s.audit, rec.name, ROLE.student, `Approved sharing with ${req.verifierOrg} by OTP (${fields.length} fields, ${days} days)`, id),
          });
        },

        declineConsent: (id) =>
          set((s) => ({
            consents: s.consents.map((c) => (c.id === id ? { ...c, status: "declined", decidedAt: new Date().toISOString() } : c)),
            audit: append(s.audit, s.register[s.consents.find((c) => c.id === id)?.apaarId ?? ""]?.name ?? "Student", ROLE.student, "Declined a sharing request", id),
          })),

        revokeConsent: (id) =>
          set((s) => ({
            consents: s.consents.map((c) => (c.id === id ? { ...c, status: "revoked", decidedAt: new Date().toISOString() } : c)),
            audit: append(s.audit, s.register[s.consents.find((c) => c.id === id)?.apaarId ?? ""]?.name ?? "Student", ROLE.student, "Revoked consent; the shared QR stops working", id),
          })),

        requestCorrection: ({ apaarId, field, proposed, reason }) => {
          const s = get();
          const rec = s.register[apaarId];
          if (!rec) return;
          const c: Correction = { id: uid("COR"), apaarId, field, current: String(rec[field] ?? ""), proposed, reason, status: "pending", createdAt: new Date().toISOString() };
          set({ corrections: [c, ...s.corrections], audit: append(s.audit, rec.name, ROLE.student, `Requested correction of ${field}`, c.id) });
        },

        decideCorrection: (id, approve) => {
          const s = get();
          const c = s.corrections.find((x) => x.id === id);
          if (!c) return;
          const register = { ...s.register };
          const rec = register[c.apaarId];
          if (approve && rec) register[c.apaarId] = { ...rec, [c.field]: c.proposed, version: rec.version + 1, source: "correction" };
          set({
            corrections: s.corrections.map((x) => (x.id === id ? { ...x, status: approve ? "approved" : "rejected", decidedAt: new Date().toISOString() } : x)),
            register,
            audit: append(s.audit, PRINCIPAL, ROLE.institution, `${approve ? "Approved" : "Rejected"} correction of ${c.field} for ${maskApaar(c.apaarId)}${approve ? "; record re-signed" : ""}`, id),
          });
        },

        acknowledgeNotice: (id) =>
          set((s) => ({
            notices: s.notices.map((n) => (n.id === id ? { ...n, acknowledged: true } : n)),
            audit: append(s.audit, PRINCIPAL, ROLE.institution, "Acknowledged AICTE notice", id),
          })),

        recordVerification: (v) =>
          set((s) => ({
            verifications: [{ ...v, id: uid("VER"), ts: new Date().toISOString() }, ...s.verifications],
            audit: append(s.audit, s.consents.find((c) => c.id === v.consentId)?.verifierOrg ?? "Verifier", ROLE.verifier, `Scanned QR: ${v.summary}`, v.consentId ?? "unknown"),
          })),

        studentLogin: (apaarId) =>
          set((s) => ({ studentSession: apaarId, audit: append(s.audit, s.register[apaarId]?.name ?? maskApaar(apaarId), ROLE.student, "Signed in with APAAR ID and OTP", maskApaar(apaarId)) })),

        studentLogout: () => set({ studentSession: null }),

        reset: () => set(initial()),
      };
    },
    {
      name: "apaar-setu-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        submissions: s.submissions, register: s.register, liveCases: s.liveCases, decisions: s.decisions, consents: s.consents,
        corrections: s.corrections, notices: s.notices, audit: s.audit, verifications: s.verifications, studentSession: s.studentSession,
      }),
    },
  ),
);

export function allCases(liveCases: Case[]) {
  return [...liveCases, ...getWorld().seedCases];
}

export function caseStatus(c: Case, decisions: Record<string, Decision>) {
  const d = decisions[c.id];
  return d ? d.outcome : "open";
}
