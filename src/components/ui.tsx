"use client";

import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 border border-brand-700",
  secondary: "bg-white text-ink border border-slate-300 hover:bg-slate-50",
  ghost: "text-brand-700 hover:bg-brand-50 border border-transparent",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
  success: "bg-emerald-700 text-white border border-emerald-700 hover:bg-emerald-800",
};

export function Button({
  variant = "primary", size = "md", className, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-sm",
        VARIANT[variant],
        className,
      )}
    />
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-sm",
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border border-line bg-white", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-3.5", className)}>
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export type Tone = "neutral" | "green" | "amber" | "red" | "blue";
const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-medium ring-1 ring-inset", TONE[tone], className)}>{children}</span>;
}

export function Dot({ tone }: { tone: Tone }) {
  const c = { neutral: "bg-slate-400", green: "bg-emerald-600", amber: "bg-amber-500", red: "bg-red-600", blue: "bg-brand-600" }[tone];
  return <span className={cn("inline-block h-2 w-2 rounded-full", c)} />;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  const color = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-ink";
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("num mt-1 text-2xl font-semibold", color)}>{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions, crumb }: { title: string; subtitle?: ReactNode; actions?: ReactNode; crumb?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {crumb && <div className="mb-1 text-[13px] text-muted">{crumb}</div>}
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[13.5px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const width = (className?: string) => (className && /(^|\s)(w-|max-w-)/.test(className) ? "" : "w-full");

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(inputCls, width(className), "h-9", className)} />;
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cn(inputCls, width(className), "h-9 pr-8", className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(inputCls, width(className), "py-2", className)} />;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="flex gap-1 border-b border-line">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[13.5px] font-medium transition-colors",
            value === it.value ? "border-brand-700 text-brand-700" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span className={cn("num rounded px-1.5 text-[11.5px]", value === it.value ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600")}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div className={cn("fade-in w-full rounded-lg bg-white shadow-xl", width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-slate-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      {body && <p className="mt-1 max-w-md text-[13.5px] text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "red" | "green" | "amber" }) {
  const c = { brand: "bg-brand-600", red: "bg-red-600", green: "bg-emerald-600", amber: "bg-amber-500" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full transition-all", c)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function KeyValue({ items, cols = 2 }: { items: [string, ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[12px] text-muted">{k}</dt>
          <dd className="mt-0.5 text-[13.5px] font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
