"use client";

import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "error" | "sms";

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let seq = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.tone === "sms" ? 14000 : 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (t: Omit<Toast, "id">) => useToasts.getState().push(t);

export function sendOtp(to: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  toast({ tone: "sms", title: `SMS to ${to}`, body: `${code} is your APAAR-Setu OTP. Valid for 5 minutes. Do not share it.` });
  return code;
}
