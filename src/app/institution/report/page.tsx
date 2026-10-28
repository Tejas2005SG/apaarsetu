"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, RefreshCw, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardHeader, Empty, Input, LinkButton, PageHeader, Select, Stat, Tabs } from "@/components/ui";
import { SeatLedger } from "@/components/seat-ledger";
import { RowChecksModal, statusBadge } from "@/components/row-checks";
import { allCases, useStore } from "@/lib/store";
import { ABC_ID, programmeOf } from "@/lib/world";
import { download, toCsv } from "@/lib/csv";
import { fmtApaar, fmtDateTime } from "@/lib/format";
import { primaryIssue, RULE_LABEL } from "@/lib/validate";
import type { EditableField, RowResult, UploadRow } from "@/lib/types";
import { toast } from "@/lib/toast";

type TabKey = "fix" | "review" | "accepted" | "all";

const FIELD_LABEL: Record<EditableField, string> = {
  apaarId: "APAAR ID", name: "Name", dob: "Date of birth", gender: "Gender", category: "Category", quota: "Quota", admissionDate: "Admission date",
};

function ReportInner() {
  const params = useSearchParams();
  const s = useStore();
  const subs = s.submissions.filter((x) => x.institutionId === ABC_ID);
  const [picked, setPicked] = useState(params.get("id") ?? "");
  const sub = subs.find((x) => x.id === picked) ?? subs[0];
  const [tab, setTab] = useState<TabKey | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<RowResult | null>(null);
  const [edits, setEdits] = useState<Record<number, Partial<UploadRow>>>({});

  const by = useMemo(() => {
    const r = sub?.results ?? [];
    return { fix: r.filter((x) => x.status === "fix"), review: r.filter((x) => x.status === "review"), accepted: r.filter((x) => x.status === "accepted"), all: r };
  }, [sub]);

  if (!sub) {
    return (
      <>
        <PageHeader title="Validation reports" />
        <Card><Empty title="No submissions yet" body="Reports appear here as soon as you upload a student list." action={<LinkButton href="/institution/submit">New submission</LinkButton>} /></Card>
      </>
    );
  }

  const prog = programmeOf(sub.institutionId, sub.programmeCode)!;
  const active: TabKey = tab ?? (by.fix.length ? "fix" : by.review.length ? "review" : "accepted");
  const caseOf = (apaar: string) => allCases(s.liveCases).find((c) => c.submissionId === sub.id && c.rows.some((r) => r.apaarId === apaar));
  const list = by[active].filter((r) => !q || `${r.row.name} ${r.row.apaarId}`.toLowerCase().includes(q.toLowerCase().replace(/\s/g, "")) || r.row.name.toLowerCase().includes(q.toLowerCase()));
  const PAGE = 20;
  const pageRows = list.slice(page * PAGE, page * PAGE + PAGE);

  const setEdit = (rowNo: number, field: EditableField, value: string) => setEdits((e) => ({ ...e, [rowNo]: { ...e[rowNo], [field]: value } }));
  const applyAll = () => {
    const next = { ...edits };
    by.fix.forEach((r) => r.suggestions.forEach((sg) => (next[r.row.rowNo] = { ...next[r.row.rowNo], [sg.field]: sg.value })));
    setEdits(next);
    toast({ tone: "info", title: "Suggestions applied", body: "Values from the APAAR registry were filled in. Review them, then resubmit." });
  };
  const editedCount = by.fix.filter((r) => edits[r.row.rowNo] && Object.keys(edits[r.row.rowNo]).length).length;
  const resubmit = () => {
    const relevant = Object.fromEntries(Object.entries(edits).filter(([k]) => by.fix.some((r) => r.row.rowNo === Number(k))));
    const res = s.applyFixes(sub.id, relevant);
    setEdits({});
    toast({
      tone: res.fix ? "warning" : "success",
      title: `${Object.keys(relevant).length} rows re-checked`,
      body: `${res.accepted} accepted${res.fix ? `, ${res.fix} still need fixing` : ""}${res.review ? `, ${res.review} sent to AICTE` : ""}.`,
    });
    if (!res.fix) setTab("accepted");
  };

  const exportCsv = () => {
    download(`${sub.id}_validation_report.csv`, toCsv([
      ["Row", "APAAR ID", "Name", "Status", "Issue", "Match score", "Name on APAAR"],
      ...sub.results.map((r) => [r.row.rowNo, r.row.apaarId, r.row.name, r.status, r.failed.map((f) => f.message).join("; "), r.matchScore?.toFixed(2) ?? "", r.registryName ?? ""]),
    ]));
  };

  return (
    <>
      <PageHeader
        title="Validation report"
        crumb={<Link href="/institution" className="hover:underline">Overview</Link>}
        subtitle={<>{prog.name} · {sub.fileName} · uploaded {fmtDateTime(sub.uploadedAt)} · e-signed by {sub.signedBy}{sub.round > 1 && <> · <b>resubmitted ({sub.round - 1}×)</b></>}</>}
        actions={
          <>
            {subs.length > 1 && (
              <Select value={sub.id} onChange={(e) => { setPicked(e.target.value); setTab(null); setEdits({}); }} className="w-56">
                {subs.map((x) => <option key={x.id} value={x.id}>{x.id} · {fmtDateTime(x.uploadedAt)}</option>)}
              </Select>
            )}
            <Button variant="secondary" onClick={exportCsv}><Download size={15} /> Download report</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Uploaded" value={sub.results.length} />
        <Stat label="Accepted" value={by.accepted.length} tone="green" hint="In the national register" />
        <Stat label="To fix" value={by.fix.length} tone={by.fix.length ? "amber" : undefined} hint="Returned to you" />
        <Stat label="AICTE review" value={by.review.length} tone={by.review.length ? "red" : undefined} hint="Officer decides" />
        <Stat label="Over intake" value={sub.ledger.excess} tone={sub.ledger.excess ? "red" : undefined} hint={`${sub.ledger.regular} regular vs ${sub.ledger.approved} approved`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3">
            <Tabs<TabKey>
              value={active}
              onChange={(v) => { setTab(v); setPage(0); }}
              items={[
                { value: "fix", label: "To fix", count: by.fix.length },
                { value: "review", label: "AICTE review", count: by.review.length },
                { value: "accepted", label: "Accepted", count: by.accepted.length },
                { value: "all", label: "All rows", count: by.all.length },
              ]}
            />
            <div className="relative mb-2 w-60">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name or APAAR ID" className="pl-8" />
            </div>
          </div>

          {active === "fix" && by.fix.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line bg-amber-50/40 px-5 py-2.5 text-[13px]">
              <span>Correct the highlighted values, then re-check. Values marked <b>From APAAR</b> come from the registry record.</span>
              <Button size="sm" variant="secondary" onClick={applyAll}><Sparkles size={14} /> Fill all suggestions</Button>
            </div>
          )}

          <div className="overflow-x-auto">
            {active === "fix" ? (
              by.fix.length === 0 ? <Empty title="Nothing to fix" body="Every row returned to you has been corrected." /> : (
                <table className="table-base">
                  <thead><tr><th>Row</th><th>Student</th><th>Issue</th><th className="w-[300px]">Correction</th></tr></thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const fields = Array.from(new Set(r.failed.filter((f) => f.severity === "fix").map((f) => f.field).filter((f): f is EditableField => !!f)));
                      return (
                        <tr key={r.row.rowNo}>
                          <td className="num align-top text-muted">{r.row.rowNo}</td>
                          <td className="align-top">
                            <button onClick={() => setDetail(r)} className="text-left font-medium text-ink hover:text-brand-700 hover:underline">{r.row.name || "—"}</button>
                            <div className="num font-mono text-[12px] text-muted">{fmtApaar(r.row.apaarId) || "no APAAR ID"}</div>
                          </td>
                          <td className="align-top text-[13px]">
                            {r.failed.filter((f) => f.severity === "fix").map((f) => (
                              <div key={f.rule} className="mb-1"><span className="font-medium text-amber-800">{RULE_LABEL[f.rule]}:</span> {f.message}</div>
                            ))}
                          </td>
                          <td className="align-top">
                            {fields.map((f) => {
                              const sg = r.suggestions.find((x) => x.field === f);
                              const val = edits[r.row.rowNo]?.[f] ?? (r.row[f] as string);
                              const changed = edits[r.row.rowNo]?.[f] !== undefined;
                              return (
                                <div key={f} className="mb-2">
                                  <div className="mb-1 text-[11.5px] font-medium text-muted">{FIELD_LABEL[f]}</div>
                                  <div className="flex gap-1.5">
                                    {f === "gender" ? (
                                      <Select value={val} onChange={(e) => setEdit(r.row.rowNo, f, e.target.value)} className={changed ? "border-brand-500" : "border-amber-400"}>
                                        <option value="">Select</option><option value="F">F</option><option value="M">M</option><option value="O">O</option>
                                      </Select>
                                    ) : (
                                      <Input value={val} onChange={(e) => setEdit(r.row.rowNo, f, e.target.value)} className={changed ? "border-brand-500 font-mono" : "border-amber-400 font-mono"} placeholder={f === "admissionDate" || f === "dob" ? "YYYY-MM-DD" : ""} />
                                    )}
                                  </div>
                                  {sg && !changed && (
                                    <button onClick={() => setEdit(r.row.rowNo, f, sg.value)} className="mt-1 text-left text-[12px] text-brand-700 hover:underline" title={sg.reason}>
                                      From APAAR: <span className="font-mono">{f === "apaarId" ? fmtApaar(sg.value) : sg.value}</span> · use this
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : list.length === 0 ? (
              <Empty title="No rows" body={q ? "No rows match your search." : "There are no rows in this category."} />
            ) : (
              <table className="table-base">
                <thead><tr><th>Row</th><th>Student</th><th>APAAR ID</th><th>Quota</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  {pageRows.map((r) => {
                    const issue = primaryIssue(r);
                    const c = r.status === "review" ? caseOf(r.row.apaarId) : undefined;
                    return (
                      <tr key={r.row.rowNo} className="cursor-pointer" onClick={() => setDetail(r)}>
                        <td className="num text-muted">{r.row.rowNo}</td>
                        <td className="font-medium">{r.row.name}</td>
                        <td className="num font-mono text-[12.5px]">{fmtApaar(r.row.apaarId)}</td>
                        <td>{r.row.quota}</td>
                        <td>{statusBadge(r.status)}</td>
                        <td className="max-w-[420px] text-[13px] text-slate-600">
                          {r.status === "accepted" ? (r.matchNote ? <Badge tone="blue">{r.matchNote}: APAAR name “{r.registryName}”</Badge> : <span className="text-muted">All checks passed</span>)
                            : <>{issue?.message}{c && <span className="ml-1 text-muted">· case {c.id}</span>}</>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {list.length > PAGE && (
            <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[13px] text-muted">
              <span className="num">{page * PAGE + 1}–{Math.min(list.length, page * PAGE + PAGE)} of {list.length}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}

          {active === "fix" && by.fix.length > 0 && (
            <div className="flex items-center justify-between border-t border-line bg-slate-50/60 px-5 py-3">
              <span className="num text-[13px] text-muted">{editedCount} of {by.fix.length} rows edited</span>
              <Button disabled={!editedCount} onClick={resubmit}><RefreshCw size={15} /> Re-check and resubmit</Button>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Seat ledger" subtitle={prog.name} />
            <div className="p-5"><SeatLedger ledger={sub.ledger} /></div>
          </Card>
          {allCases(s.liveCases).some((c) => c.submissionId === sub.id) && (
            <Card>
              <CardHeader title="With AICTE" subtitle="An officer reviews these with the evidence" />
              <ul className="divide-y divide-line">
                {allCases(s.liveCases).filter((c) => c.submissionId === sub.id).map((c) => {
                  const d = s.decisions[c.id];
                  return (
                    <li key={c.id} className="px-5 py-2.5 text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink">{c.title}</span>
                        {d ? <Badge tone={d.outcome === "cleared" ? "green" : d.outcome === "violation" ? "red" : "neutral"}>{d.outcome === "cleared" ? "Cleared" : d.outcome === "violation" ? "Violation" : "Superseded"}</Badge> : <Badge>Open</Badge>}
                      </div>
                      <div className="text-[12px] text-muted">Case {c.id}</div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <RowChecksModal result={detail} onClose={() => setDetail(null)} />
    </>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportInner />
    </Suspense>
  );
}
