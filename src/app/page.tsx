"use client";

import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck, ShieldCheck, UserRound } from "lucide-react";
import { TopBar } from "@/components/app-shell";
import { Card, cn } from "@/components/ui";
import { useStore } from "@/lib/store";
import { ACADEMIC_YEAR, getWorld } from "@/lib/world";
import { fmtDateTime, num } from "@/lib/format";

const ROLES = [
  {
    href: "/institution", icon: Building2, title: "Institution",
    who: "ABC Institute of Technology, Pune",
    body: "Upload the admitted-student list once per cycle, see row-level errors in seconds, fix them and resubmit.",
  },
  {
    href: "/aicte", icon: ShieldCheck, title: "AICTE officer",
    who: "Western Regional Office",
    body: "National view of admissions, risk-ranked review queue with evidence, and decisions recorded in the audit trail.",
  },
  {
    href: "/student", icon: UserRound, title: "Student",
    who: "Ananya Sharma, B.Tech CSE",
    body: "See your verified record, approve or refuse each sharing request by OTP, and ask for corrections.",
  },
  {
    href: "/verifier", icon: ClipboardCheck, title: "Employer / verifier",
    who: "Infosys Ltd., Campus Hiring",
    body: "Request a student's record with a stated purpose, then scan the signed QR to verify it in seconds.",
  },
];

const FLOW = [
  ["Upload", "College uploads its student list (Excel or ERP API), e-signed by the Head."],
  ["Verify", "Each APAAR ID is checked against the registry; names are matched with Indian spelling variants."],
  ["Check seats", "Admissions are counted against approved intake, with TFW, PMSSS and FN seats kept separate."],
  ["Review", "Clear rows enter the register. Fixable rows go back to the college; serious ones go to an AICTE officer."],
  ["Share", "The student approves each request by OTP; the verifier scans a signed QR and gets an answer instantly."],
];

const CYCLE: [string, string, string][] = [
  ["Admissions close", "30 Sep 2026", "Closed"],
  ["Enrolment upload window", "1 Oct – 15 Nov 2026", "Open"],
  ["Corrections by institutions", "Until 30 Nov 2026", "Open"],
  ["AICTE review of flagged cases", "Until 15 Dec 2026", "Upcoming"],
];

export default function Home() {
  const w = getWorld();
  const register = useStore((s) => s.register);
  const audit = useStore((s) => s.audit);
  const baseline = w.institutions.reduce((s, i) => s + i.verified, 0);

  return (
    <div className="min-h-screen">
      <TopBar />
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="text-[13px] font-medium text-brand-700">All India Council for Technical Education · Academic year {ACADEMIC_YEAR}</div>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-ink">
              A verified record of every student in every AICTE-approved institution.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              APAAR-Setu replaces enrolment totals with a student-by-student register keyed on the APAAR ID. Over-admission,
              students enrolled in two colleges and IDs that do not exist are caught on the day of upload, and every student
              controls who sees their record.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/institution" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-700 px-5 text-sm font-medium text-white hover:bg-brand-800">
                Institution login <ArrowRight size={16} />
              </Link>
              <Link href="/aicte" className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-ink hover:bg-slate-50">
                AICTE officer login
              </Link>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-5">
              <div>
                <dt className="text-[12px] text-muted">Institutions reporting</dt>
                <dd className="num mt-0.5 text-xl font-semibold">{w.institutions.length}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Verified records</dt>
                <dd className="num mt-0.5 text-xl font-semibold">{num(baseline + Object.keys(register).length)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Time to verify a student</dt>
                <dd className="mt-0.5 text-xl font-semibold">Seconds</dd>
              </div>
            </dl>
          </div>

          <Card className="self-start">
            <div className="border-b border-line px-5 py-3.5">
              <div className="text-[15px] font-semibold">Admission cycle {ACADEMIC_YEAR}</div>
              <div className="text-[12.5px] text-muted">Key dates from the AICTE academic calendar</div>
            </div>
            <ul className="divide-y divide-line">
              {CYCLE.map(([label, date, state]) => (
                <li key={label} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13.5px]">
                  <span className="text-ink">{label}</span>
                  <span className="flex items-center gap-2">
                    <span className="num text-muted">{date}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset",
                      state === "Open" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : state === "Closed" ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-brand-50 text-brand-700 ring-brand-100")}>{state}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 pb-1 pt-3 text-[12px] font-medium uppercase tracking-wide text-muted">Latest activity</div>
            <ul className="px-5 pb-3">
              {audit.slice(-4).reverse().map((e) => (
                <li key={e.seq} className="flex justify-between gap-3 py-1.5 text-[13px]">
                  <span className="min-w-0 truncate text-slate-700">{e.action}</span>
                  <span className="shrink-0 text-muted">{fmtDateTime(e.ts)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Sign in as</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href} className="group rounded-lg border border-line bg-white p-5 transition-colors hover:border-brand-200">
              <r.icon size={20} className="text-brand-700" />
              <div className="mt-3 text-[15px] font-semibold text-ink">{r.title}</div>
              <div className="text-[12.5px] text-muted">{r.who}</div>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{r.body}</p>
              <div className="mt-4 flex items-center gap-1 text-[13px] font-medium text-brand-700">
                Open portal <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>

        <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-wide text-muted">How it works</h2>
        <div className="mt-3 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-5">
          {FLOW.map(([t, b], i) => (
            <div key={t} className={cn("p-5", i > 0 && "border-t border-line md:border-l md:border-t-0")}>
              <div className="num text-[12px] font-semibold text-muted">Step {i + 1}</div>
              <div className="mt-1 text-[14.5px] font-semibold text-ink">{t}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{b}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[12.5px] text-muted">
          Safeguard: every flag is advisory. AICTE officers take all regulatory decisions, and student data is shared only with consent,
          in line with the DPDP Act 2023.
        </p>
      </section>
    </div>
  );
}
