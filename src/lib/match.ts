const TOKEN_MAP: Record<string, string> = {
  mohd: "mohammed",
  md: "mohammed",
  mohd_: "mohammed",
  mohammad: "mohammed",
  muhammad: "mohammed",
  mohamed: "mohammed",
  mohamad: "mohammed",
  sk: "shaikh",
  sheikh: "shaikh",
  shaik: "shaikh",
  kr: "kumar",
  kum: "kumar",
};

const TITLES = new Set(["mr", "ms", "mrs", "kumari", "shri", "smt", "dr"]);

export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[.,'`_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t && !TITLES.has(t))
    .map((t) => TOKEN_MAP[t] ?? t)
    .join(" ");
}

export function phonetic(name: string) {
  return normalizeName(name)
    .split(" ")
    .map((t) =>
      t
        .replace(/ksh/g, "x")
        .replace(/ks/g, "x")
        .replace(/shr/g, "sr")
        .replace(/sh/g, "s")
        .replace(/ph/g, "f")
        .replace(/([bdgkt])h/g, "$1")
        .replace(/w/g, "v")
        .replace(/z/g, "j")
        .replace(/ee|ii/g, "i")
        .replace(/oo|uu/g, "u")
        .replace(/aa/g, "a")
        .replace(/y$/g, "i")
        .replace(/(.)\1+/g, "$1"),
    )
    .join(" ");
}

export function jaroWinkler(a: string, b: string) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array<boolean>(a.length).fill(false);
  const bm = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(i + range + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = bm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  let trans = 0;
  for (let i = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) trans++;
    k++;
  }
  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - trans / 2) / m) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

const sorted = (s: string) => s.split(" ").sort().join(" ");

export interface NameMatch {
  score: number;
  method: "exact" | "normalised" | "transliterated" | "reordered" | "fuzzy";
}

export function matchNames(uploaded: string, registry: string): NameMatch {
  const a = uploaded.trim().toLowerCase().replace(/\s+/g, " ");
  const b = registry.trim().toLowerCase().replace(/\s+/g, " ");
  if (a === b) return { score: 1, method: "exact" };
  const na = normalizeName(uploaded);
  const nb = normalizeName(registry);
  if (na === nb) return { score: 0.98, method: "normalised" };
  const pa = phonetic(uploaded);
  const pb = phonetic(registry);
  if (pa === pb) return { score: 0.96, method: "transliterated" };
  if (sorted(pa) === sorted(pb)) return { score: 0.95, method: "reordered" };
  const score = Math.max(jaroWinkler(na, nb), jaroWinkler(pa, pb), jaroWinkler(sorted(pa), sorted(pb)));
  return { score: Math.round(score * 100) / 100, method: "fuzzy" };
}

export const NAME_ACCEPT = 0.92;
