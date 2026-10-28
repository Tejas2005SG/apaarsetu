import { isolationForest, median } from "./iforest";
import { ABC_ID, FEATURE_LABELS, getWorld } from "./world";
import type { Submission } from "./types";

export function featuresFromSubmission(sub: Submission): number[] {
  const n = Math.max(sub.results.length, 1);
  const count = (rule: string) => sub.results.filter((r) => r.failed.some((f) => f.rule === rule)).length;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return [
    r2((sub.ledger.excess / sub.ledger.approved) * 100),
    r2((count("national_duplicate") / n) * 100),
    r2((count("not_found") / n) * 100),
    r2((count("name_match") / n) * 100),
    r2((count("late_admission") / n) * 100),
    15.0,
  ];
}

export interface RiskRow {
  institutionId: string;
  score: number | null;
  features: number[] | null;
}

const cache = new Map<string, { rows: RiskRow[]; medians: number[] }>();

export function riskTable(abcFeatures: number[] | null) {
  const key = abcFeatures ? abcFeatures.join(",") : "none";
  const hit = cache.get(key);
  if (hit) return hit;
  const w = getWorld();
  const others = w.institutions.filter((i) => i.id !== ABC_ID);
  const data = others.map((i) => i.features);
  if (abcFeatures) data.push(abcFeatures);
  const score = isolationForest(data, 200, 40, 32);
  const rows: RiskRow[] = w.institutions.map((inst) => {
    const f = inst.id === ABC_ID ? abcFeatures : inst.features;
    return { institutionId: inst.id, features: f, score: f ? Math.round(score(f) * 100) / 100 : null };
  });
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const medians = FEATURE_LABELS.map((_, k) => median(others.map((i) => i.features[k])));
  const out = { rows, medians };
  cache.set(key, out);
  return out;
}

export function riskBand(score: number | null) {
  if (score === null) return { label: "No data", tone: "neutral" as const };
  if (score >= 0.65) return { label: "High", tone: "red" as const };
  if (score >= 0.55) return { label: "Elevated", tone: "amber" as const };
  return { label: "Normal", tone: "green" as const };
}
