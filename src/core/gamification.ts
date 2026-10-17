import { addDays } from './dates';

/** Barème d'XP. Une erreur ne coûte jamais d'XP : pratiquer compte, pas la perfection. */
export const XP = {
  reviewCard: 1,
  lessonDone: 10,
  correctAnswer: 1,
  traceChar: 2,
  manualCheck: 5,
} as const;

/** Seuils cumulés : niveau 2 à 100 XP, 3 à 300, 4 à 600… (100 × n(n−1)/2). */
export function xpForLevel(level: number): number {
  return (100 * level * (level - 1)) / 2;
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, xp, floor, next, progress: (xp - floor) / (next - floor) };
}

/**
 * Série de jours consécutifs avec au moins une activité.
 * Si aujourd'hui n'a encore rien, la série d'hier reste « en cours » (pas de remise à zéro le matin).
 */
export function streakInfo(activeDays: Iterable<string>, today: string) {
  const days = new Set(activeDays);
  const doneToday = days.has(today);
  let cursor = doneToday ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue;
    let len = 0;
    let c = d;
    while (days.has(c)) {
      len++;
      c = addDays(c, 1);
    }
    best = Math.max(best, len);
  }
  return { current, best, doneToday };
}

export interface BadgeStats {
  activeDays: number;
  bestStreak: number;
  reviews: number;
  wordsLearned: number;
  bestToneScore: number;
  charsTraced: number;
  missionsDone?: number;
  bestPhishing?: number;
  bestMemory?: number;
  bestMath?: number;
}

export interface Badge {
  id: string;
  label: string;
  hint: string;
  earned: boolean;
}

export function badges(s: BadgeStats): Badge[] {
  const b = (id: string, label: string, hint: string, earned: boolean): Badge => ({ id, label, hint, earned });
  return [
    b('first', 'Premier pas', 'Faire une première activité', s.activeDays >= 1),
    b('streak3', 'Lancé·e', 'Série de 3 jours', s.bestStreak >= 3),
    b('streak7', 'Une semaine', 'Série de 7 jours', s.bestStreak >= 7),
    b('streak30', 'Habitude', 'Série de 30 jours', s.bestStreak >= 30),
    b('rev50', 'Mémoire en marche', '50 révisions', s.reviews >= 50),
    b('rev500', 'Infatigable', '500 révisions', s.reviews >= 500),
    b('hsk10', '10 mots', '10 mots chinois appris', s.wordsLearned >= 10),
    b('hsk50', 'HSK 1 · 50 mots', '50 mots chinois appris', s.wordsLearned >= 50),
    b('tones', 'Oreille d’or', 'Au moins 90 % à un entraînement des tons', s.bestToneScore >= 0.9),
    b('trace20', 'Pinceau', '20 caractères tracés', s.charsTraced >= 20),
    b('helios', 'Hélios sauvée', 'Terminer le chapitre 1 de la mission de code', (s.missionsDone ?? 0) >= 7),
    b('lynx', 'Œil de lynx', 'Sans faute au jeu du phishing', (s.bestPhishing ?? 0) >= 1),
    b('memory9', 'Mémoire d’éléphant', 'Séquence de 9 cases', (s.bestMemory ?? 0) >= 9),
    b('math25', 'Calculateur', '25 bonnes réponses en calcul mental', (s.bestMath ?? 0) >= 25),
  ];
}
