import { mulberry32, type Rng } from "./rng";

type Node =
  | { leaf: true; size: number }
  | { leaf: false; feature: number; split: number; left: Node; right: Node };

const EULER = 0.5772156649;

function c(n: number) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + EULER) - (2 * (n - 1)) / n;
}

function build(rows: number[][], depth: number, limit: number, rnd: Rng): Node {
  if (depth >= limit || rows.length <= 1) return { leaf: true, size: rows.length };
  const dims = rows[0].length;
  const candidates = Array.from({ length: dims }, (_, i) => i).filter((f) => {
    const vals = rows.map((r) => r[f]);
    return Math.max(...vals) > Math.min(...vals);
  });
  if (!candidates.length) return { leaf: true, size: rows.length };
  const feature = candidates[Math.floor(rnd() * candidates.length)];
  const vals = rows.map((r) => r[feature]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const split = lo + rnd() * (hi - lo);
  return {
    leaf: false,
    feature,
    split,
    left: build(rows.filter((r) => r[feature] < split), depth + 1, limit, rnd),
    right: build(rows.filter((r) => r[feature] >= split), depth + 1, limit, rnd),
  };
}

function pathLength(x: number[], node: Node, depth: number): number {
  if (node.leaf) return depth + c(node.size);
  return pathLength(x, x[node.feature] < node.split ? node.left : node.right, depth + 1);
}

export function isolationForest(data: number[][], trees = 150, sampleSize = 32, seed = 7) {
  const rnd = mulberry32(seed);
  const psi = Math.min(sampleSize, data.length);
  const limit = Math.ceil(Math.log2(Math.max(psi, 2)));
  const forest: Node[] = [];
  for (let t = 0; t < trees; t++) {
    const sample: number[][] = [];
    for (let i = 0; i < psi; i++) sample.push(data[Math.floor(rnd() * data.length)]);
    forest.push(build(sample, 0, limit, rnd));
  }
  return (x: number[]) => {
    const avg = forest.reduce((s, tree) => s + pathLength(x, tree, 0), 0) / forest.length;
    return Math.pow(2, -avg / c(psi));
  };
}

export function median(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
