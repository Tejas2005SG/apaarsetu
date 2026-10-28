"use client";

import { Bell, Inbox } from "lucide-react";
import { Badge, Button, Card, CardHeader, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { ABC_ID } from "@/lib/world";
import { fmtDate, fmtDateTime, maskApaar } from "@/lib/format";
import { toast } from "@/lib/toast";

const FIELD: Record<string, string> = { name: "Name", dob: "Date of birth", gender: "Gender", category: "Category" };

export default function RequestsPage() {
  const s = useStore();
  const corrections = s.corrections.filter((c) => s.register[c.apaarId]?.institutionId === ABC_ID);
  const notices = s.notices.filter((n) => n.institutionId === ABC_ID);
  const show = (field: string, v: string) => (field === "dob" ? fmtDate(v) : v);

  return (
    <>
      <PageHeader title="Requests & notices" subtitle="Corrections raised by your students, and notices issued by AICTE after reviewing a case." />
      <Card className="mb-5">
        <CardHeader title="Student correction requests" subtitle="Approving a correction updates the national register and re-signs the record" />
        {corrections.length === 0 ? (
          <Empty icon={<Inbox size={28} />} title="No correction requests" body="When a student reports a wrong detail in their record, it appears here for you to approve or reject." />
        ) : (
          <table className="table-base">
            <thead><tr><th>Student</th><th>Field</th><th>Current</th><th>Requested</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>
              {corrections.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{s.register[c.apaarId]?.name}</div>
                    <div className="num font-mono text-[12px] text-muted">{maskApaar(c.apaarId)}</div>
                  </td>
                  <td>{FIELD[c.field]}</td>
                  <td className="text-muted line-through decoration-slate-300">{show(c.field, c.current)}</td>
                  <td className="font-medium">{show(c.field, c.proposed)}</td>
                  <td className="max-w-[260px] text-[13px] text-slate-600">{c.reason}</td>
                  <td>{c.status === "pending" ? <Badge tone="amber">Pending</Badge> : c.status === "approved" ? <Badge tone="green">Approved</Badge> : <Badge tone="red">Rejected</Badge>}</td>
                  <td className="text-right">
                    {c.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { s.decideCorrection(c.id, false); toast({ tone: "info", title: "Correction rejected" }); }}>Reject</Button>
                        <Button size="sm" onClick={() => { s.decideCorrection(c.id, true); toast({ tone: "success", title: "Record corrected", body: "The register was updated and the record re-signed. Older QR codes now show as outdated." }); }}>Approve</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader title="Notices from AICTE" />
        {notices.length === 0 ? (
          <Empty icon={<Bell size={28} />} title="No notices" body="If an AICTE officer confirms a violation in one of your cases, the notice and required action appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {notices.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{n.action}</span>
                    {!n.acknowledged && <Badge tone="red">New</Badge>}
                  </div>
                  <div className="mt-0.5 text-[13px] text-slate-700">Case {n.caseId}: {n.title}</div>
                  <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-[13px] text-slate-700">“{n.remarks}”</div>
                  <div className="mt-1.5 text-[12px] text-muted">Issued {fmtDateTime(n.ts)} by AICTE Western Regional Office</div>
                </div>
                {n.acknowledged ? <Badge tone="green">Acknowledged</Badge> : (
                  <Button size="sm" onClick={() => { s.acknowledgeNotice(n.id); toast({ tone: "success", title: "Notice acknowledged" }); }}>Acknowledge</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
