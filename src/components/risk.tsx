"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { featuresFromSubmission, riskBand, riskTable } from "@/lib/risk";
import { ABC_ID, FEATURE_LABELS, getWorld } from "@/lib/world";
import { Badge, cn } from "./ui";

export function useRisk() {
  const subs = useStore((s) => s.submissions);
  const latest = subs.find((x) => x.institutionId === ABC_ID);
  const key = latest ? `${latest.id}:${latest.round}` : "none";
  return useMemo(() => riskTable(latest ? featuresFromSubmission(latest) : null), [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function RiskBadge({ score }: { score: number | null }) {
  const b = riskBand(score);
  return <Badge tone={b.tone}>{score === null ? "No data" : `${score.toFixed(2)} · ${b.label}`}</Badge>;
}

export function RiskBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[12px] text-muted">Awaiting submission</span>;
  const b = riskBand(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full", b.tone === "red" ? "bg-red-600" : b.tone === "amber" ? "bg-amber-500" : "bg-slate-400")} style={{ width: `${score * 100}%` }} />
      </div>
      <span className={cn("num text-[13px] font-semibold", b.tone === "red" ? "text-red-700" : b.tone === "amber" ? "text-amber-700" : "text-ink")}>{score.toFixed(2)}</span>
    </div>
  );
}

export function RiskExplain({ institutionId }: { institutionId: string }) {
  const { rows, medians } = useRisk();
  const row = rows.find((r) => r.institutionId === institutionId);
  const inst = getWorld().byId[institutionId];
  if (!row || !row.features) return <p className="text-[13px] text-muted">No submission yet, so no score.</p>;
  const f = row.features;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] text-muted">Rank {rows.findIndex((r) => r.institutionId === institutionId) + 1} of {rows.filter((r) => r.score !== null).length} · {inst.state}</div>
        <RiskBadge score={row.score} />
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="pb-1.5 font-medium">Signal</th>
            <th className="pb-1.5 text-right font-medium">This institution</th>
            <th className="pb-1.5 text-right font-medium">National median</th>
            <th className="w-28 pb-1.5" />
          </tr>
        </thead>
        <tbody>
          {FEATURE_LABELS.map((label, k) => {
            const ratio = medians[k] > 0 ? f[k] / medians[k] : f[k] > 0 ? 10 : 1;
            const high = ratio >= 3 && f[k] > 0.5;
            return (
              <tr key={label} className="border-t border-line">
                <td className="py-1.5">{label}</td>
                <td className={cn("num py-1.5 text-right font-medium", high ? "text-red-700" : "text-ink")}>{f[k].toFixed(1)}%</td>
                <td className="num py-1.5 text-right text-muted">{medians[k].toFixed(1)}%</td>
                <td className="py-1.5 pl-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={cn("h-full", high ? "bg-red-600" : "bg-slate-400")} style={{ width: `${Math.min(100, (ratio / 10) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        Score from an Isolation Forest trained on all institutions this cycle. It only orders the queue; it is not evidence and never
        triggers action by itself.
      </p>
    </div>
  );
}
