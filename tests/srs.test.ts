import { describe, expect, it } from 'vitest';
import { formatInterval, isMastered, newSrsState, previewIntervals, review, SrsPhase } from '../src/core/srs';

const T0 = new Date('2026-01-05T09:00:00').getTime();
const DAY = 864e5;

describe('répétition espacée (FSRS)', () => {
  it('une carte neuve est due immédiatement', () => {
    const s = newSrsState(T0);
    expect(s.due).toBe(T0);
    expect(s.state).toBe(SrsPhase.New);
  });

  it('les intervalles croissent avec la qualité de la réponse', () => {
    const p = previewIntervals(newSrsState(T0), T0);
    expect(p[1]).toBeLessThan(p[3]);
    expect(p[2]).toBeLessThanOrEqual(p[3]);
    expect(p[3]).toBeLessThan(p[4]);
    expect(p[4]).toBeGreaterThanOrEqual(DAY);
  });

  it('des réussites successives espacent les révisions', () => {
    let s = newSrsState(T0);
    let now = T0;
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = review(s, 3, now, false);
      gaps.push(s.due - now);
      now = s.due;
    }
    for (let i = 2; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    expect(s.state).toBe(SrsPhase.Review);
  });

  it('un oubli ramène la carte en réapprentissage et compte un échec', () => {
    let s = newSrsState(T0);
    let now = T0;
    for (let i = 0; i < 4; i++) {
      s = review(s, 3, now, false);
      now = s.due;
    }
    const before = s.stability;
    s = review(s, 1, now, false);
    expect(s.state).toBe(SrsPhase.Relearning);
    expect(s.lapses).toBe(1);
    expect(s.stability).toBeLessThan(before);
    expect(s.due - now).toBeLessThan(DAY);
  });

  it('l’état est sérialisable (aller-retour JSON sans perte)', () => {
    const s = review(newSrsState(T0), 4, T0, false);
    expect(JSON.parse(JSON.stringify(s))).toEqual(JSON.parse(JSON.stringify(s)));
    const again = review(JSON.parse(JSON.stringify(s)), 3, s.due, false);
    expect(again.reps).toBe(2);
  });

  it('une carte devient maîtrisée après plusieurs semaines de stabilité', () => {
    let s = newSrsState(T0);
    let now = T0;
    for (let i = 0; i < 8 && !isMastered(s); i++) {
      s = review(s, 4, now, false);
      now = s.due;
    }
    expect(isMastered(s)).toBe(true);
  });

  it('formate les intervalles en français', () => {
    expect(formatInterval(30_000)).toBe('1 min');
    expect(formatInterval(10 * 60_000)).toBe('10 min');
    expect(formatInterval(5 * 3600_000)).toBe('5 h');
    expect(formatInterval(3 * DAY)).toBe('3 j');
    expect(formatInterval(90 * DAY)).toBe('3 mois');
    expect(formatInterval(400 * DAY)).toBe('1.1 an');
  });
});
