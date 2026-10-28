import { verifyCredential, type CredentialPayload } from "./crypto";
import type { ConsentRequest, RegisterRecord } from "./types";
import { fmtDateTime } from "./format";

export type Verdict = "valid" | "invalid" | "revoked" | "expired" | "outdated" | "unknown";

export interface VerifyResult {
  verdict: Verdict;
  headline: string;
  detail: string;
  payload?: CredentialPayload;
  checks: { label: string; ok: boolean | null; note: string }[];
  ms: number;
}

export function verifyToken(
  token: string,
  consents: ConsentRequest[],
  register: Record<string, RegisterRecord>,
): VerifyResult {
  const t0 = performance.now();
  const sig = verifyCredential(token);
  const checks: VerifyResult["checks"] = [];
  const done = (r: Omit<VerifyResult, "checks" | "ms">): VerifyResult => ({ ...r, checks, ms: Math.max(1, Math.round(performance.now() - t0)) });

  checks.push({ label: "AICTE digital signature (Ed25519)", ok: sig.ok, note: sig.ok ? "Signature matches the AICTE public key" : sig.reason });
  if (!sig.ok) {
    return done({ verdict: "invalid", headline: "Not verified", detail: sig.reason, payload: sig.payload });
  }
  const p = sig.payload;
  const expired = Date.parse(p.exp) < Date.now();
  checks.push({ label: "Validity period", ok: !expired, note: expired ? `Expired on ${fmtDateTime(p.exp)}` : `Valid until ${fmtDateTime(p.exp)}` });

  const consent = consents.find((c) => c.id === p.cid);
  if (!consent) {
    checks.push({ label: "Student consent (live)", ok: null, note: "Live status could not be checked from this device" });
    return done({
      verdict: expired ? "expired" : "unknown",
      headline: expired ? "Expired" : "Signature valid",
      detail: expired ? "Ask the student to share a fresh QR." : "The record is genuine. Live consent status is not available on this device.",
      payload: p,
    });
  }
  const revoked = consent.status === "revoked";
  checks.push({ label: "Student consent (live)", ok: !revoked, note: revoked ? "The student withdrew consent" : `Approved by the student on ${fmtDateTime(consent.decidedAt ?? consent.createdAt)}` });

  const rec = register[consent.apaarId];
  const current = !!rec && rec.version === p.rv;
  checks.push({ label: "Record status in national register", ok: current, note: !rec ? "Record no longer in the register" : current ? "Active and unchanged since this QR was issued" : "Record was corrected after this QR was issued" });

  if (revoked) return done({ verdict: "revoked", headline: "Consent withdrawn", detail: "The student has revoked this share. The QR no longer works.", payload: p });
  if (expired) return done({ verdict: "expired", headline: "Expired", detail: "This QR is past its validity period. Ask the student to share again.", payload: p });
  if (!current) return done({ verdict: "outdated", headline: "Record updated", detail: "The student's record changed after this QR was issued. Ask for a fresh share.", payload: p });
  return done({ verdict: "valid", headline: "Signature valid · Record verified", detail: "Issued by AICTE through APAAR-Setu and shared with the student's consent.", payload: p });
}
