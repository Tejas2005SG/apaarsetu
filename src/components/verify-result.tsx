"use client";

import { CheckCircle2, CircleHelp, Clock, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import type { VerifyResult } from "@/lib/verify";
import { PUBLIC_KEY_FINGERPRINT } from "@/lib/crypto";
import { fmtDate } from "@/lib/format";
import { cn } from "./ui";

const LABEL: Record<string, string> = {
  name: "Name", dob: "Date of birth", institution: "Institution", programme: "Programme", admissionYear: "Academic year", status: "Status",
};

export function VerifyResultCard({ result }: { result: VerifyResult }) {
  const good = result.verdict === "valid" || result.verdict === "unknown";
  const tone = result.verdict === "valid" ? "green" : result.verdict === "unknown" ? "blue" : result.verdict === "invalid" ? "red" : "amber";
  const Icon = result.verdict === "valid" ? ShieldCheck : result.verdict === "invalid" ? ShieldAlert : result.verdict === "unknown" ? ShieldCheck : Clock;
  const p = result.payload;
  return (
    <div className="fade-in overflow-hidden rounded-lg border border-line bg-white">
      <div className={cn("flex items-start gap-3 border-b px-5 py-4",
        tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "red" ? "border-red-200 bg-red-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-brand-100 bg-brand-50")}>
        <Icon size={28} className={tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-brand-700"} />
        <div className="flex-1">
          <div className={cn("text-[17px] font-semibold", tone === "green" ? "text-emerald-900" : tone === "red" ? "text-red-900" : tone === "amber" ? "text-amber-900" : "text-brand-800")}>{result.headline}</div>
          <div className="text-[13px] text-slate-700">{result.detail}</div>
        </div>
        <div className="text-right">
          <div className="num text-[13px] font-semibold text-ink">{result.ms} ms</div>
          <div className="text-[11.5px] text-muted">to verify</div>
        </div>
      </div>

      {p && good && (
        <div className="border-b border-line px-5 py-4">
          <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Shared by the student</div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {Object.entries(p.claims).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-muted">{LABEL[k] ?? k}</dt>
                <dd className="text-[14px] font-medium text-ink">{k === "dob" ? fmtDate(v) : v}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[12px] text-muted">APAAR ID</dt>
              <dd className="num font-mono text-[14px] font-medium text-ink">{p.sub}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="px-5 py-4">
        <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Checks</div>
        <ul className="space-y-1.5">
          {result.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-[13px]">
              {c.ok === true ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : c.ok === false ? <XCircle size={15} className="mt-0.5 shrink-0 text-red-600" /> : <CircleHelp size={15} className="mt-0.5 shrink-0 text-slate-400" />}
              <span><span className="font-medium text-ink">{c.label}.</span> <span className="text-slate-600">{c.note}</span></span>
            </li>
          ))}
        </ul>
        {p && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[12px] text-muted">
            <div>Issuer: <span className="text-ink">{p.iss}</span></div>
            <div>Shared with: <span className="text-ink">{p.aud}</span></div>
            <div>Purpose: <span className="text-ink">{p.purpose}</span></div>
            <div>Key: <span className="font-mono text-ink">{PUBLIC_KEY_FINGERPRINT}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
