export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rnd: Rng, list: readonly T[]): T => list[Math.floor(rnd() * list.length)];

export const int = (rnd: Rng, min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

export function gauss(rnd: Rng, mean = 0, sd = 1) {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
