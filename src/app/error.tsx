"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 mb-3 border border-red-200">
        Something went wrong
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        An unexpected error occurred
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        We encountered an error while loading this page. You can try refreshing or resetting your session.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()}>Try Again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Go to Home
        </Button>
      </div>
    </div>
  );
}
