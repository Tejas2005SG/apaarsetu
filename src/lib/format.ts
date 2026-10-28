const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

export function fmtApaar(id: string) {
  const d = digitsOnly(id);
  if (d.length !== 12) return id;
  return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
}

export function maskApaar(id: string) {
  const d = digitsOnly(id);
  if (d.length < 4) return id;
  return `XXXX XXXX ${d.slice(-4)}`;
}

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}, ${hh}:${mm}`;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const num = (n: number) => n.toLocaleString("en-IN");

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export function isoDate(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return isoDate(raw);
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (r) {
    [y, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  } else {
    r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
    if (!r) return null;
    [d, m, y] = [Number(r[1]), Number(r[2]), Number(r[3])];
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
