"use client";

import { useState } from "react";
import { Copy, FileWarning, KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, KeyValue, LinkButton, Modal, PageHeader, Select, Tabs, Textarea } from "@/components/ui";
import { OtpDialog } from "@/components/otp";
import { QrImage, verifyUrl } from "@/components/qr";
import { useStore } from "@/lib/store";
import { ACADEMIC_YEAR, getWorld, programmeOf } from "@/lib/world";
import { digitsOnly, fmtApaar, fmtDate, fmtDateTime, maskApaar, timeAgo } from "@/lib/format";
import { PUBLIC_KEY_FINGERPRINT } from "@/lib/crypto";
import { toast } from "@/lib/toast";
import type { Correction, ShareField } from "@/lib/types";

const FIELD_LABEL: Record<ShareField, string> = {
  name: "Name", dob: "Date of birth", institution: "Institution", programme: "Programme", admissionYear: "Academic year", status: "Enrolment status",
};

type TabKey = "record" | "requests" | "shares" | "activity";

function Login() {
  const login = useStore((s) => s.studentLogin);
  const linked = getWorld().linkedStudent.apaarId;
  const [id, setId] = useState("");
  const [otp, setOtp] = useState(false);
  const [err, setErr] = useState("");
  const send = () => {
    if (digitsOnly(id).length !== 12) return setErr("Enter your 12-digit APAAR ID.");
    setErr("");
    setOtp(true);
  };
  return (
    <div className="mx-auto mt-6 max-w-md">
      <Card>
        <CardHeader title="Sign in to your student record" subtitle="Use your APAAR ID. An OTP is sent to the mobile number linked with it." />
        <div className="space-y-4 p-5">
          <Field label="APAAR ID">
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="0000 0000 0000" className="num font-mono tracking-wider" inputMode="numeric" />
          </Field>
          {err && <div className="text-[13px] text-red-700">{err}</div>}
          <Button className="w-full" onClick={send}><Smartphone size={15} /> Send OTP</Button>
          <div className="flex items-center gap-3 text-[12px] text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => { setId(fmtApaar(linked)); setErr(""); setOtp(true); }}>
            Continue with DigiLocker
          </Button>
          <p className="text-center text-[12px] text-muted">Uses the APAAR ID linked to your DigiLocker account.</p>
        </div>
      </Card>
      <OtpDialog
        open={otp}
        onClose={() => setOtp(false)}
        to="+91 98XXX XX731"
        title="Verify it's you"
        onVerified={() => { setOtp(false); login(digitsOnly(id)); toast({ tone: "success", title: "Signed in" }); }}
      />
    </div>
  );
}

