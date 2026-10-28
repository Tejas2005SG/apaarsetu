"use client";

import { CheckCircle2, AlertTriangle, Info, MessageSquareText, XCircle, X } from "lucide-react";
import { useToasts } from "@/lib/toast";
import { cn } from "./ui";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-[340px] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "warning" ? AlertTriangle : t.tone === "error" ? XCircle : t.tone === "sms" ? MessageSquareText : Info;
        const color = t.tone === "success" ? "text-emerald-700" : t.tone === "warning" ? "text-amber-700" : t.tone === "error" ? "text-red-700" : "text-brand-700";
        return (
          <div key={t.id} className={cn("fade-in pointer-events-auto flex gap-3 rounded-lg border bg-white p-3 shadow-lg", t.tone === "sms" ? "border-brand-200" : "border-line")}>
            <Icon size={18} className={cn("mt-0.5 shrink-0", color)} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{t.title}</div>
              {t.body && <div className={cn("mt-0.5 text-[12.5px] text-muted", t.tone === "sms" && "font-mono text-ink")}>{t.body}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="h-fit rounded p-0.5 text-slate-400 hover:text-ink" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
