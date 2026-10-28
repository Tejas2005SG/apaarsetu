import Papa from "papaparse";
import { parseDate } from "./format";
import type { UploadRow } from "./types";

export const TEMPLATE_HEADERS = ["APAAR ID", "Student Name", "Date of Birth", "Gender", "Category", "Quota", "Admission Date"];

const ALIASES: Record<keyof Omit<UploadRow, "rowNo">, string[]> = {
  apaarId: ["apaar id", "apaar", "apaar no", "apaar number", "apaarid"],
  name: ["student name", "name", "full name"],
  dob: ["date of birth", "dob", "birth date"],
  gender: ["gender", "sex"],
  category: ["category", "caste category", "social category"],
  quota: ["quota", "admission quota", "seat type"],
  admissionDate: ["admission date", "date of admission", "admitted on"],
};

export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}

export function download(filename: string, content: string | Blob, mime = "text/csv;charset=utf-8") {
  const blob = typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function rowsToCsv(rows: UploadRow[]) {
  return toCsv([TEMPLATE_HEADERS, ...rows.map((r) => [r.apaarId, r.name, r.dob, r.gender, r.category, r.quota, r.admissionDate])]);
}

export interface ParseResult {
  rows: UploadRow[];
  missingColumns: string[];
  columns: string[];
}

function fromMatrix(matrix: unknown[][]): ParseResult {
  const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (!nonEmpty.length) return { rows: [], missingColumns: TEMPLATE_HEADERS, columns: [] };
  const header = nonEmpty[0].map((h) => String(h ?? "").trim());
  const lower = header.map((h) => h.toLowerCase());
  const idx: Partial<Record<keyof typeof ALIASES, number>> = {};
  const missing: string[] = [];
  (Object.keys(ALIASES) as (keyof typeof ALIASES)[]).forEach((k, i) => {
    const at = lower.findIndex((h) => ALIASES[k].includes(h));
    if (at >= 0) idx[k] = at;
    else if (k !== "category" && k !== "quota") missing.push(TEMPLATE_HEADERS[i]);
  });
  const cell = (r: unknown[], k: keyof typeof ALIASES) => {
    const i = idx[k];
    if (i === undefined) return "";
    const v = r[i];
    if (v instanceof Date) return parseDate(v) ?? "";
    return String(v ?? "").trim();
  };
  const rows = nonEmpty.slice(1).map((r, i) => ({
    rowNo: i + 1,
    apaarId: cell(r, "apaarId"),
    name: cell(r, "name"),
    dob: cell(r, "dob"),
    gender: cell(r, "gender"),
    category: cell(r, "category"),
    quota: cell(r, "quota") || "Regular",
    admissionDate: cell(r, "admissionDate"),
  }));
  return { rows, missingColumns: missing, columns: header };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const matrix = (await readSheet(file)) as unknown[][];
    return fromMatrix(matrix);
  }
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return fromMatrix(parsed.data);
}
