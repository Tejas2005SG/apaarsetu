"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle2, Download, FileSpreadsheet, Loader2, PenLine, UploadCloud, XCircle } from "lucide-react";
import { Badge, Button, Card, CardHeader, cn, Field, PageHeader, Select } from "@/components/ui";
import { OtpDialog } from "@/components/otp";
import { download, parseFile, rowsToCsv, TEMPLATE_HEADERS, toCsv, type ParseResult } from "@/lib/csv";
import { useStore } from "@/lib/store";
import { ABC_ID, ABC_PROGRAMME, ACADEMIC_YEAR, getWorld, PRINCIPAL } from "@/lib/world";
import { normaliseQuota } from "@/lib/validate";
import { featuresFromSubmission, riskTable } from "@/lib/risk";
import { fmtApaar } from "@/lib/format";
import type { Submission } from "@/lib/types";
import { toast } from "@/lib/toast";

const STEPS = ["Choose file", "Check file", "E-sign", "Validate"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cn("num flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-semibold",
            i < step ? "border-brand-700 bg-brand-700 text-white" : i === step ? "border-brand-700 text-brand-700" : "border-slate-300 text-slate-400")}>
            {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
          </span>
          <span className={cn("text-[13.5px]", i === step ? "font-medium text-ink" : "text-muted")}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-2 h-px w-10 bg-slate-300" />}
        </li>
      ))}
    </ol>
  );
}

