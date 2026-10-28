"use client";

import { useState } from "react";
import { CheckCircle2, Download, FlaskConical, Link2, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageHeader, Select } from "@/components/ui";
import { entryHash, useStore } from "@/lib/store";
import { download, toCsv } from "@/lib/csv";
import { fmtDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

function verifyChain(entries: AuditEntry[]) {
  const t0 = performance.now();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const expectedPrev = i === 0 ? "0".repeat(64) : entries[i - 1].hash;
    if (e.prevHash !== expectedPrev) return { ok: false, at: e.seq, why: "Link to the previous entry is broken", ms: performance.now() - t0 };
    if (entryHash(e) !== e.hash) return { ok: false, at: e.seq, why: "Entry content does not match its hash", ms: performance.now() - t0 };
  }
  return { ok: true, at: 0, why: "", ms: performance.now() - t0 };
}

export default function AuditPage() {
  const audit = useStore((s) => s.audit);
  const [tampered, setTampered] = useState<AuditEntry[] | null>(null);
  const [result, setResult] = useState<ReturnType<typeof verifyChain> | null>(null);
  const [role, setRole] = useState("All roles");
  const entries = tampered ?? audit;
  const shown = [...entries].reverse().filter((e) => role === "All roles" || e.role === role);
  const roles = ["All roles", ...Array.from(new Set(audit.map((a) => a.role)))];

  const tamper = () => {
    const copy = audit.map((e) => ({ ...e }));
    const idx = copy.findIndex((e) => /Validated|Cleared|Confirmed|Approved/.test(e.action));
    const i = idx >= 0 ? idx : Math.max(0, copy.length - 2);
    copy[i] = { ...copy[i], action: copy[i].action.replace(/\d+/, (n) => String(Number(n) + 5)) + (/\d/.test(copy[i].action) ? "" : " (edited)") };
    setTampered(copy);
    setResult(null);
  };

  return (
    <>
      <PageHeader
        title="Audit trail"
        subtitle="Every upload, check, decision, consent and data access, in order. Each entry carries the hash of the one before it, so any later edit breaks the chain."
        actions={
          <>
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-40">{roles.map((r) => <option key={r}>{r}</option>)}</Select>
            <Button variant="secondary" onClick={() => download("audit_trail.csv", toCsv([["Seq", "Time", "Actor", "Role", "Action", "Target", "Prev hash", "Hash"], ...audit.map((a) => [a.seq, a.ts, a.actor, a.role, a.action, a.target, a.prevHash, a.hash])]))}>
              <Download size={15} /> Export
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 text-brand-700" />
            <div>
              <div className="text-[14px] font-semibold">Integrity check</div>
              <div className="text-[13px] text-muted">Recomputes the SHA-512 hash of all {entries.length} entries and checks every link.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tampered ? (
              <Button variant="secondary" onClick={() => { setTampered(null); setResult(null); }}><RotateCcw size={15} /> Restore original</Button>
            ) : (
              <Button variant="secondary" onClick={tamper}><FlaskConical size={15} /> Run tamper test</Button>
            )}
            <Button onClick={() => setResult(verifyChain(entries))}><Link2 size={15} /> Verify chain</Button>
          </div>
        </div>
        {tampered && !result && <div className="border-t border-line bg-amber-50/50 px-5 py-2.5 text-[13px] text-amber-900">One entry has been quietly edited in this view (a number was changed). Run the check to see whether it is caught.</div>}
        {result && (
          <div className={`fade-in flex items-center gap-2 border-t px-5 py-3 text-[13.5px] ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
            {result.ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {result.ok
              ? <span><b>Chain intact.</b> All {entries.length} entries verified in {result.ms.toFixed(1)} ms.</span>
              : <span><b>Tampering detected at entry #{result.at}.</b> {result.why}. Every entry after it is also untrusted.</span>}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title={`${shown.length} entries`} subtitle="Newest first" />
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>#</th><th>Time</th><th>Actor</th><th>Action</th><th>Hash</th></tr></thead>
            <tbody>
              {shown.map((e) => {
                const bad = result && !result.ok && e.seq >= result.at;
                return (
                  <tr key={e.seq} className={bad ? "bg-red-50/60" : ""}>
                    <td className="num text-muted">{e.seq}</td>
                    <td className="whitespace-nowrap text-[13px] text-muted">{fmtDateTime(e.ts)}</td>
                    <td className="text-[13px]">
                      <div className="font-medium text-ink">{e.actor}</div>
                      <Badge>{e.role}</Badge>
                    </td>
                    <td className="text-[13px]">
                      <div className="text-ink">{e.action}</div>
                      <div className="text-[12px] text-muted">{e.target}</div>
                    </td>
                    <td className="font-mono text-[11.5px] text-muted">
                      <div title={e.hash}>{e.hash.slice(0, 16)}…</div>
                      <div title={e.prevHash} className="text-slate-400">← {e.prevHash.slice(0, 10)}…</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
