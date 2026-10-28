"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, UploadCloud } from "lucide-react";
import { Badge, Card, CardHeader, Empty, LinkButton, PageHeader, Stat } from "@/components/ui";
import { SeatLedger } from "@/components/seat-ledger";
import { allCases, caseStatus, useStore } from "@/lib/store";
import { ABC_ID, ACADEMIC_YEAR, getWorld } from "@/lib/world";
import { fmtDateTime, num } from "@/lib/format";

export default function InstitutionOverview() {
  const s = useStore();
  const inst = getWorld().byId[ABC_ID];
  const subs = s.submissions.filter((x) => x.institutionId === ABC_ID);
  const latest = (code: string) => subs.find((x) => x.programmeCode === code);
  const records = Object.values(s.register).filter((r) => r.institutionId === ABC_ID);
  const cases = allCases(s.liveCases).filter((c) => c.institutionId === ABC_ID);
  const openCases = cases.filter((c) => caseStatus(c, s.decisions) === "open");
  const toFix = subs.reduce((n, x) => n + x.results.filter((r) => r.status === "fix").length, 0);
  const notices = s.notices.filter((n) => n.institutionId === ABC_ID);
  const pendingCorr = s.corrections.filter((c) => c.status === "pending" && s.register[c.apaarId]?.institutionId === ABC_ID);
  const cse = latest("BTECH-CSE");

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Admissions for academic year ${ACADEMIC_YEAR}. Submit each programme's admitted-student list before 15 November 2026.`}
        actions={<LinkButton href="/institution/submit"><UploadCloud size={16} /> New submission</LinkButton>}
      />

      {(toFix > 0 || notices.some((n) => !n.acknowledged) || pendingCorr.length > 0) && (
        <Card className="mb-5 border-amber-200 bg-amber-50/50 px-4 py-3">
          <div className="flex items-start gap-3 text-[13.5px]">
            <AlertTriangle size={17} className="mt-0.5 text-amber-700" />
            <div className="flex-1 space-y-0.5">
              {toFix > 0 && <div><span className="font-medium">{toFix} rows need correction</span> before they can enter the national register. <Link className="text-brand-700 hover:underline" href="/institution/report">Fix now</Link></div>}
              {notices.some((n) => !n.acknowledged) && <div><span className="font-medium">New notice from AICTE.</span> <Link className="text-brand-700 hover:underline" href="/institution/requests">Read and acknowledge</Link></div>}
              {pendingCorr.length > 0 && <div><span className="font-medium">{pendingCorr.length} student correction request{pendingCorr.length > 1 ? "s" : ""}</span> waiting for your approval. <Link className="text-brand-700 hover:underline" href="/institution/requests">Review</Link></div>}
            </div>
          </div>
        </Card>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Approved intake" value={num(inst.programmes.reduce((n, p) => n + p.approved, 0))} hint={`${inst.programmes.length} programmes`} />
        <Stat label="Verified students" value={num(records.length)} hint="In the national register" tone={records.length ? "green" : undefined} />
        <Stat label="Rows to fix" value={toFix} hint="Returned to you" tone={toFix ? "amber" : undefined} />
        <Stat label="With AICTE" value={openCases.reduce((n, c) => n + (c.rows.length || 1), 0)} hint={`${openCases.length} open case${openCases.length === 1 ? "" : "s"}`} tone={openCases.length ? "red" : undefined} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Programmes" subtitle="Submission status by programme" />
          <table className="table-base">
            <thead>
              <tr>
                <th>Programme</th>
                <th className="text-right">Approved</th>
                <th className="text-right">Uploaded</th>
                <th className="text-right">Accepted</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {inst.programmes.map((p) => {
                const sub = latest(p.code);
                const acc = sub?.results.filter((r) => r.status === "accepted").length ?? 0;
                const fix = sub?.results.filter((r) => r.status === "fix").length ?? 0;
                return (
                  <tr key={p.code}>
                    <td>
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-[12px] text-muted">{p.code}</div>
                    </td>
                    <td className="num text-right">{p.approved}</td>
                    <td className="num text-right">{sub ? sub.results.length : "—"}</td>
                    <td className="num text-right">{sub ? acc : "—"}</td>
                    <td>
                      {!sub ? <Badge><CalendarClock size={12} /> Due 15 Nov</Badge>
                        : fix ? <Badge tone="amber">{fix} to fix</Badge>
                        : <Badge tone="green">Submitted</Badge>}
                    </td>
                    <td className="text-right">
                      {sub ? (
                        <Link href={`/institution/report?id=${sub.id}`} className="text-[13px] font-medium text-brand-700 hover:underline">Report</Link>
                      ) : (
                        <Link href={`/institution/submit?programme=${p.code}`} className="text-[13px] font-medium text-brand-700 hover:underline">Submit</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Seat ledger · B.Tech CSE" subtitle={cse ? `From submission of ${fmtDateTime(cse.uploadedAt)}` : "Appears after the first submission"} />
          <div className="p-5">
            {cse ? <SeatLedger ledger={cse.ledger} /> : (
              <Empty title="No submission yet" body="Upload the CSE student list to see admissions against approved intake." action={<LinkButton size="sm" href="/institution/submit">Upload now <ArrowRight size={14} /></LinkButton>} />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Recent activity" subtitle="Your institution's entries in the audit trail" />
        <ul className="divide-y divide-line">
          {s.audit.filter((a) => a.target.includes("ABC") || a.role === "Institution" || subs.some((x) => x.id === a.target)).slice(-6).reverse().map((a) => (
            <li key={a.seq} className="flex items-center justify-between gap-4 px-5 py-2.5 text-[13px]">
              <span className="text-ink">{a.action}</span>
              <span className="shrink-0 text-muted">{fmtDateTime(a.ts)}</span>
            </li>
          ))}
          {!subs.length && <li className="px-5 py-4 text-[13px] text-muted">Nothing yet. Start with a new submission.</li>}
        </ul>
      </Card>
    </>
  );
}
