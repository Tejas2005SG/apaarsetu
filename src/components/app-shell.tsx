"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, Building2, ChevronDown, ClipboardCheck, FileSpreadsheet, FileText, Gavel, LayoutDashboard, Library,
  ScanLine, ScrollText, ShieldCheck, UploadCloud, UserRound,
} from "lucide-react";
import { allCases, caseStatus, useStore } from "@/lib/store";
import { ABC_ID, getWorld, OFFICER, PRINCIPAL, VERIFIER_ORG } from "@/lib/world";
import { cn } from "./ui";

export type RoleKey = "institution" | "aicte" | "student" | "verifier";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  count?: number;
  exact?: boolean;
}

function useNav(role: RoleKey): NavItem[] {
  const s = useStore();
  const openCases = allCases(s.liveCases).filter((c) => caseStatus(c, s.decisions) === "open").length;
  const pendingCorrections = s.corrections.filter((c) => c.status === "pending").length;
  const newNotices = s.notices.filter((n) => n.institutionId === ABC_ID && !n.acknowledged).length;
  switch (role) {
    case "institution":
      return [
        { href: "/institution", label: "Overview", icon: <LayoutDashboard size={16} />, exact: true },
        { href: "/institution/submit", label: "New submission", icon: <UploadCloud size={16} /> },
        { href: "/institution/report", label: "Validation reports", icon: <FileSpreadsheet size={16} /> },
        { href: "/institution/requests", label: "Requests & notices", icon: <Bell size={16} />, count: pendingCorrections + newNotices || undefined },
      ];
    case "aicte":
      return [
        { href: "/aicte", label: "National dashboard", icon: <LayoutDashboard size={16} />, exact: true },
        { href: "/aicte/cases", label: "Review queue", icon: <Gavel size={16} />, count: openCases },
        { href: "/aicte/register", label: "National register", icon: <Library size={16} /> },
        { href: "/aicte/reports", label: "Policy reports", icon: <BarChart3 size={16} /> },
        { href: "/aicte/audit", label: "Audit trail", icon: <ScrollText size={16} /> },
      ];
    case "student":
      return [{ href: "/student", label: "Record & sharing", icon: <UserRound size={16} /> }];
    case "verifier":
      return [
        { href: "/verifier", label: "Verify a student", icon: <ScanLine size={16} />, exact: true },
      ];
  }
}

const PERSONAS: { role: RoleKey; label: string; who: string; href: string; icon: ReactNode }[] = [
  { role: "institution", label: "Institution", who: PRINCIPAL, href: "/institution", icon: <Building2 size={16} /> },
  { role: "aicte", label: "AICTE officer", who: OFFICER, href: "/aicte", icon: <ShieldCheck size={16} /> },
  { role: "student", label: "Student", who: "Ananya Sharma · B.Tech CSE", href: "/student", icon: <UserRound size={16} /> },
  { role: "verifier", label: "Employer / verifier", who: VERIFIER_ORG, href: "/verifier", icon: <ClipboardCheck size={16} /> },
];

export function RoleSwitcher({ role }: { role?: RoleKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = PERSONAS.find((p) => p.role === role);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-[13px] text-white hover:bg-white/10">
        {current ? current.icon : <UserRound size={16} />}
        <span className="hidden sm:inline">{current ? current.label : "Sign in"}</span>
        <ChevronDown size={14} className="opacity-70" />
      </button>
      {open && (
        <div className="fade-in absolute right-0 top-11 z-50 w-80 rounded-lg border border-line bg-white p-1.5 shadow-xl">
          <div className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-medium uppercase tracking-wide text-muted">Switch account</div>
          {PERSONAS.map((p) => (
            <Link
              key={p.role}
              href={p.href}
              onClick={() => setOpen(false)}
              className={cn("flex items-start gap-3 rounded-md px-2.5 py-2 hover:bg-slate-50", p.role === role && "bg-brand-50")}
            >
              <span className="mt-0.5 text-brand-700">{p.icon}</span>
              <span>
                <span className="block text-[13.5px] font-medium text-ink">{p.label}</span>
                <span className="block text-[12px] text-muted">{p.who}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar({ role }: { role?: RoleKey }) {
  return (
    <>
      <div className="bg-brand-900 text-[11.5px] text-slate-300">
        <div className="mx-auto flex h-7 max-w-[1440px] items-center justify-between px-5">
          <span>Government of India · Ministry of Education</span>
          <span className="hidden md:inline">All India Council for Technical Education</span>
        </div>
      </div>
      <header className="bg-brand-700 text-white">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-white/30 text-[13px] font-bold tracking-tight">AS</span>
            <span>
              <span className="block text-[15px] font-semibold leading-tight">APAAR-Setu</span>
              <span className="block text-[11.5px] leading-tight text-slate-300">Verified student register for AICTE institutions</span>
            </span>
          </Link>
          <RoleSwitcher role={role} />
        </div>
      </header>
    </>
  );
}

export function AppShell({ role, children }: { role: RoleKey; children: ReactNode }) {
  const nav = useNav(role);
  const path = usePathname();
  const persona = PERSONAS.find((p) => p.role === role)!;
  const w = getWorld();
  const context =
    role === "institution" ? `${w.byId[ABC_ID].name}, ${w.byId[ABC_ID].city} · AICTE ID ${w.byId[ABC_ID].aicteId}`
      : role === "aicte" ? "Western Regional Office, Mumbai" : role === "student" ? "DigiLocker / APAAR linked" : "Registered verifier";
  return (
    <div className="min-h-screen">
      <TopBar role={role} />
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-[calc(100vh-84px)] w-60 shrink-0 border-r border-line bg-white md:block">
          <div className="border-b border-line px-4 py-3.5">
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">{persona.label}</div>
            <div className="mt-0.5 text-[13px] font-medium leading-snug text-ink">{persona.who}</div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{context}</div>
          </div>
          <nav className="p-2">
            {nav.map((n) => {
              const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px]",
                    active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className={active ? "text-brand-700" : "text-slate-500"}>{n.icon}</span>
                  <span className="flex-1">{n.label}</span>
                  {!!n.count && <span className="num rounded bg-slate-100 px-1.5 text-[11.5px] font-medium text-slate-700">{n.count}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 w-full border-t border-line p-4 text-[11.5px] leading-relaxed text-muted">
            <FileText size={13} className="mb-1 inline text-slate-400" /> Every action on this portal is recorded in a tamper-evident audit trail.
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-6 pb-24">{children}</main>
      </div>
    </div>
  );
}
