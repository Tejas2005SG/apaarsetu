"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Modal } from "./ui";
import { sendOtp } from "@/lib/toast";

export function OtpInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);
  const set = (i: number, ch: string) => {
    const arr = value.padEnd(6, " ").split("");
    arr[i] = ch || " ";
    onChange(arr.join("").replace(/\s+$/, ""));
  };
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={value[i]?.trim() ?? ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, d);
            if (d) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]?.trim()) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (d) {
              e.preventDefault();
              onChange(d);
              refs.current[Math.min(d.length, 5)]?.focus();
            }
          }}
          className="num h-11 w-10 rounded-md border border-slate-300 text-center text-lg font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      ))}
    </div>
  );
}

export function OtpDialog({
  open, onClose, onVerified, title, to, description, confirmLabel = "Verify and continue",
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  title: string;
  to: string;
  description?: ReactNode;
  confirmLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const issued = useRef(false);
  useEffect(() => {
    if (!open) {
      issued.current = false;
      return;
    }
    if (issued.current) return;
    issued.current = true;
    setCode("");
    setError("");
    setSent(sendOtp(to));
  }, [open, to]);

  const verify = () => {
    if (code.length !== 6) return setError("Enter all 6 digits.");
    if (code !== sent) return setError("That code is not correct. Check the SMS and try again.");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onVerified();
    }, 450);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={verify} disabled={busy}>{busy ? "Verifying…" : confirmLabel}</Button>
        </>
      }
    >
      {description && <div className="mb-4 text-[13.5px] text-muted">{description}</div>}
      <div className="mb-2 text-[13px] text-ink">Enter the 6-digit code sent to <span className="font-medium">{to}</span></div>
      <OtpInput value={code} onChange={(v) => { setCode(v); setError(""); }} autoFocus />
      {error && <div className="mt-2 text-[13px] text-red-700">{error}</div>}
      <div className="mt-3 flex items-center gap-3 text-[12.5px]">
        <button className="text-brand-700 hover:underline" onClick={() => setSent(sendOtp(to))}>Resend code</button>
        <span className="text-slate-300">|</span>
        <button className="text-muted hover:text-ink" onClick={() => setCode(sent)}>Autofill from SMS</button>
      </div>
    </Modal>
  );
}
