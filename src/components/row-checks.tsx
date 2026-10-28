"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { RowResult } from "@/lib/types";
import { RULE_LABEL } from "@/lib/validate";
import { fmtApaar, fmtDate } from "@/lib/format";
import { Badge, KeyValue, Modal } from "./ui";

export function statusBadge(status: RowResult["status"]) {
  if (status === "accepted") return <Badge tone="green">Accepted</Badge>;
  if (status === "fix") return <Badge tone="amber">To fix</Badge>;
  return <Badge tone="red">AICTE review</Badge>;
}

export function RowChecksModal({ result, onClose }: { result: RowResult | null; onClose: () => void }) {
  return (
    <Modal open={!!result} onClose={onClose} title={result ? `Row ${result.row.rowNo} · ${result.row.name || "Unnamed"}` : ""} width="max-w-2xl">
      {result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <KeyValue
              cols={3}
              items={[
                ["APAAR ID", <span key="a" className="num font-mono">{fmtApaar(result.row.apaarId) || "—"}</span>],
                ["Date of birth", result.row.dob ? fmtDate(result.row.dob) : "—"],
                ["Quota", result.row.quota || "—"],
              ]}
            />
            {statusBadge(result.status)}
          </div>
          {result.registryName && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-[13px]">
              Name on APAAR record: <b>{result.registryName}</b>
              {result.matchScore !== undefined && <span className="num ml-2 text-muted">match score {result.matchScore.toFixed(2)}</span>}
              {result.matchNote && <span className="ml-2"><Badge tone="blue">{result.matchNote}</Badge></span>}
            </div>
          )}
          <div className="overflow-hidden rounded-md border border-line">
            <table className="table-base text-[13px]">
              <thead><tr><th className="w-40">Check</th><th>Result</th></tr></thead>
              <tbody>
                {result.checks.map((c) => (
                  <tr key={c.rule}>
                    <td className="font-medium">{RULE_LABEL[c.rule]}</td>
                    <td>
                      <span className="flex items-start gap-2">
                        {c.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : c.severity === "fix" ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-red-600" />}
                        <span className={c.ok ? "text-slate-700" : "text-ink"}>{c.message}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-muted">
            Fixable issues come back to the institution. Issues that need judgement go to an AICTE officer with the evidence above; the system never takes the decision itself.
          </p>
        </div>
      )}
    </Modal>
  );
}
