import nacl from "tweetnacl";

const enc = new TextEncoder();
const dec = new TextDecoder();

export const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function sha512Hex(text: string) {
  return hex(nacl.hash(enc.encode(text)));
}

const seed = nacl.hash(enc.encode("APAAR-Setu prototype signing key v1")).slice(0, 32);
const keys = nacl.sign.keyPair.fromSeed(seed);

export const PUBLIC_KEY_FINGERPRINT = hex(nacl.hash(keys.publicKey))
  .slice(0, 20)
  .toUpperCase()
  .match(/.{4}/g)!
  .join(" ");

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (ch) => ch.charCodeAt(0));
}

export interface CredentialPayload {
  v: 1;
  typ: "APAAR-Setu.StudentRecord";
  cid: string;
  sub: string;
  aud: string;
  purpose: string;
  iss: string;
  iat: string;
  exp: string;
  rv: number;
  claims: Record<string, string>;
}

export function signCredential(payload: CredentialPayload) {
  const body = enc.encode(JSON.stringify(payload));
  const sig = nacl.sign.detached(body, keys.secretKey);
  return `${b64url(body)}.${b64url(sig)}`;
}

export type TokenCheck =
  | { ok: true; payload: CredentialPayload }
  | { ok: false; reason: string; payload?: CredentialPayload };

export function verifyCredential(token: string): TokenCheck {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return { ok: false, reason: "This is not an APAAR-Setu QR code." };
  let body: Uint8Array;
  let sig: Uint8Array;
  try {
    body = fromB64url(parts[0]);
    sig = fromB64url(parts[1]);
  } catch {
    return { ok: false, reason: "The QR code could not be read." };
  }
  let payload: CredentialPayload | undefined;
  try {
    payload = JSON.parse(dec.decode(body));
  } catch {
    return { ok: false, reason: "The QR code content is damaged." };
  }
  if (sig.length !== 64 || !nacl.sign.detached.verify(body, sig, keys.publicKey)) {
    return { ok: false, reason: "Signature does not match. The record was altered or was not issued by AICTE.", payload };
  }
  return { ok: true, payload: payload! };
}

export function tamperToken(token: string) {
  const [body, sig] = token.split(".");
  const payload = JSON.parse(dec.decode(fromB64url(body))) as CredentialPayload;
  const claims = { ...payload.claims };
  if (claims.programme) claims.programme = claims.programme.replace("Computer Science", "Artificial Intelligence");
  else claims.status = "Graduated";
  return `${b64url(enc.encode(JSON.stringify({ ...payload, claims })))}.${sig}`;
}

export function extractToken(text: string) {
  const t = text.trim();
  const m = /[?&]t=([^&\s]+)/.exec(t);
  return m ? decodeURIComponent(m[1]) : t;
}
