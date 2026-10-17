export type Rng = () => number;

/** Générateur pseudo-aléatoire reproductible (mulberry32), utile pour les tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `n` éléments distincts de `pool`, différents de `exclude`. */
export function pickDistractors<T>(pool: readonly T[], exclude: (x: T) => boolean, n: number, rng: Rng = Math.random): T[] {
  return shuffle(pool.filter((x) => !exclude(x)), rng).slice(0, n);
}
