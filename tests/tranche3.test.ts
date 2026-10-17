import { describe, expect, it } from 'vitest';
import { seeded } from '../src/core/random';
import { adapt, extendSequence, flashMs, makeProblem, MAX_LEVEL, startLength, startLevel } from '../src/spaces/brain/logic';
import { gameOfDay } from '../src/spaces/brain/stats';
import { cyber } from '../src/spaces/learn/it/content';
import { addDays } from '../src/core/dates';

describe('cerveau : séquence', () => {
  it('ajoute une case valide, jamais la même que la précédente', () => {
    const rng = seeded(1);
    let s: number[] = [];
    for (let i = 0; i < 200; i++) s = extendSequence(s, rng);
    expect(s).toHaveLength(200);
    for (let i = 0; i < s.length; i++) {
      expect(s[i]).toBeGreaterThanOrEqual(0);
      expect(s[i]).toBeLessThan(9);
      if (i) expect(s[i]).not.toBe(s[i - 1]);
    }
  });
  it('repart sous le record et accélère avec la longueur', () => {
    expect(startLength(0)).toBe(3);
    expect(startLength(8)).toBe(6);
    expect(flashMs(12)).toBeLessThan(flashMs(3));
    expect(flashMs(50)).toBe(320);
  });
});

describe('cerveau : calcul mental', () => {
  it('chaque niveau produit des résultats entiers et positifs, cohérents avec l’énoncé', () => {
    const rng = seeded(9);
    for (let level = 1; level <= MAX_LEVEL; level++)
      for (let i = 0; i < 300; i++) {
        const p = makeProblem(level, rng);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        const [a, op, b] = p.text.split(' ');
        const x = Number(a), y = Number(b);
        const expected = { '+': x + y, '−': x - y, '×': x * y, '÷': x / y }[op];
        expect(expected).toBe(p.answer);
      }
  });
  it('monte après 3 réussites, descend après une erreur, reste dans les bornes', () => {
    let s = { level: 1, streak: 0 };
    s = adapt(s, true);
    s = adapt(s, true);
    expect(s.level).toBe(1);
    s = adapt(s, true);
    expect(s).toEqual({ level: 2, streak: 0 });
    expect(adapt(s, false)).toEqual({ level: 1, streak: 0 });
    expect(adapt({ level: 1, streak: 0 }, false).level).toBe(1);
    expect(adapt({ level: MAX_LEVEL, streak: 2 }, true).level).toBe(MAX_LEVEL);
    expect(startLevel(undefined)).toBe(1);
    expect(startLevel(5)).toBe(4);
  });
  it('alterne le jeu du jour', () => {
    const games = new Set(Array.from({ length: 6 }, (_, i) => gameOfDay(addDays('2026-10-01', i))));
    expect(games).toEqual(new Set(['memory', 'math']));
  });
});

describe('cyber : contenu', () => {
  it('fiche, quiz, flashcards et simulation présents', () => {
    expect(cyber.sheet.length).toBeGreaterThanOrEqual(5);
    expect(cyber.quiz.length).toBeGreaterThanOrEqual(10);
    expect(cyber.cards.length).toBeGreaterThanOrEqual(10);
  });
  it('le jeu de phishing mélange vrais et faux messages', () => {
    const v = cyber.phishing.map((m) => m.verdict);
    expect(v.filter((x) => x === 'phishing').length).toBeGreaterThanOrEqual(4);
    expect(v.filter((x) => x === 'legit').length).toBeGreaterThanOrEqual(2);
  });
  it('un message avec un emplacement de lien a bien un lien, et inversement', () => {
    for (const m of cyber.phishing) expect(m.body.includes('{link}')).toBe(m.link !== null);
  });
  it('identifiants uniques', () => {
    const ids = [...cyber.quiz.map((q) => q.id), ...cyber.cards.map((c) => c.id), ...cyber.phishing.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