export default function StudentPage() {
  const s = useStore();
  const w = getWorld();
  const [tab, setTab] = useState<TabKey | null>(null);
  const [approve, setApprove] = useState<{ id: string; fields: ShareField[]; days: number } | null>(null);
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [corr, setCorr] = useState(false);
  const [cf, setCf] = useState<{ field: Correction["field"]; proposed: string; reason: string }>({ field: "name", proposed: "", reason: "" });
  const [showId, setShowId] = useState(false);

  if (!s.studentSession) {
    return (
      <>
        <PageHeader title="My record" subtitle="Your verified enrolment record, and control over who can see it." />
        <Login />
      </>
    );
  }

  const apaar = s.studentSession;
  const rec = s.register[apaar];
  const mine = s.consents.filter((c) => c.apaarId === apaar);
  const pending = mine.filter((c) => c.status === "pending");
  const approved = mine.filter((c) => c.status === "approved");
  const corrections = s.corrections.filter((c) => c.apaarId === apaar);
  const activeTab: TabKey = tab ?? (pending.length ? "requests" : "record");
  const inst = rec ? w.byId[rec.institutionId] : undefined;
  const prog = rec ? programmeOf(rec.institutionId, rec.programmeCode) : undefined;
  const scans = s.verifications.filter((v) => mine.some((c) => c.id === v.consentId));

  const logout = (
    <Button variant="secondary" size="sm" onClick={() => s.studentLogout()}><LogOut size={14} /> Sign out</Button>
  );

  if (!rec) {
    return (
      <>
        <PageHeader title="My record" actions={logout} />
        <Card>
          <Empty
            icon={<FileWarning size={30} />}
            title="No verified record yet"
            body={<>Your institution has not submitted the {ACADEMIC_YEAR} enrolment list, or your row is still being checked. Signed in as {maskApaar(apaar)}.</>}
          />
        </Card>
      </>
    );
  }

  const submitCorrection = () => {
    if (!cf.proposed.trim() || cf.reason.trim().length < 5) {
      toast({ tone: "warning", title: "Add the correct value and a short reason" });
      return;
    }
    s.requestCorrection({ apaarId: apaar, field: cf.field, proposed: cf.proposed.trim(), reason: cf.reason.trim() });
    setCorr(false);
    setCf({ field: "name", proposed: "", reason: "" });
    toast({ tone: "success", title: "Correction requested", body: `${inst?.name} will review it. You will see the result here.` });
  };

  return (
    <>
      <PageHeader title={`Hello, ${rec.name.split(" ")[0]}`} subtitle="Your verified enrolment record, and control over who can see it." actions={logout} />

      <Tabs<TabKey> value={activeTab} onChange={setTab} items={[
        { value: "record", label: "My record" },
        { value: "requests", label: "Sharing requests", count: pending.length },
        { value: "shares", label: "Active shares", count: approved.length },
        { value: "activity", label: "Activity" },
      ]} />
      <div className="mt-5">
        {activeTab === "record" && (
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <div className="flex items-start justify-between border-b border-line px-5 py-4">
                <div>
                  <div className="text-[12px] font-medium uppercase tracking-wide text-muted">Student enrolment record · {ACADEMIC_YEAR}</div>
                  <div className="mt-1 text-xl font-semibold text-ink">{rec.name}</div>
                </div>
                <Badge tone="green"><ShieldCheck size={13} /> Verified</Badge>
              </div>
              <div className="p-5">
                <KeyValue items={[
                  ["APAAR ID", <span key="i" className="num font-mono">{showId ? fmtApaar(rec.apaarId) : maskApaar(rec.apaarId)} <button className="ml-1 text-[12px] font-normal text-brand-700 hover:underline" onClick={() => setShowId(!showId)}>{showId ? "hide" : "show"}</button></span>],
                  ["Date of birth", fmtDate(rec.dob)],
                  ["Institution", `${inst?.name}, ${inst?.city}`],
                  ["Programme", prog?.name ?? rec.programmeCode],
                  ["Admitted on", fmtDate(rec.admissionDate)],
                  ["Admission quota", rec.quota],
                  ["Gender", rec.gender === "F" ? "Female" : rec.gender === "M" ? "Male" : "Other"],
                  ["Category", rec.category],
                ]} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-slate-50/60 px-5 py-3 text-[12px] text-muted">
                <span>Signed by AICTE · key <span className="font-mono text-ink">{PUBLIC_KEY_FINGERPRINT}</span> · version {rec.version}</span>
                <Button size="sm" variant="secondary" onClick={() => setCorr(true)}>Report a mistake</Button>
              </div>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader title="Who can see this" />
                <div className="space-y-2 p-5 text-[13px] text-slate-700">
                  <p>Only you, your institution and AICTE. Anyone else must ask, and sees only the fields you approve, for as long as you allow.</p>
                  <p className="text-muted">{approved.length ? `${approved.length} active share${approved.length > 1 ? "s" : ""}.` : "No active shares."} {pending.length ? `${pending.length} request${pending.length > 1 ? "s" : ""} waiting for you.` : ""}</p>
                </div>
              </Card>
              <Card>
                <CardHeader title="Correction requests" />
                {corrections.length === 0 ? <div className="px-5 py-4 text-[13px] text-muted">None. If anything above is wrong, use “Report a mistake”.</div> : (
                  <ul className="divide-y divide-line">
                    {corrections.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                        <span>{FIELD_LABEL[c.field as ShareField] ?? c.field}: <b>{c.field === "dob" ? fmtDate(c.proposed) : c.proposed}</b></span>
                        <Badge tone={c.status === "approved" ? "green" : c.status === "rejected" ? "red" : "amber"}>{c.status === "pending" ? "With institution" : c.status === "approved" ? "Corrected" : "Rejected"}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          pending.length === 0 ? (
            <Card><Empty icon={<KeyRound size={28} />} title="No pending requests" body="When an employer, scholarship body or university asks to verify your record, the request appears here." /></Card>
          ) : (
            <div className="space-y-4">
              {pending.map((c) => (
                <Card key={c.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <div className="text-[15px] font-semibold text-ink">{c.verifierOrg}</div>
                      <div className="text-[13px] text-muted">{c.verifierType} · requested {timeAgo(c.createdAt)}</div>
                      <div className="mt-2 text-[13.5px]"><span className="text-muted">Purpose:</span> {c.purpose}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">{c.fields.map((f) => <Badge key={f}>{FIELD_LABEL[f]}</Badge>)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => { s.declineConsent(c.id); toast({ tone: "info", title: "Request declined" }); }}>Decline</Button>
                      <Button onClick={() => setApprove({ id: c.id, fields: [...c.fields], days: 7 })}>Review and approve</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "shares" && (
          approved.length === 0 ? <Card><Empty title="No active shares" body="Approved requests appear here with their QR code. You can revoke any of them at any time." /></Card> : (
            <div className="grid gap-5 lg:grid-cols-2">
              {approved.map((c) => {
                const expired = c.expiresAt && Date.parse(c.expiresAt) < Date.now();
                return (
                  <Card key={c.id}>
                    <CardHeader title={c.verifierOrg} subtitle={`${c.purpose} · valid until ${fmtDateTime(c.expiresAt)}`} action={expired ? <Badge tone="amber">Expired</Badge> : <Badge tone="green">Active</Badge>} />
                    <div className="flex flex-wrap gap-5 p-5">
                      {c.token && <QrImage value={verifyUrl(c.token)} size={200} downloadName={`APAAR-Setu_${c.id}.png`} />}
                      <div className="min-w-[180px] flex-1 space-y-3 text-[13px]">
                        <div>
                          <div className="mb-1 text-[12px] text-muted">Fields shared</div>
                          <div className="flex flex-wrap gap-1.5">{c.sharedFields?.map((f) => <Badge key={f}>{FIELD_LABEL[f]}</Badge>)}</div>
                        </div>
                        <div className="text-muted">Scanned {scans.filter((v) => v.consentId === c.id).length} time(s)</div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(verifyUrl(c.token!)); toast({ tone: "success", title: "Verification link copied" }); }}><Copy size={13} /> Copy link</Button>
                          <Button size="sm" variant="danger" onClick={() => { s.revokeConsent(c.id); toast({ tone: "info", title: "Consent revoked", body: "The QR code stops working immediately." }); }}>Revoke</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {activeTab === "activity" && (
          <Card>
            <CardHeader title="Who accessed your record" subtitle="Every request, approval and scan, from the audit trail" />
            <ul className="divide-y divide-line">
              {s.audit.filter((a) => a.actor === rec.name || mine.some((c) => c.id === a.target) || a.target === maskApaar(apaar)).reverse().map((a) => (
                <li key={a.seq} className="flex justify-between gap-4 px-5 py-2.5 text-[13px]">
                  <span><span className="text-muted">{a.actor}:</span> {a.action}</span>
                  <span className="shrink-0 text-muted">{fmtDateTime(a.ts)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Modal
        open={!!approve}
        onClose={() => setApprove(null)}
        title="Approve sharing"
        footer={<><Button variant="secondary" onClick={() => setApprove(null)}>Cancel</Button><Button disabled={!approve?.fields.length} onClick={() => setOtpFor(approve!.id)}>Approve with OTP</Button></>}
      >
        {approve && (() => {
          const c = mine.find((x) => x.id === approve.id)!;
          return (
            <div className="space-y-4 text-[13.5px]">
              <p><b>{c.verifierOrg}</b> wants to verify your record for <b>{c.purpose.toLowerCase()}</b>. Untick anything you do not want to share.</p>
              <div className="space-y-2 rounded-md border border-line p-3">
                {c.fields.map((f) => (
                  <label key={f} className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-[#1f3864]" checked={approve.fields.includes(f)}
                        onChange={(e) => setApprove({ ...approve, fields: e.target.checked ? [...approve.fields, f] : approve.fields.filter((x) => x !== f) })} />
                      {FIELD_LABEL[f]}
                    </span>
                    <span className="text-muted">
                      {f === "name" ? rec.name : f === "dob" ? fmtDate(rec.dob) : f === "institution" ? inst?.name : f === "programme" ? prog?.name : f === "admissionYear" ? ACADEMIC_YEAR : "Enrolled, verified"}
                    </span>
                  </label>
                ))}
              </div>
              <Field label="Allow access for">
                <Select value={approve.days} onChange={(e) => setApprove({ ...approve, days: Number(e.target.value) })}>
                  <option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option>
                </Select>
              </Field>
              <p className="text-[12px] text-muted">You can revoke this at any time from Active shares. The verifier never sees your full APAAR ID.</p>
            </div>
          );
        })()}
      </Modal>
      <OtpDialog
        open={!!otpFor}
        onClose={() => setOtpFor(null)}
        to="+91 98XXX XX731"
        title="Confirm with OTP"
        description="Your consent is recorded with this OTP, as required under the DPDP Act 2023."
        confirmLabel="Approve sharing"
        onVerified={() => {
          if (approve) s.approveConsent(approve.id, approve.fields, approve.days);
          setOtpFor(null);
          setApprove(null);
          setTab("shares");
          toast({ tone: "success", title: "Sharing approved", body: "A signed QR code has been issued. The verifier can scan it now." });
        }}
      />

      <Modal open={corr} onClose={() => setCorr(false)} title="Report a mistake in your record"
        footer={<><Button variant="secondary" onClick={() => setCorr(false)}>Cancel</Button><Button onClick={submitCorrection}>Send to institution</Button></>}>
        <div className="space-y-4">
          <Field label="What is wrong?">
            <Select value={cf.field} onChange={(e) => setCf({ ...cf, field: e.target.value as Correction["field"], proposed: "" })}>
              <option value="name">Name</option><option value="dob">Date of birth</option><option value="gender">Gender</option><option value="category">Category</option>
            </Select>
          </Field>
          <Field label="Correct value" hint={`Currently: ${cf.field === "dob" ? fmtDate(rec.dob) : String(rec[cf.field])}`}>
            {cf.field === "dob" ? <Input type="date" value={cf.proposed} onChange={(e) => setCf({ ...cf, proposed: e.target.value })} />
              : cf.field === "gender" ? <Select value={cf.proposed} onChange={(e) => setCf({ ...cf, proposed: e.target.value })}><option value="">Select</option><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></Select>
              : cf.field === "category" ? <Select value={cf.proposed} onChange={(e) => setCf({ ...cf, proposed: e.target.value })}><option value="">Select</option>{["GEN", "OBC", "SC", "ST", "EWS"].map((x) => <option key={x}>{x}</option>)}</Select>
              : <Input value={cf.proposed} onChange={(e) => setCf({ ...cf, proposed: e.target.value })} placeholder="As it should appear" />}
          </Field>
          <Field label="Reason">
            <Textarea rows={2} value={cf.reason} onChange={(e) => setCf({ ...cf, reason: e.target.value })} placeholder="For example: spelling differs from my Class 12 marksheet" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
