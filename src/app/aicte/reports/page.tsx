"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { Button, Card, CardHeader, PageHeader, Select, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { getWorld } from "@/lib/world";
import { mulberry32 } from "@/lib/rng";
import { download, toCsv } from "@/lib/csv";
import { num, pct } from "@/lib/format";

const CATS = ["GEN", "OBC", "SC", "ST", "EWS"] as const;
const CAT_COLORS = ["#1f3864", "#3b5a8f", "#7d93b8", "#b9c7df", "#9aa4b2"];
const axis = { fontSize: 12, fill: "#5b6475" };

interface Agg {
  state: string;
  institutions: number;
  approved: number;
  verified: number;
  female: number;
  cats: Record<(typeof CATS)[number], number>;
}

export default function ReportsPage() {
  const register = useStore((s) => s.register);
  const w = getWorld();
  const [state, setState] = useState("All states");

  const rows = useMemo(() => {
    const m = new Map<string, Agg>();
    const get = (st: string) => {
      if (!m.has(st)) m.set(st, { state: st, institutions: 0, approved: 0, verified: 0, female: 0, cats: { GEN: 0, OBC: 0, SC: 0, ST: 0, EWS: 0 } });
      return m.get(st)!;
    };
    w.institutions.forEach((inst, i) => {
      const a = get(inst.state);
      a.institutions++;
      a.approved += inst.programmes.reduce((n, p) => n + p.approved, 0) * 4;
      if (!inst.verified) return;
      const rnd = mulberry32(900 + i);
      a.verified += inst.verified;
      a.female += Math.round(inst.verified * (0.27 + rnd() * 0.12));
      const shares = [0.38 + rnd() * 0.06, 0.28 + rnd() * 0.05, 0.13 + rnd() * 0.03, 0.05 + rnd() * 0.04, 0.1];
      const tot = shares.reduce((x, y) => x + y, 0);
      CATS.forEach((c, k) => (a.cats[c] += Math.round((inst.verified * shares[k]) / tot)));
    });
    Object.values(register).forEach((r) => {
      const a = get(w.byId[r.institutionId].state);
      a.verified++;
      if (r.gender === "F") a.female++;
      const c = (CATS as readonly string[]).includes(r.category) ? (r.category as (typeof CATS)[number]) : "GEN";
      a.cats[c]++;
    });
    return [...m.values()].sort((x, y) => y.verified - x.verified);
  }, [register, w]);

  const shown = state === "All states" ? rows : rows.filter((r) => r.state === state);
  const total = shown.reduce(
    (t, r) => ({ verified: t.verified + r.verified, approved: t.approved + r.approved, female: t.female + r.female, inst: t.inst + r.institutions, scst: t.scst + r.cats.SC + r.cats.ST }),
    { verified: 0, approved: 0, female: 0, inst: 0, scst: 0 },
  );
  const catData = shown.slice(0, 10).map((r) => ({ state: r.state, ...r.cats }));
  const gender = [{ name: "Female", value: total.female }, { name: "Male and other", value: total.verified - total.female }];

  const exportCsv = () => download("APAAR-Setu_enrolment_by_state_2026-27.csv", toCsv([
    ["State", "Institutions", "Approved intake (4 years)", "Verified students", "Female", "GEN", "OBC", "SC", "ST", "EWS"],
    ...shown.map((r) => [r.state, r.institutions, r.approved, r.verified, r.female, r.cats.GEN, r.cats.OBC, r.cats.SC, r.cats.ST, r.cats.EWS]),
  ]));

  return (
    <>
      <PageHeader
        title="Policy reports"
        subtitle="Numbers built from verified student records, not self-reported totals. The same data feeds AISHE, NIRF and MoE planning."
        actions={
          <>
            <Select value={state} onChange={(e) => setState(e.target.value)} className="w-48">
              <option>All states</option>
              {rows.map((r) => <option key={r.state}>{r.state}</option>)}
            </Select>
            <Button variant="secondary" onClick={exportCsv}><Download size={15} /> Export (AISHE format)</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Verified students" value={num(total.verified)} hint={`${total.inst} institutions`} />
        <Stat label="Seat utilisation" value={pct((total.verified / Math.max(total.approved, 1)) * 100)} hint="Verified vs approved intake, all years" />
        <Stat label="Female students" value={pct((total.female / Math.max(total.verified, 1)) * 100)} hint={num(total.female)} />
        <Stat label="SC and ST students" value={pct((total.scst / Math.max(total.verified, 1)) * 100)} hint={num(total.scst)} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Students by social category" subtitle={state === "All states" ? "Top 10 states" : state} />
          <div className="h-80 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="state" tick={{ ...axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e2e6ec" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => num(v)} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e6ec" }} cursor={{ fill: "#f6f7f9" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {CATS.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={CAT_COLORS[i]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Gender" subtitle="Verified students" />
          <div className="h-80 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gender} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={1} stroke="none">
                  <Cell fill="#1f3864" />
                  <Cell fill="#b9c7df" />
                </Pie>
                <Tooltip formatter={(v) => num(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e6ec" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="State-wise summary" />
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>State</th><th className="text-right">Institutions</th><th className="text-right">Verified</th><th className="text-right">Utilisation</th><th className="text-right">Female</th>{CATS.map((c) => <th key={c} className="text-right">{c}</th>)}</tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.state}>
                  <td className="font-medium">{r.state}</td>
                  <td className="num text-right">{r.institutions}</td>
                  <td className="num text-right">{num(r.verified)}</td>
                  <td className="num text-right">{pct((r.verified / Math.max(r.approved, 1)) * 100)}</td>
                  <td className="num text-right">{pct((r.female / Math.max(r.verified, 1)) * 100)}</td>
                  {CATS.map((c) => <td key={c} className="num text-right">{num(r.cats[c])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
