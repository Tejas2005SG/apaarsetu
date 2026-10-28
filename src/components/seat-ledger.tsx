"use client";

import type { Ledger } from "@/lib/types";
import { cn } from "./ui";

export function SeatLedger({ ledger, compact }: { ledger: Ledger; compact?: boolean }) {
  return (
    <div className="space-y-3.5">
      {ledger.lines.map((l) => {
        const over = Math.max(0, l.admitted - l.limit);
        const scale = Math.max(l.limit, l.admitted, 1);
        const within = Math.min(l.admitted, l.limit);
        const isRegular = l.quota === "Regular";
        return (
          <div key={l.quota}>
            <div className="mb-1 flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-ink">
                {isRegular ? "Regular seats (approved intake)" : `${l.quota} (supernumerary)`}
              </span>
              <span className="num text-muted">
                <span className={cn("font-semibold", over ? "text-red-700" : "text-ink")}>{l.admitted}</span> / {l.limit}
                {over > 0 && <span className="ml-2 font-medium text-red-700">{over} over</span>}
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-sm bg-slate-100">
              <div className="absolute inset-y-0 left-0 bg-brand-600" style={{ width: `${(within / scale) * 100}%` }} />
              {over > 0 && <div className="absolute inset-y-0 bg-red-600" style={{ left: `${(l.limit / scale) * 100}%`, width: `${(over / scale) * 100}%` }} />}
              {l.admitted > l.limit && <div className="absolute inset-y-0 w-px bg-ink" style={{ left: `${(l.limit / scale) * 100}%` }} />}
            </div>
          </div>
        );
      })}
      {!compact && (
        <p className="pt-1 text-[12px] leading-relaxed text-muted">
          Supernumerary seats are allowed beyond approved intake under AICTE rules and are counted separately, so a TFW or PMSSS
          admission is never mistaken for over-admission.
        </p>
      )}
    </div>
  );
}
