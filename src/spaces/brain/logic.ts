import type { Rng } from '../../core/random';

/* ---------- Mémoire de séquence ---------- */

export const GRID_CELLS = 9;

/** Ajoute une case à la séquence (jamais deux fois la même d'affilée, plus lisible). */
export function extendSequence(seq: number[], rng: Rng, cells = GRID_CELLS): number[] {
  let next = Math.floor(rng() * cells);
  if (seq.length && next === seq[seq.length - 1]) next = (next + 1 + Math.floor(rng() * (cells - 1))) % cells;
  return [...seq, next];
}

/** Longueur de départ adaptée : on repart un peu sous son record pour ne pas s'ennuyer. */
export function startLength(best: number): number {
  return Math.max(3, Math.min(best - 2, 9));
}

/** Vitesse d'affichage : plus rapide à mesure que la séquence s'allonge. */
export function flashMs(length: number): number {
  return Math.max(320, 700 - length * 30);
}

/* ---------- Calcul mental ---------- */

export interface Problem {
  text: string;
  answer: number;
}

export const MAX_LEVEL = 6;

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

/** Un calcul selon le niveau : 1 additions simples → 6 multiplications à deux chiffres. Résultat toujours entier et positif. */
export function makeProblem(level: number, rng: Rng): Problem {
  switch (Math.max(1, Math.min(MAX_LEVEL, level))) {
    case 1: {
      const a = int(rng, 1, 9), b = int(rng, 1, 9);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    case 2: {
      const a = int(rng, 6, 20), b = int(rng, 2, Math.min(a, 12));
      return rng() < 0.5 ? { text: `${a} + ${b}`, answer: a + b } : { text: `${a} − ${b}`, answer: a - b };
    }
    case 3: {
      const a = int(rng, 21, 99), b = int(rng, 11, a);
      return rng() < 0.5 ? { text: `${a} + ${b}`, answer: a + b } : { text: `${a} − ${b}`, answer: a - b };
    }
    case 4: {
      const a = int(rng, 2, 9), b = int(rng, 2, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 5: {
      if (rng() < 0.5) {
        const a = int(rng, 3, 9), b = int(rng, 3, 12);
        return { text: `${a * b} ÷ ${a}`, answer: b };
      }
      const a = int(rng, 12, 25), b = int(rng, 2, 5);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    default: {
      const a = int(rng, 11, 19), b = int(rng, 11, 19);
      return { text: `${a} × ${b}`, answer: a * b };
    }
  }
}

export interface Adapt {
  level: number;
  streak: number;
}

/** 3 bonnes réponses d'affilée : niveau suivant. Une erreur : niveau précédent. */
export function adapt(state: Adapt, correct: boolean): Adapt {
  if (!correct) return { level: Math.max(1, state.level - 1), streak: 0 };
  const streak = state.streak + 1;
  if (streak >= 3 && state.level < MAX_LEVEL) return { level: state.level + 1, streak: 0 };
  return { level: state.level, streak };
}

/** Niveau de départ : un cran sous le dernier niveau atteint. */
export function startLevel(lastLevel: number | undefined): number {
  return Math.max(1, Math.min(MAX_LEVEL, (lastLevel ?? 1) - 1));
}
