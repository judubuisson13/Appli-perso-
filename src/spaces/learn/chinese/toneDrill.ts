import { shuffle, type Rng } from '../../../core/random';
import type { Tone } from './pinyin';

export type ToneStats = Partial<Record<Tone, { seen: number; wrong: number }>>;

/**
 * Tire `n` éléments en favorisant les tons où l'on se trompe le plus
 * (poids = 1 + 3 × taux d'erreur lissé).
 */
export function weightedPick<T extends { tone: Tone }>(items: T[], stats: ToneStats, n: number, rng: Rng): T[] {
  const weight = (t: Tone) => {
    const s = stats[t];
    const rate = s ? (s.wrong + 1) / (s.seen + 2) : 0.5;
    return 1 + 3 * rate;
  };
  const out: T[] = [];
  let last: T | undefined;
  for (let i = 0; i < n; i++) {
    const pool = items.filter((x) => x !== last);
    const total = pool.reduce((acc, x) => acc + weight(x.tone), 0);
    let r = rng() * total;
    let chosen = pool[pool.length - 1];
    for (const x of pool) {
      r -= weight(x.tone);
      if (r <= 0) {
        chosen = x;
        break;
      }
    }
    out.push(chosen);
    last = chosen;
  }
  return out;
}

/** Propose 4 schémas tonals pour un mot : le bon et 3 voisins (un ton changé à la fois si possible). */
export function patternOptions(correct: Tone[], rng: Rng): Tone[][] {
  const key = (p: Tone[]) => p.join('');
  const seen = new Set([key(correct)]);
  const candidates: Tone[][] = [];
  const all: Tone[] = [1, 2, 3, 4, 5];
  for (let i = 0; i < correct.length; i++)
    for (const t of all) {
      if (t === correct[i] || (i === 0 && t === 5)) continue;
      const p = [...correct];
      p[i] = t;
      candidates.push(p);
    }
  const out = [correct];
  for (const p of shuffle(candidates, rng)) {
    if (out.length === 4) break;
    if (!seen.has(key(p))) {
      seen.add(key(p));
      out.push(p);
    }
  }
  return shuffle(out, rng);
}

export function mergeStats(base: ToneStats, results: { tone: Tone; correct: boolean }[]): ToneStats {
  const out: ToneStats = structuredClone(base);
  for (const r of results) {
    const s = (out[r.tone] ??= { seen: 0, wrong: 0 });
    s.seen++;
    if (!r.correct) s.wrong++;
  }
  return out;
}