function SubmitInner() {
  const params = useSearchParams();
  const router = useRouter();
  const inst = getWorld().byId[ABC_ID];
  const submit = useStore((s) => s.submit);
  const [programme, setProgramme] = useState(params.get("programme") ?? ABC_PROGRAMME);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{ name: string; parsed: ParseResult } | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [otp, setOtp] = useState(false);
  const [sub, setSub] = useState<Submission | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prog = inst.programmes.find((p) => p.code === programme)!;

  const load = async (f: File) => {
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      toast({ tone: "error", title: "Unsupported file", body: "Upload the student list as .xlsx or .csv." });
      return;
    }
    setBusy(true);
    try {
      const parsed = await parseFile(f);
      if (!parsed.rows.length) throw new Error("empty");
      setFile({ name: f.name, parsed });
      setStep(1);
    } catch {
      toast({ tone: "error", title: "Could not read the file", body: "Check that it is a valid spreadsheet with a header row." });
    } finally {
      setBusy(false);
    }
  };

  const useSample = () => {
    const rows = getWorld().sampleRows.map((r) => ({ ...r }));
    setProgramme(ABC_PROGRAMME);
    setFile({ name: "ABC_BTech-CSE_admissions_2026-27.xlsx", parsed: { rows, missingColumns: [], columns: TEMPLATE_HEADERS } });
    setStep(1);
  };

  const quotaCounts = useMemo(() => {
    const m: Record<string, number> = {};
    file?.parsed.rows.forEach((r) => {
      const q = normaliseQuota(r.quota) ?? `Unknown (${r.quota})`;
      m[q] = (m[q] ?? 0) + 1;
    });
    return m;
  }, [file]);

  const run = () => {
    if (!file) return;
    setStep(3);
    const s = submit({ institutionId: ABC_ID, programmeCode: programme, fileName: file.name, rows: file.parsed.rows });
    setSub(s);
  };

  return (
    <>
      <PageHeader
        title="New submission"
        subtitle={`Upload the list of students admitted for ${ACADEMIC_YEAR}. Each row is checked against the APAAR registry, your approved intake and the national enrolment index.`}
      />
      <Stepper step={step} />

      {step === 0 && (
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader title="Programme and file" />
            <div className="space-y-5 p-5">
              <Field label="Programme" className="max-w-md">
                <Select value={programme} onChange={(e) => setProgramme(e.target.value)}>
                  {inst.programmes.map((p) => <option key={p.code} value={p.code}>{p.name} · approved intake {p.approved}</option>)}
                </Select>
              </Field>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) load(f); }}
                onClick={() => inputRef.current?.click()}
                className={cn("flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                  drag ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-200 hover:bg-slate-50")}
              >
                {busy ? <Loader2 size={28} className="animate-spin text-brand-700" /> : <UploadCloud size={28} className="text-slate-400" />}
                <div className="mt-3 text-[14px] font-medium text-ink">Drop the student list here, or click to choose</div>
                <div className="mt-1 text-[12.5px] text-muted">Excel (.xlsx) or CSV, using the AICTE template. Up to 10,000 rows.</div>
                <input ref={inputRef} type="file" accept=".csv,.xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
              </div>
              <div className="border-t border-line pt-4">
                <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Recent files</div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <FileSpreadsheet size={20} className="text-emerald-700" />
                    <span>
                      <span className="block text-[13.5px] font-medium text-ink">ABC_BTech-CSE_admissions_2026-27.xlsx</span>
                      <span className="block text-[12px] text-muted">Exported from college ERP · 138 rows · 26 Oct 2026</span>
                    </span>
                  </span>
                  <Button size="sm" onClick={useSample}>Use this file</Button>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Template" subtitle="Columns the file must contain" />
            <div className="p-5">
              <ul className="space-y-1.5 text-[13px]">
                {[["APAAR ID", "12 digits, as issued"], ["Student Name", "As on the APAAR record"], ["Date of Birth", "DD-MM-YYYY or YYYY-MM-DD"], ["Gender", "M, F or O"], ["Category", "GEN, OBC, SC, ST, EWS"], ["Quota", "Regular, TFW, PMSSS, FN/OCI/PIO"], ["Admission Date", "Date of admission"]].map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3 border-b border-dashed border-line pb-1.5">
                    <span className="font-medium text-ink">{k}</span><span className="text-muted">{v}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => download("APAAR-Setu_template.csv", toCsv([TEMPLATE_HEADERS]))}><Download size={14} /> Blank template</Button>
                <Button variant="secondary" size="sm" onClick={() => download("ABC_BTech-CSE_admissions_2026-27.csv", rowsToCsv(getWorld().sampleRows))}><Download size={14} /> Filled example (.csv)</Button>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">Fill the template in Excel or export it from your ERP. Dates can be DD-MM-YYYY or YYYY-MM-DD.</p>
            </div>
          </Card>
        </div>
      )}

      {step === 1 && file && (
        <Card>
          <CardHeader
            title={file.name}
            subtitle={`${file.parsed.rows.length} rows · ${prog.name}`}
            action={file.parsed.missingColumns.length ? <Badge tone="red"><XCircle size={12} /> Columns missing</Badge> : <Badge tone="green"><CheckCircle2 size={12} /> Template recognised</Badge>}
          />
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-4 text-[13.5px]">
              {file.parsed.missingColumns.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
                  Required columns not found: <b>{file.parsed.missingColumns.join(", ")}</b>. Fix the header row and upload again.
                </div>
              )}
              <div>
                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-muted">Rows by quota</div>
                {Object.entries(quotaCounts).map(([q, n]) => (
                  <div key={q} className="flex justify-between border-b border-dashed border-line py-1.5">
                    <span>{q}</span><span className="num font-medium">{n}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-slate-50 p-3 text-[12.5px] text-muted">
                Approved intake for this programme is <b className="text-ink">{prog.approved}</b>, with up to {prog.limits.TFW} TFW, {prog.limits.PMSSS} PMSSS and {prog.limits["FN/OCI/PIO"]} FN/OCI/PIO supernumerary seats.
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-line">
              <div className="border-b border-line bg-slate-50 px-3 py-2 text-[12px] font-medium text-muted">Preview · first 8 rows</div>
              <div className="overflow-x-auto">
                <table className="table-base text-[12.5px]">
                  <thead><tr><th>#</th><th>APAAR ID</th><th>Name</th><th>DOB</th><th>Gender</th><th>Quota</th><th>Admitted</th></tr></thead>
                  <tbody>
                    {file.parsed.rows.slice(0, 8).map((r) => (
                      <tr key={r.rowNo}>
                        <td className="num text-muted">{r.rowNo}</td>
                        <td className="num font-mono">{fmtApaar(r.apaarId)}</td>
                        <td>{r.name}</td><td className="num">{r.dob}</td><td>{r.gender || <span className="text-red-700">—</span>}</td><td>{r.quota}</td><td className="num">{r.admissionDate || <span className="text-red-700">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex justify-between border-t border-line px-5 py-3">
            <Button variant="secondary" onClick={() => { setFile(null); setStep(0); }}>Choose another file</Button>
            <Button disabled={file.parsed.missingColumns.length > 0} onClick={() => setStep(2)}>Continue to e-sign</Button>
          </div>
        </Card>
      )}

      {step === 2 && file && (
        <Card className="max-w-2xl">
          <CardHeader title="Declaration by the Head of Institution" subtitle="The submission is e-signed so the institution stands behind the data" />
          <div className="space-y-4 p-5 text-[13.5px]">
            <div className="grid grid-cols-2 gap-4 rounded-md bg-slate-50 p-4">
              <div><div className="text-[12px] text-muted">Institution</div><div className="font-medium">{inst.name}, {inst.city}</div></div>
              <div><div className="text-[12px] text-muted">Programme</div><div className="font-medium">{prog.name}</div></div>
              <div><div className="text-[12px] text-muted">File</div><div className="font-medium">{file.name}</div></div>
              <div><div className="text-[12px] text-muted">Rows</div><div className="num font-medium">{file.parsed.rows.length}</div></div>
            </div>
            <label className="flex cursor-pointer gap-3">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1f3864]" />
              <span className="leading-relaxed text-slate-700">
                I certify that the students listed were admitted to this programme for {ACADEMIC_YEAR} in accordance with the AICTE Approval
                Process Handbook, and that the details are true to the best of my knowledge.
              </span>
            </label>
            <div className="text-[12.5px] text-muted">Signing as <b className="text-ink">{PRINCIPAL}</b> · OTP to the registered mobile number</div>
          </div>
          <div className="flex justify-between border-t border-line px-5 py-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!declared} onClick={() => setOtp(true)}><PenLine size={15} /> E-sign and submit</Button>
          </div>
          <OtpDialog
            open={otp}
            onClose={() => setOtp(false)}
            to="+91 98XXX XX214"
            title="E-sign the submission"
            description="Enter the OTP to sign this submission on behalf of the institution."
            confirmLabel="Sign and submit"
            onVerified={() => { setOtp(false); run(); }}
          />
        </Card>
      )}

      {step === 3 && sub && <Processing sub={sub} onOpen={() => router.push(`/institution/report?id=${sub.id}`)} />}
    </>
  );
}

function Processing({ sub, onOpen }: { sub: Submission; onOpen: () => void }) {
  const [shown, setShown] = useState(0);
  const r = sub.results;
  const has = (rule: string) => r.filter((x) => x.failed.some((f) => f.rule === rule)).length;
  const variants = r.filter((x) => x.matchNote).length;
  const tfw = sub.ledger.lines.find((l) => l.quota === "TFW")!;
  const score = riskTable(featuresFromSubmission(sub)).rows.find((x) => x.institutionId === ABC_ID)?.score ?? 0;
  const counts = { a: r.filter((x) => x.status === "accepted").length, f: r.filter((x) => x.status === "fix").length, v: r.filter((x) => x.status === "review").length };
  const stages: [string, string][] = [
    ["File and format checks", `${r.length} rows read · ${has("required") + has("apaar_format") + has("dob_format")} with missing or invalid values`],
    ["APAAR registry lookup", `${r.length - has("apaar_format")} IDs looked up · ${has("not_found")} not found`],
    ["Name and date-of-birth matching", `${variants} spelling variants matched · ${has("name_match")} names and ${has("dob_match")} birth dates differ`],
    ["Seat ledger", `${sub.ledger.regular} regular admissions against ${sub.ledger.approved} approved · TFW ${tfw.admitted} of ${tfw.limit}`],
    ["National enrolment index", `${has("national_duplicate")} students already enrolled in another college`],
    ["Risk scoring", `Institution risk score ${score.toFixed(2)} (anomaly model, advisory only)`],
    ["Signing accepted records", `${counts.a} records signed and added to the national register`],
  ];

  useEffect(() => {
    if (shown >= stages.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 480);
    return () => clearTimeout(t);
  }, [shown, stages.length]);

  const done = shown >= stages.length;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader title="Validating submission" subtitle={`${sub.fileName} · ${sub.id}`} />
        <ol className="p-3">
          {stages.map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-md px-3 py-2.5">
              <span className="mt-0.5">
                {i < shown ? <CheckCircle2 size={18} className="text-emerald-600" /> : i === shown ? <Loader2 size={18} className="animate-spin text-brand-700" /> : <span className="block h-[18px] w-[18px] rounded-full border border-slate-300" />}
              </span>
              <span>
                <span className={cn("block text-[13.5px] font-medium", i <= shown ? "text-ink" : "text-slate-400")}>{t}</span>
                {i < shown && <span className="fade-in block text-[12.5px] text-muted">{d}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card className={cn("transition-opacity", done ? "opacity-100" : "opacity-40")}>
        <CardHeader title="Result" subtitle={done ? `All ${r.length} rows checked in ${Math.max(sub.durationMs, 1)} ms` : "Working…"} />
        <div className="space-y-3 p-5">
          {[["Accepted into register", counts.a, "text-emerald-700"], ["Returned to you to fix", counts.f, "text-amber-700"], ["Sent to AICTE for review", counts.v, "text-red-700"]].map(([l, n, c]) => (
            <div key={l as string} className="flex items-baseline justify-between border-b border-dashed border-line pb-2">
              <span className="text-[13.5px]">{l}</span>
              <span className={cn("num text-2xl font-semibold", c as string)}>{done ? n : "–"}</span>
            </div>
          ))}
          {sub.ledger.excess > 0 && done && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
              {sub.ledger.regular} regular admissions against {sub.ledger.approved} approved seats: <b>{sub.ledger.excess} over intake</b>. This has been referred to AICTE.
            </div>
          )}
          <Button className="mt-2 w-full" disabled={!done} onClick={onOpen}>Open validation report</Button>
        </div>
      </Card>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitInner />
    </Suspense>
  );
}
