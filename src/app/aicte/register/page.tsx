"use client";

import { useState } from "react";
import { Library, Search, ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader, Empty, Input, KeyValue, LinkButton, Modal, PageHeader, Select } from "@/components/ui";
import { useStore } from "@/lib/store";
import { getWorld, programmeOf } from "@/lib/world";
import { fmtDate, fmtDateTime, maskApaar, num } from "@/lib/format";
import { PUBLIC_KEY_FINGERPRINT, sha512Hex } from "@/lib/crypto";
import type { RegisterRecord } from "@/lib/types";

const SOURCE: Record<RegisterRecord["source"], { label: string; tone: "neutral" | "blue" | "green" }> = {
  upload: { label: "Auto-verified", tone: "green" },
  officer: { label: "Officer cleared", tone: "blue" },
  correction: { label: "Corrected", tone: "neutral" },
};

export default function RegisterPage() {
  const register = useStore((s) => s.register);
  const w = getWorld();
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [open, setOpen] = useState<RegisterRecord | null>(null);
  const [page, setPage] = useState(0);
  const all = Object.values(register).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const list = all.filter((r) => (src === "all" || r.source === src) && (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.apaarId.endsWith(q.replace(/\s/g, ""))));
  const PAGE = 25;
  const baseline = w.institutions.reduce((n, i) => n + i.verified, 0);

  return (
    <>
      <PageHeader title="National register" subtitle={`Signed, student-level records keyed on APAAR ID. ${num(baseline)} records from earlier submissions are held in the archive; records added in this session are listed below.`} />
      <Card>
        <CardHeader
          title={`${num(list.length)} records`}
          subtitle="Search by name or the last digits of the APAAR ID"
          action={
            <div className="flex gap-2">
              <Select value={src} onChange={(e) => { setSrc(e.target.value); setPage(0); }} className="w-44">
                <option value="all">All sources</option><option value="upload">Auto-verified</option><option value="officer">Officer cleared</option><option value="correction">Corrected</option>
              </Select>
              <div className="relative w-64">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name or last 4 digits" className="pl-8" />
              </div>
            </div>
          }
        />
        {all.length === 0 ? (
          <Empty icon={<Library size={28} />} title="No records added yet" body="Records appear as soon as an institution's submission is validated." action={<LinkButton href="/institution/submit" variant="secondary">Go to institution upload</LinkButton>} />
        ) : (
          <>
            <table className="table-base">
              <thead><tr><th>APAAR ID</th><th>Name</th><th>Institution</th><th>Programme</th><th>Quota</th><th>Source</th><th>Added</th></tr></thead>
              <tbody>
                {list.slice(page * PAGE, page * PAGE + PAGE).map((r) => (
                  <tr key={r.apaarId} className="cursor-pointer" onClick={() => setOpen(r)}>
                    <td className="num font-mono text-[12.5px]">{maskApaar(r.apaarId)}</td>
                    <td className="font-medium">{r.name}</td>
                    <td className="text-[13px]">{w.byId[r.institutionId]?.name}</td>
                    <td className="text-[13px]">{programmeOf(r.institutionId, r.programmeCode)?.name}</td>
                    <td className="text-[13px]">{r.quota}</td>
                    <td><Badge tone={SOURCE[r.source].tone}>{SOURCE[r.source].label}</Badge></td>
                    <td className="whitespace-nowrap text-[13px] text-muted">{fmtDateTime(r.addedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[13px] text-muted">
              <span className="num">{list.length ? page * PAGE + 1 : 0}–{Math.min(list.length, page * PAGE + PAGE)} of {list.length}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border border-line px-3 py-1 disabled:opacity-40">Previous</button>
                <button disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)} className="rounded border border-line px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title="Register record" width="max-w-xl">
        {open && (
          <div className="space-y-4">
            <KeyValue items={[
              ["Name", open.name], ["APAAR ID", <span key="a" className="font-mono">{maskApaar(open.apaarId)}</span>],
              ["Date of birth", fmtDate(open.dob)], ["Gender", open.gender],
              ["Institution", w.byId[open.institutionId]?.name], ["Programme", programmeOf(open.institutionId, open.programmeCode)?.name],
              ["Quota", open.quota], ["Admitted on", fmtDate(open.admissionDate)],
              ["Record version", `v${open.version}`], ["Added", fmtDateTime(open.addedAt)],
            ]} />
            <div className="rounded-md border border-line bg-slate-50 p-3 text-[12.5px]">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-ink"><ShieldCheck size={14} className="text-emerald-700" /> Signed by AICTE (Ed25519)</div>
              <div className="text-muted">Key fingerprint <span className="font-mono text-ink">{PUBLIC_KEY_FINGERPRINT}</span></div>
              <div className="mt-0.5 break-all text-muted">Record digest <span className="font-mono text-ink">{sha512Hex(JSON.stringify(open)).slice(0, 48)}…</span></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
