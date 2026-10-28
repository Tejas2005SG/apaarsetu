"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FlaskConical, ImageUp, Send, Timer } from "lucide-react";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, PageHeader, Select, Tabs, Textarea } from "@/components/ui";
import { CameraScanner, decodeQrFile } from "@/components/qr";
import { VerifyResultCard } from "@/components/verify-result";
import { useStore } from "@/lib/store";
import { getWorld, VERIFIER_ORG } from "@/lib/world";
import { digitsOnly, fmtApaar, fmtDateTime, maskApaar } from "@/lib/format";
import { extractToken, tamperToken } from "@/lib/crypto";
import { verifyToken, type VerifyResult } from "@/lib/verify";
import { toast } from "@/lib/toast";
import type { ShareField } from "@/lib/types";

type TabKey = "request" | "requests" | "scan";
const FIELDS: [ShareField, string][] = [["name", "Name"], ["institution", "Institution"], ["programme", "Programme"], ["status", "Enrolment status"], ["admissionYear", "Academic year"], ["dob", "Date of birth"]];
const SHORTLIST = () => {
  const rows = getWorld().sampleRows;
  return [rows[0], rows[1], rows[3], rows[6]].map((r) => ({ apaarId: r.apaarId, name: r.name }));
};
const PURPOSES = ["Employment verification (campus hiring)", "Scholarship disbursement", "Admission to higher studies", "Background check"];

