"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Card, Empty, Input, PageHeader, Select, Tabs } from "@/components/ui";
import { OutcomeBadge } from "@/components/outcome";
import { RiskBar, useRisk } from "@/components/risk";
import { allCases, caseStatus, useStore } from "@/lib/store";
import { getWorld } from "@/lib/world";
import { fmtDate } from "@/lib/format";
import { RULE_NAME } from "@/lib/rules";
import type { CaseRule } from "@/lib/types";

type StatusTab = "open" | "decided" | "all";

function CasesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const s = useStore();
  const w = getWorld();
  const risk = useRisk();
  const [tab, setTab] = useState<StatusTab>("open");
  const [rule, setRule] = useState<CaseRule | "all">("all");
  const [q, setQ] = useState("");
  const institution = params.get("institution");

  const scoreOf = useMemo(() => Object.fromEntries(risk.rows.map((r) => [r.institutionId, r.score ?? 0])), [risk]);
  const cases = allCases(s.liveCases);
  const filtered = cases
    .filter((c) => {
      const st = caseStatus(c, s.decisions);
      if (tab === "open" && st !== "open") return false;
      if (tab === "decided" && (st === "open" || st === "superseded")) return false;
      if (rule !== "all" && c.rule !== rule) return false;
      if (institution && c.institutionId !== institution) return false;
      if (q && !`${c.id} ${w.byId[c.institutionId].name} ${c.title}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => scoreOf[b.institutionId] - scoreOf[a.institutionId] || b.createdAt.localeCompare(a.createdAt));

  const count = (t: StatusTab) => cases.filter((c) => {
    const st = caseStatus(c, s.decisions);
    return t === "open" ? st === "open" : t === "decided" ? st === "cleared" || st === "violation" : true;
  }).length;

  return (
    <>
      <PageHeader title="Review queue" subtitle="Cases that need an officer's judgement, ordered by institution risk. Each case carries the rule, the records and the evidence." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3">
          <Tabs<StatusTab> value={tab} onChange={setTab} items={[
            { value: "open", label: "Open", count: count("open") },
            { value: "decided", label: "Decided", count: count("decided") },
            { value: "all", label: "All", count: count("all") },
          ]} />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {institution && (
              <button onClick={() => router.push("/aicte/cases")} className="flex h-9 items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 text-[13px] text-brand-700">
                {w.byId[institution]?.name.split(",")[0]} <X size={13} />
              </button>
            )}
            <Select value={rule} onChange={(e) => setRule(e.target.value as CaseRule | "all")} className="w-56">
              <option value="all">All rules</option>
              {(Object.keys(RULE_NAME) as CaseRule[]).map((r) => <option key={r} value={r}>{RULE_NAME[r]}</option>)}
            </Select>
            <div className="relative w-60">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Case ID or institution" className="pl-8" />
            </div>
          </div>
        </div>
        {filtered.length === 0 ? <Empty title="No cases" body="Nothing matches these filters." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Case</th><th>Institution</th><th>Rule</th><th>Finding</th><th className="text-right">Records</th><th>Institution risk</th><th>Opened</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.slice(0, 120).map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/aicte/cases/${c.id}`)}>
                    <td className="num font-medium text-brand-700"><Link href={`/aicte/cases/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.id}</Link></td>
                    <td>
                      <div className="font-medium text-ink">{w.byId[c.institutionId].name}</div>
                      <div className="text-[12px] text-muted">{w.byId[c.institutionId].state}</div>
                    </td>
                    <td className="whitespace-nowrap text-[13px]">{RULE_NAME[c.rule]}</td>
                    <td className="text-[13px]">{c.title}</td>
                    <td className="num text-right">{c.rows.length || c.excess}</td>
                    <td><RiskBar score={scoreOf[c.institutionId] ?? null} /></td>
                    <td className="whitespace-nowrap text-[13px] text-muted">{fmtDate(c.createdAt)}</td>
                    <td><OutcomeBadge status={caseStatus(c, s.decisions)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 120 && <div className="px-5 py-3 text-[12.5px] text-muted">Showing the first 120 of {filtered.length}. Use the filters to narrow down.</div>}
          </div>
        )}
      </Card>
    </>
  );
}

export default function CasesPage() {
  return (
    <Suspense>
      <CasesInner />
    </Suspense>
  );
}
