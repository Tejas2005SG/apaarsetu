"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Toaster } from "./toaster";

const subscribe = () => () => {};

export function Providers({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) {
    return (
      <div suppressHydrationWarning className="flex min-h-screen items-center justify-center text-[13px] text-muted">
        Loading APAAR-Setu…
      </div>
    );
  }
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
