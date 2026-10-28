"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function ResetPage() {
  const reset = useStore((s) => s.reset);
  const router = useRouter();
  useEffect(() => {
    reset();
    router.replace("/");
  }, [reset, router]);
  return null;
}
