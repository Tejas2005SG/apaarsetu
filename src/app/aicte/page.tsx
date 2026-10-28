"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { Button, Card, CardHeader, Modal, PageHeader, Select, Stat } from "@/components/ui";
import { RiskBar, RiskExplain, useRisk } from "@/components/risk";
import { allCases, caseStatus, useStore } from "@/lib/store";
import { ABC_ID, getWorld } from "@/lib/world";
import { fmtDate, num } from "@/lib/format";
import { riskBand } from "@/lib/risk";
import { download, toCsv } from "@/lib/csv";
import type { CaseRule } from "@/lib/types";
import { RULE_NAME } from "@/lib/rules";

const axis = { fontSize: 12, fill: "#5b6475" };

export default function AicteDashboard() {
  const s = useStore();
  const w = getWorld();
  const risk = useRisk();
  const [stateFilter, setStateFilter] = useState("All states");
  const [why, setWhy] = useState<string | null>(null);

  const cases = allCases(s.liveCases);
  const open = cases.filter((c) => caseStatus(c, s.decisions) === "open");
  const flagsOf = (instId: string) => open.filter((c) => c.institutionId === instId).reduce((n, c) => n + (c.rows.length || c.excess || 1), 0);
  const openFlags = open.reduce((n, c) => n + (c.rows.length || c.excess || 1), 0);
  const live = Object.values(s.register);
  const abcSubmitted = s.submissions.some((x) => x.institutionId === ABC_ID);
  const verified = w.institutions.reduce((n, i) => n + i.verified, 0) + live.length;
  const high = risk.rows.filter((r) => riskBand(r.score).label === "High").length;

  const byRule = useMemo(() => {
    const m = new Map<CaseRule, number>();
    open.forEach((c) => m.set(c.rule, (m.get(c.rule) ?? 0) + (c.rows.length || c.excess || 1)));
    return (Object.keys(RULE_NAME) as CaseRule[]).map((r) => ({ rule: RULE_NAME[r], flags: m.get(r) ?? 0 }));
  }, [open]);

  const byState = useMemo(() => {
    const m = new Map<string, number>();
    w.institutions.forEach((i) => m.set(i.state, (m.get(i.state) ?? 0) + i.verified));
    live.forEach((r) => {
      const st = w.byId[r.institutionId].state;
      m.set(st, (m.get(st) ?? 0) + 1);
    });
    return [...m.entries()].map(([state, v]) => ({ state, verified: v })).sort((a, b) => b.verified - a.verified).slice(0, 10);
  }, [live, w]);

  const trend = useMemo(() => {
    const t = w.weekly.map((x) => ({ week: fmtDate(x.week).replace(/ 2026$/, ""), records: x.records }));
    if (live.length) t[t.length - 1] = { ...t[t.length - 1], records: t[t.length - 1].records + live.length };
    return t;
  }, [w, live.length]);

  const states = ["All states", ...Array.from(new Set(w.institutions.map((i) => i.state))).sort()];
  const table = risk.rows.filter((r) => stateFilter === "All states" || w.byId[r.institutionId].state === stateFilter);

  const exportCsv = () =>
    download("institution_risk_ranking.csv", toCsv([
      ["Rank", "Institution", "State", "Risk score", "Open flags"],
      ...risk.rows.map((r, i) => [i + 1, w.byId[r.institutionId].name, w.byId[r.institutionId].state, r.score?.toFixed(2) ?? "", flagsOf(r.institutionId)]),
    ]));

  return (
    <>
      <PageHeader
        title="National dashboard"
        subtitle="Admissions for 2026-27 as institutions submit them, with the cases that need an officer."
        actions={<Button variant="secondary" onClick={exportCsv}><Download size={15} /> Export ranking</Button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Institutions reporting" value={`${w.institutions.length - (abcSubmitted ? 0 : 1)} / ${w.institutions.length}`} hint={abcSubmitted ? "All submitted" : "ABC Institute pending"} />
        <Stat label="Verified students" value={num(verified)} hint={live.length ? `${num(live.length)} added today` : "Signed records in the register"} tone="green" />
        <Stat label="Open flags" value={num(openFlags)} hint={`${open.length} cases awaiting an officer`} tone="amber" />
        <Stat label="High-risk institutions" value={high} hint="Risk score 0.65 or above" tone={high ? "red" : undefined} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Verified records over the admission cycle" subtitle="Cumulative, all institutions" />
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: 8, right: 16, top: 4 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="week" tick={axis} tickLine={false} axisLine={{ stroke: "#e2e6ec" }} interval={2} />
                <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip formatter={(v) => [num(Number(v)), "Records"]} contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e6ec" }} />
                <Area type="monotone" dataKey="records" stroke="#1f3864" strokeWidth={2} fill="#dde4f0" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Open flags by rule" subtitle="Records awaiting a decision" />
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRule} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="rule" tick={axis} width={150} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#f6f7f9" }} contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e6ec" }} />
                <Bar dataKey="flags" fill="#3b5a8f" radius={[0, 3, 3, 0]} barSize={16} label={{ position: "right", fontSize: 12, fill: "#1d2433" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Institutions by risk"
            subtitle="Ordered by anomaly score. Open the queue to see the evidence."
            action={<Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-44">{states.map((x) => <option key={x}>{x}</option>)}</Select>}
          />
          <div className="max-h-[440px] overflow-y-auto">
            <table className="table-base">
              <thead className="sticky top-0"><tr><th>#</th><th>Institution</th><th>State</th><th className="text-right">Open flags</th><th>Risk score</th><th /></tr></thead>
              <tbody>
                {table.map((r) => {
                  const inst = w.byId[r.institutionId];
                  const rank = risk.rows.indexOf(r) + 1;
                  return (
                    <tr key={r.institutionId} className={r.institutionId === ABC_ID && r.score !== null ? "bg-red-50/40" : ""}>
                      <td className="num text-muted">{r.score === null ? "—" : rank}</td>
                      <td>
                        <div className="font-medium text-ink">{inst.name}</div>
                        <div className="text-[12px] text-muted">AICTE ID {inst.aicteId}</div>
                      </td>
                      <td className="text-[13px]">{inst.state}</td>
                      <td className="num text-right">{flagsOf(r.institutionId) || "—"}</td>
                      <td><RiskBar score={r.score} /></td>
                      <td className="whitespace-nowrap text-right">
                        {r.score !== null && <button onClick={() => setWhy(r.institutionId)} className="mr-3 text-[13px] text-muted hover:text-ink hover:underline">Why?</button>}
                        <Link href={`/aicte/cases?institution=${r.institutionId}`} className="text-[13px] font-medium text-brand-700 hover:underline">Cases</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Verified students by state" subtitle="Top 10" />
          <div className="h-[440px] px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byState} layout="vertical" margin={{ left: 8, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="state" tick={axis} width={110} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [num(Number(v)), "Verified"]} cursor={{ fill: "#f6f7f9" }} contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e6ec" }} />
                <Bar dataKey="verified" fill="#1f3864" radius={[0, 3, 3, 0]} barSize={14} label={{ position: "right", fontSize: 11, fill: "#5b6475", formatter: (v: unknown) => num(Number(v)) }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Modal open={!!why} onClose={() => setWhy(null)} title={why ? `Why this score · ${w.byId[why].name}` : ""} width="max-w-xl">
        {why && <RiskExplain institutionId={why} />}
      </Modal>
    </>
  );
}
