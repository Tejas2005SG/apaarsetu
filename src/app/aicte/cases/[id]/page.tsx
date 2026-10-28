"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Gavel } from "lucide-react";
import { Badge, Button, Card, CardHeader, Empty, Field, KeyValue, LinkButton, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { OutcomeBadge } from "@/components/outcome";
import { RiskExplain } from "@/components/risk";
import { SeatLedger } from "@/components/seat-ledger";
import { allCases, caseStatus, ROLE, useStore } from "@/lib/store";
import { ADMISSION_CUTOFF, getWorld, OFFICER, programmeOf } from "@/lib/world";
import { fmtApaar, fmtDate, fmtDateTime, maskApaar } from "@/lib/format";
import { RULE_NAME, VIOLATION_ACTIONS } from "@/lib/rules";
import { toast } from "@/lib/toast";
import type { Case } from "@/lib/types";

function Evidence({ c, reveal }: { c: Case; reveal: boolean }) {
  const w = getWorld();
  const id = (a: string) => (reveal ? fmtApaar(a) : maskApaar(a));
  const prog = programmeOf(c.institutionId, c.programmeCode);
  const s = useStore();
  const sub = c.submissionId ? s.submissions.find((x) => x.id === c.submissionId) : undefined;

  if (c.rule === "over_intake") {
    return (
      <div className="space-y-5">
        {sub ? <SeatLedger ledger={sub.ledger} /> : (
          <KeyValue cols={3} items={[["Approved intake", prog?.approved ?? "—"], ["Regular admissions", (prog?.approved ?? 0) + (c.excess ?? 0)], ["Excess", <span key="x" className="text-red-700">{c.excess}</span>]]} />
        )}
        {c.rows.length > 0 && (
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink">Latest {c.rows.length} regular admissions (made after the approved seats were filled)</div>
            <div className="max-h-72 overflow-y-auto rounded-md border border-line">
              <table className="table-base text-[13px]">
                <thead className="sticky top-0"><tr><th>Student</th><th>APAAR ID</th><th>Admitted on</th></tr></thead>
                <tbody>{c.rows.map((r) => <tr key={r.apaarId}><td>{r.name}</td><td className="num font-mono">{id(r.apaarId)}</td><td className="num">{fmtDate(r.result?.row.admissionDate)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="table-base text-[13px]">
        <thead>
          <tr>
            <th>Student (as uploaded)</th>
            <th>APAAR ID</th>
            {c.rule === "national_duplicate" && <><th>Also enrolled at</th><th>Admitted there</th><th>Admitted here</th></>}
            {c.rule === "name_match" && <><th>Name on APAAR</th><th className="text-right">Match score</th></>}
            {c.rule === "not_found" && <><th>Date of birth</th><th>Registry result</th></>}
            {c.rule === "late_admission" && <><th>Admitted on</th><th>Cut-off</th></>}
            {!c.rows[0]?.result && <th>Finding</th>}
          </tr>
        </thead>
        <tbody>
          {c.rows.map((r) => {
            const res = r.result;
            return (
              <tr key={r.apaarId}>
                <td className="font-medium">{r.name}</td>
                <td className="num font-mono">{id(r.apaarId)}</td>
                {res && c.rule === "national_duplicate" && (
                  <>
                    <td>{res.other ? <><div>{w.byId[res.other.institutionId]?.name}</div><div className="text-[12px] text-muted">{res.other.programme}</div></> : "—"}</td>
                    <td className="num">{fmtDate(res.other?.admittedOn)}</td>
                    <td className="num">{fmtDate(res.row.admissionDate)}</td>
                  </>
                )}
                {res && c.rule === "name_match" && (
                  <>
                    <td>{res.registryName}</td>
                    <td className="num text-right font-medium text-red-700">{res.matchScore?.toFixed(2)}</td>
                  </>
                )}
                {res && c.rule === "not_found" && (
                  <>
                    <td className="num">{fmtDate(res.row.dob)}</td>
                    <td className="text-red-700">Check digit valid · no APAAR record</td>
                  </>
                )}
                {res && c.rule === "late_admission" && (
                  <>
                    <td className="num font-medium text-red-700">{fmtDate(res.row.admissionDate)}</td>
                    <td className="num">{fmtDate(ADMISSION_CUTOFF)}</td>
                  </>
                )}
                {!res && <td className="text-slate-600">{r.detail}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const GUIDANCE: Record<string, string> = {
  over_intake: "Regular admissions beyond approved intake are not permitted. Check whether any of these students belong to a supernumerary quota that was mis-recorded before confirming.",
  national_duplicate: "A student can hold only one active admission. The earlier admission is usually the valid one; the later institution should cancel unless the student has withdrawn from the first.",
  not_found: "A valid-looking ID with no APAAR record can be a data entry error or a student who does not exist. Ask for the APAAR card or DigiLocker record before confirming.",
  name_match: "The difference is beyond normal spelling variation. Ask for proof of identity; a different person may have been entered against this APAAR ID.",
  late_admission: "Admissions after the cut-off need AICTE permission. Confirm unless the institution holds a written extension.",
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore();
  const w = getWorld();
  const [reveal, setReveal] = useState(false);
  const [outcome, setOutcome] = useState<"cleared" | "violation">("violation");
  const [action, setAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirm, setConfirm] = useState(false);

  const c = allCases(s.liveCases).find((x) => x.id === id);
  if (!c) {
    return <Card><Empty title="Case not found" body="It may have been closed or merged into another case." action={<LinkButton href="/aicte/cases">Back to queue</LinkButton>} /></Card>;
  }
  const inst = w.byId[c.institutionId];
  const prog = programmeOf(c.institutionId, c.programmeCode);
  const status = caseStatus(c, s.decisions);
  const decision = s.decisions[c.id];
  const actions = VIOLATION_ACTIONS[c.rule];
  const chosenAction = action || actions[0];
  const history = s.audit.filter((a) => a.action.includes(c.id) || a.target === c.id).reverse();
  const valid = remarks.trim().length >= 10;

  const toggleReveal = () => {
    if (!reveal) s.log(OFFICER, ROLE.aicte, `Viewed full APAAR IDs in case ${c.id}`, inst.name);
    setReveal(!reveal);
  };

  const record = () => {
    s.decideCase(c.id, { outcome, action: outcome === "violation" ? chosenAction : undefined, remarks: remarks.trim() });
    setConfirm(false);
    toast({
      tone: "success",
      title: `Decision recorded for ${c.id}`,
      body: outcome === "cleared" ? (c.source === "live" && c.rule !== "over_intake" ? `${c.rows.length} records added to the national register.` : "Case closed with no violation.") : "A notice has been sent to the institution.",
    });
    const next = allCases(s.liveCases).find((x) => x.id !== c.id && caseStatus(x, s.decisions) === "open" && x.institutionId === c.institutionId);
    if (next) router.push(`/aicte/cases/${next.id}`);
  };

  return (
    <>
      <PageHeader
        crumb={<><Link href="/aicte/cases" className="hover:underline">Review queue</Link> / {c.id}</>}
        title={c.title}
        subtitle={<>{inst.name} · {prog?.name} · opened {fmtDateTime(c.createdAt)}</>}
        actions={<OutcomeBadge status={status} />}
      />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader
              title="Evidence"
              subtitle={<><Badge tone="blue">{RULE_NAME[c.rule]}</Badge> <span className="ml-1">{c.summary}</span></>}
              action={c.rows.length > 0 && (
                <Button size="sm" variant="ghost" onClick={toggleReveal}>{reveal ? <EyeOff size={14} /> : <Eye size={14} />} {reveal ? "Mask IDs" : "Show full IDs"}</Button>
              )}
            />
            <div className="p-5"><Evidence c={c} reveal={reveal} /></div>
            <div className="border-t border-line bg-slate-50/60 px-5 py-3 text-[12.5px] leading-relaxed text-muted">
              <b className="text-ink">Guidance:</b> {GUIDANCE[c.rule]}
            </div>
          </Card>

          <Card>
            <CardHeader title="Case history" subtitle="From the audit trail" />
            <ul className="divide-y divide-line">
              {history.length ? history.map((a) => (
                <li key={a.seq} className="flex justify-between gap-4 px-5 py-2.5 text-[13px]">
                  <span><span className="text-muted">{a.actor}:</span> {a.action}</span>
                  <span className="shrink-0 text-muted">{fmtDateTime(a.ts)}</span>
                </li>
              )) : <li className="px-5 py-3 text-[13px] text-muted">Imported from an earlier cycle.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Decision" subtitle="The officer decides; the system only presents evidence" />
            <div className="p-5">
              {decision ? (
                <div className="space-y-3 text-[13.5px]">
                  <OutcomeBadge status={decision.outcome} />
                  {decision.action && <div className="font-medium text-ink">{decision.action}</div>}
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">“{decision.remarks}”</div>
                  <div className="text-[12px] text-muted">{decision.officer} · {fmtDateTime(decision.ts)}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {(["violation", "cleared"] as const).map((o) => (
                      <button key={o} onClick={() => setOutcome(o)}
                        className={`rounded-md border px-3 py-2.5 text-left text-[13px] ${outcome === o ? "border-brand-700 bg-brand-50 ring-1 ring-brand-700" : "border-slate-300 hover:bg-slate-50"}`}>
                        <div className="font-medium text-ink">{o === "violation" ? "Violation confirmed" : "No violation"}</div>
                        <div className="text-[12px] text-muted">{o === "violation" ? "Action against the institution" : c.source === "live" && c.rule !== "over_intake" ? "Records enter the register" : "Close the case"}</div>
                      </button>
                    ))}
                  </div>
                  {outcome === "violation" && (
                    <Field label="Action">
                      <Select value={chosenAction} onChange={(e) => setAction(e.target.value)}>
                        {actions.map((a) => <option key={a}>{a}</option>)}
                      </Select>
                    </Field>
                  )}
                  <Field label="Remarks" hint="Recorded in the audit trail and shared with the institution.">
                    <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="What you checked and why you decided this" />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {["Verified against the institution's admission register.", "Institution could not produce supporting documents.", "Student has withdrawn from the other institution."].map((t) => (
                      <button key={t} onClick={() => setRemarks(t)} className="rounded border border-line px-2 py-1 text-[12px] text-muted hover:bg-slate-50 hover:text-ink">{t}</button>
                    ))}
                  </div>
                  <Button className="w-full" disabled={!valid} onClick={() => setConfirm(true)}><Gavel size={15} /> Record decision</Button>
                  {!valid && <div className="text-center text-[12px] text-muted">Add remarks (at least 10 characters) to continue.</div>}
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Institution risk" subtitle="Why this institution is near the top of the queue" />
            <div className="p-5"><RiskExplain institutionId={c.institutionId} /></div>
          </Card>
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm decision"
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={record}>Confirm and sign</Button></>}>
        <div className="space-y-2 text-[13.5px]">
          <div><span className="text-muted">Case:</span> {c.id} · {c.title}</div>
          <div><span className="text-muted">Decision:</span> <b>{outcome === "cleared" ? "No violation" : `Violation: ${chosenAction}`}</b></div>
          <div><span className="text-muted">Remarks:</span> {remarks}</div>
          <p className="pt-2 text-[12.5px] text-muted">The decision is signed with your officer credentials and cannot be edited afterwards.</p>
        </div>
      </Modal>
    </>
  );
}
