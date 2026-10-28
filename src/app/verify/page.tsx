"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/app-shell";
import { VerifyResultCard } from "@/components/verify-result";
import { Card, Empty } from "@/components/ui";
import { useStore } from "@/lib/store";
import { verifyToken } from "@/lib/verify";

function VerifyInner() {
  const token = useSearchParams().get("t") ?? "";
  const consents = useStore((s) => s.consents);
  const register = useStore((s) => s.register);
  const record = useStore((s) => s.recordVerification);
  const result = useMemo(() => (token ? verifyToken(token, consents, register) : null), [token, consents, register]);
  const logged = useRef("");
  useEffect(() => {
    if (!result || logged.current === token) return;
    logged.current = token;
    record({ consentId: result.payload?.cid, valid: result.verdict === "valid", summary: `${result.headline} (public link)`, ms: result.ms });
  }, [result, token, record]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Student record verification</h1>
        <p className="mt-1 text-[13.5px] text-muted">This page checks the AICTE signature on a student record shared through APAAR-Setu, and whether the student&apos;s consent is still active.</p>
      </div>
      {result ? <VerifyResultCard result={result} /> : (
        <Card><Empty title="No QR data" body="Open this page by scanning a student's APAAR-Setu QR code." action={<Link className="text-[13px] font-medium text-brand-700 hover:underline" href="/verifier?tab=scan">Go to the verifier portal</Link>} /></Card>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Suspense>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
