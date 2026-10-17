import { describe, expect, it } from 'vitest';
import { badges, levelInfo, streakInfo, xpForLevel } from '../src/core/gamification';
import { addDays, dayKey, lastDays } from '../src/core/dates';

describe('niveaux', () => {
  it('suit le barème 100 × n(n−1)/2', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(450)).toMatchObject({ level: 3, floor: 300, next: 600, progress: 0.5 });
  });
});

describe('série de jours', () => {
  const today = '2026-03-10';
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(streakInfo(['2026-03-08', '2026-03-09', '2026-03-10'], today)).toMatchObject({ current: 3, doneToday: true });
  });
  it('reste vivante le matin tant qu’hier a été fait', () => {
    expect(streakInfo(['2026-03-08', '2026-03-09'], today)).toMatchObject({ current: 2, doneToday: false });
  });
  it('retombe à zéro après un jour manqué', () => {
    expect(streakInfo(['2026-03-07', '2026-03-08'], today).current).toBe(0);
  });
  it('calcule la meilleure série et traverse les changements de mois', () => {
    const days = ['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02', '2026-03-09'];
    expect(streakInfo(days, today)).toMatchObject({ current: 1, best: 4 });
  });
});

describe('dates locales', () => {
  it('additionne les jours sans dériver', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(lastDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('badges', () => {
  it('se débloquent selon les statistiques', () => {
    const b = badges({ activeDays: 1, bestStreak: 7, reviews: 49, wordsLearned: 50, bestToneScore: 0.92, charsTraced: 3 });
    const earned = new Set(b.filter((x) => x.earned).map((x) => x.id));
    expect(earned).toEqual(new Set(['first', 'streak3', 'streak7', 'hsk10', 'hsk50', 'tones']));
  });
});