function VerifierInner() {
  const params = useSearchParams();
  const s = useStore();
  const [tab, setTab] = useState<TabKey>((params.get("tab") as TabKey) || "request");
  const [apaar, setApaar] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [fields, setFields] = useState<ShareField[]>(["name", "institution", "programme", "status"]);
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [lastToken, setLastToken] = useState("");
  const [method, setMethod] = useState<"upload" | "camera" | "paste">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const mine = s.consents.filter((c) => c.verifierOrg === VERIFIER_ORG);

  const send = () => {
    if (digitsOnly(apaar).length !== 12) return setErr("Enter the student's 12-digit APAAR ID.");
    if (!fields.length) return setErr("Choose at least one field.");
    setErr("");
    s.requestConsent({ verifierOrg: VERIFIER_ORG, verifierType: "Employer", apaarId: digitsOnly(apaar), purpose, fields });
    toast({ tone: "success", title: "Request sent to the student", body: "They will approve or decline it in their APAAR / DigiLocker app." });
    setApaar("");
    setTab("requests");
  };

  const run = (raw: string, tampered = false) => {
    const token = extractToken(raw);
    const r = verifyToken(token, s.consents, s.register);
    setResult(r);
    setLastToken(tampered ? "" : token);
    const consentId = r.payload?.cid;
    s.recordVerification({ consentId, valid: r.verdict === "valid", summary: r.headline + (tampered ? " (altered QR)" : ""), ms: r.ms });
    setTab("scan");
  };

  const onFile = async (f: File) => {
    const text = await decodeQrFile(f);
    if (!text) {
      toast({ tone: "error", title: "No QR code found", body: "Use a clear image of the student's APAAR-Setu QR." });
      return;
    }
    run(text);
  };

  return (
    <>
      <PageHeader title="Verify a student" subtitle={`Signed in as ${VERIFIER_ORG}. You can only see what a student agrees to share, for the time they allow.`} />
      <Tabs<TabKey> value={tab} onChange={setTab} items={[
        { value: "request", label: "New request" },
        { value: "requests", label: "My requests", count: mine.length },
        { value: "scan", label: "Scan QR" },
      ]} />
      <div className="mt-5">
        {tab === "request" && (
          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader title="Ask a student to share their record" />
              <div className="space-y-4 p-5">
                <Field label="Pick from your campus shortlist">
                  <Select value="" onChange={(e) => e.target.value && setApaar(fmtApaar(e.target.value))} className="max-w-md">
                    <option value="">Select a candidate</option>
                    {SHORTLIST().map((p) => <option key={p.apaarId} value={p.apaarId}>{p.name} · ABC Institute of Technology · B.Tech CSE</option>)}
                  </Select>
                </Field>
                <Field label="Student's APAAR ID" hint="Or type the ID the candidate gave you.">
                  <Input value={apaar} onChange={(e) => setApaar(e.target.value)} placeholder="0000 0000 0000" className="num max-w-xs font-mono tracking-wider" />
                </Field>
                <Field label="Purpose" hint="Shown to the student and recorded in the audit trail.">
                  <Select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="max-w-md">{PURPOSES.map((p) => <option key={p}>{p}</option>)}</Select>
                </Field>
                <div>
                  <div className="mb-1.5 text-[13px] font-medium">Fields requested</div>
                  <div className="grid max-w-md grid-cols-2 gap-2">
                    {FIELDS.map(([f, l]) => (
                      <label key={f} className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                        <input type="checkbox" className="h-4 w-4 accent-[#1f3864]" checked={fields.includes(f)} onChange={(e) => setFields(e.target.checked ? [...fields, f] : fields.filter((x) => x !== f))} />
                        {l}
                      </label>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[12px] text-muted">Ask only for what you need. Students can untick fields before approving.</div>
                </div>
                {err && <div className="text-[13px] text-red-700">{err}</div>}
                <Button onClick={send}><Send size={15} /> Send request</Button>
              </div>
            </Card>
            <Card>
              <CardHeader title="Today vs APAAR-Setu" />
              <div className="space-y-4 p-5 text-[13px]">
                <div>
                  <div className="mb-1 font-medium text-ink">Today</div>
                  <ol className="list-inside list-decimal space-y-0.5 text-slate-600">
                    <li>Write to the college</li><li>College searches its files</li><li>Reply by letter or email</li>
                  </ol>
                  <div className="mt-1.5 flex items-center gap-1.5 text-red-700"><Timer size={14} /> Often days or weeks</div>
                </div>
                <div className="border-t border-line pt-4">
                  <div className="mb-1 font-medium text-ink">With APAAR-Setu</div>
                  <ol className="list-inside list-decimal space-y-0.5 text-slate-600">
                    <li>Student approves your request by OTP</li><li>You scan the QR</li><li>Signature and live status are checked</li>
                  </ol>
                  <div className="mt-1.5 flex items-center gap-1.5 text-emerald-700"><Timer size={14} /> In seconds</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === "requests" && (
          <Card>
            {mine.length === 0 ? <Empty title="No requests yet" body="Requests you send appear here with their status." action={<Button variant="secondary" onClick={() => setTab("request")}>New request</Button>} /> : (
              <table className="table-base">
                <thead><tr><th>Request</th><th>Student</th><th>Purpose</th><th>Sent</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {mine.map((c) => (
                    <tr key={c.id}>
                      <td className="num font-mono text-[12.5px]">{c.id}</td>
                      <td>
                        <div className="num font-mono text-[12.5px]">{maskApaar(c.apaarId)}</div>
                        {c.status === "approved" && s.register[c.apaarId] && <div className="text-[12px] text-muted">{s.register[c.apaarId].name}</div>}
                      </td>
                      <td className="text-[13px]">{c.purpose}</td>
                      <td className="whitespace-nowrap text-[13px] text-muted">{fmtDateTime(c.createdAt)}</td>
                      <td>
                        {c.status === "pending" ? <Badge tone="amber">Waiting for student</Badge> : c.status === "approved" ? <Badge tone="green">Approved</Badge> : c.status === "declined" ? <Badge tone="red">Declined</Badge> : <Badge>Revoked</Badge>}
                      </td>
                      <td className="text-right">
                        {(c.status === "approved" || c.status === "revoked") && c.token && <Button size="sm" onClick={() => run(c.token!)}>Verify QR</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {tab === "scan" && (
          <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader title="Scan the student's QR" subtitle="Upload an image, use the camera, or paste the verification link" />
              <div className="p-5">
                <div className="mb-4 inline-flex rounded-md border border-line p-0.5">
                  {(["upload", "camera", "paste"] as const).map((m) => (
                    <button key={m} onClick={() => setMethod(m)} className={`rounded px-3 py-1.5 text-[13px] ${method === m ? "bg-brand-700 text-white" : "text-muted hover:text-ink"}`}>
                      {m === "upload" ? "Upload image" : m === "camera" ? "Camera" : "Paste link"}
                    </button>
                  ))}
                </div>
                {method === "upload" && (
                  <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-brand-200 hover:bg-slate-50">
                    <ImageUp size={26} className="text-slate-400" />
                    <div className="mt-2 text-[13.5px] font-medium">Choose a QR image</div>
                    <div className="text-[12px] text-muted">The student can download it from Active shares</div>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
                  </div>
                )}
                {method === "camera" && <CameraScanner onResult={(t) => run(t)} />}
                {method === "paste" && (
                  <div className="space-y-3">
                    <Textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="https://…/verify?t=…" className="font-mono text-[12px]" />
                    <Button disabled={!paste.trim()} onClick={() => run(paste)}>Verify</Button>
                  </div>
                )}
                {mine.some((c) => c.status === "approved" && c.token) && (
                  <div className="mt-5 border-t border-line pt-4">
                    <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Shared with you</div>
                    <ul className="space-y-2">
                      {mine.filter((c) => c.status === "approved" && c.token).map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-[13px]">
                          <span>
                            <span className="block font-medium text-ink">{s.register[c.apaarId]?.name ?? maskApaar(c.apaarId)}</span>
                            <span className="block text-[12px] text-muted">{c.purpose} · QR received {fmtDateTime(c.decidedAt)}</span>
                          </span>
                          <Button size="sm" onClick={() => run(c.token!)}>Verify</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
            <div>
              {result ? (
                <>
                  <VerifyResultCard result={result} />
                  {lastToken && result.verdict === "valid" && (
                    <div className="mt-3 flex items-center justify-between rounded-md border border-line bg-white px-4 py-3 text-[13px]">
                      <span className="text-muted">What if someone edits the QR, for example to change the programme?</span>
                      <Button size="sm" variant="secondary" onClick={() => run(tamperToken(lastToken), true)}><FlaskConical size={14} /> Try an altered copy</Button>
                    </div>
                  )}
                </>
              ) : (
                <Card><Empty title="Waiting for a QR" body="The result appears here: whether the signature is valid, whether consent is still live, and exactly what the student shared." /></Card>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Keyed() {
  const tab = useSearchParams().get("tab") ?? "";
  return <VerifierInner key={tab} />;
}

export default function VerifierPage() {
  return (
    <Suspense>
      <Keyed />
    </Suspense>
  );
}
