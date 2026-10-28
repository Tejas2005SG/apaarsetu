import Link from "next/link";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 mb-3">
        404 · Page Not Found
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        This page could not be found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        The link you followed may be broken, or the page may have been moved or removed from the APAAR-Setu portal.
      </p>
      <div className="mt-6 flex gap-3">
        <LinkButton href="/">Return to Dashboard</LinkButton>
        <Link
          href="/aicte"
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50 transition-colors"
        >
          AICTE Portal
        </Link>
      </div>
    </div>
  );
}
