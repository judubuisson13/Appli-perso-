import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toneOf, tonesOf } from '../src/spaces/learn/chinese/pinyin';
import { hsk1, toneSyllables, lessonWords } from '../src/spaces/learn/chinese/content';
import { buildLesson, gradeFromMistakes, mistakesByWord } from '../src/spaces/learn/chinese/lesson';
import { mergeStats, patternOptions, weightedPick } from '../src/spaces/learn/chinese/toneDrill';
import { seeded } from '../src/core/random';
import { answer, createQueue, isFinished, REQUEUE_GAP } from '../src/core/queue';
import { zhDeck } from '../src/content/schemas';

describe('pinyin', () => {
  it('détecte les 4 tons et le ton neutre', () => {
    expect(['mā', 'má', 'mǎ', 'mà', 'ma'].map(toneOf)).toEqual([1, 2, 3, 4, 5]);
    expect(toneOf('nǚ')).toBe(3);
    expect(toneOf('lǜ')).toBe(4);
    expect(toneOf('Zhōng')).toBe(1);
    expect(tonesOf(['duì', 'bu', 'qǐ'])).toEqual([4, 5, 3]);
  });
  it('fonctionne aussi en Unicode décomposé', () => {
    expect(toneOf('má')).toBe(2);
  });
});

describe('contenu chinois', () => {
  it('HSK 1 : 50 mots répartis en 5 leçons de 10, sans doublon', () => {
    expect(hsk1.words).toHaveLength(50);
    expect(hsk1.lessons).toHaveLength(5);
    const all = hsk1.lessons.flatMap((l) => l.words);
    expect(new Set(all).size).toBe(50);
  });
  it('chaque fichier de content/chinese est valide', () => {
    const dir = join(__dirname, '..', 'content', 'chinese');
    for (const f of readdirSync(dir)) expect(() => JSON.parse(readFileSync(join(dir, f), 'utf8'))).not.toThrow();
  });
  it('le schéma refuse un mot dont les syllabes ne reconstituent pas le pinyin', () => {
    const bad = { ...hsk1, words: [{ ...hsk1.words[0], syllables: ['wo'] }], lessons: [] };
    expect(zhDeck.safeParse(bad).success).toBe(false);
  });
  it('le schéma refuse une leçon qui cite un mot inconnu', () => {
    const bad = { ...hsk1, lessons: [{ id: 'x', title: 'x', words: ['nope'] }] };
    expect(zhDeck.safeParse(bad).success).toBe(false);
  });
  it('les syllabes de l’exercice de tons couvrent les 4 tons de façon équilibrée', () => {
    const counts = [1, 2, 3, 4].map((t) => toneSyllables.filter((s) => s.tone === t).length);
    expect(new Set(counts).size).toBe(1);
  });
});

describe('construction d’une leçon', () => {
  const words = lessonWords('hsk1-l1');
  const ex = buildLesson(words, hsk1.words, { speak: true, trace: true }, seeded(1));

  it('fait découvrir chaque mot avant de l’interroger', () => {
    for (const w of words) {
      const first = ex.findIndex((e) => e.wordId === w.id);
      expect(ex[first].type).toBe('discover');
    }
  });
  it('propose 4 choix distincts contenant la bonne réponse', () => {
    for (const e of ex.filter((x) => x.options)) {
      expect(e.options).toHaveLength(4);
      expect(new Set(e.options).size).toBe(4);
      expect(e.options).toContain(e.wordId);
    }
  });
  it('n’oppose jamais 他 et 她 dans un exercice d’écoute (même son)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const list = buildLesson(words, hsk1.words, { speak: false, trace: false }, seeded(seed));
      for (const e of list.filter((x) => x.type === 'listen')) {
        const pys = e.options!.map((id) => hsk1.words.find((w) => w.id === id)!.pinyin);
        expect(new Set(pys).size).toBe(4);
      }
    }
  });
  it('sans micro, aucun exercice oral', () => {
    const list = buildLesson(words, hsk1.words, { speak: false, trace: false }, seeded(2));
    expect(list.some((e) => e.type === 'speak' || e.type === 'trace')).toBe(false);
    expect(list).toHaveLength(words.length * 4);
  });
  it('convertit les erreurs en note FSRS initiale', () => {
    expect([0, 1, 2, 5].map(gradeFromMistakes)).toEqual([3, 2, 1, 1]);
    expect(mistakesByWord({ 'meaning:hsk1-wo': 1, 'listen:hsk1-wo': 2, 'reverse:hsk1-ni': 1 })).toEqual({ 'hsk1-wo': 3, 'hsk1-ni': 1 });
  });
});

describe('file d’exercices', () => {
  it('une erreur renvoie l’exercice quelques cases plus loin', () => {
    let q = createQueue(['a', 'b', 'c', 'd', 'e', 'f']);
    q = answer(q, 'a', false);
    expect(q.items.indexOf('a', 1)).toBe(1 + REQUEUE_GAP);
    expect(q.mistakes).toEqual({ a: 1 });
  });
  it('compte les réussites du premier coup et se termine', () => {
    let q = createQueue(['a', 'b']);
    q = answer(q, 'a', false);
    q = answer(q, 'b', true);
    q = answer(q, 'a', true);
    expect(isFinished(q)).toBe(true);
    expect(q.firstTry).toBe(1);
    expect(q.answered).toBe(3);
  });
  it('un exercice non noté ne compte pas', () => {
    const q = answer(createQueue(['a']), 'a', false, false);
    expect(q.answered).toBe(0);
    expect(isFinished(q)).toBe(true);
  });
});

describe('entraînement des tons', () => {
  it('favorise les tons où l’on se trompe', () => {
    const items = toneSyllables;
    const stats = mergeStats({}, [
      ...Array.from({ length: 20 }, () => ({ tone: 3 as const, correct: false })),
      ...Array.from({ length: 20 }, () => ({ tone: 1 as const, correct: true })),
    ]);
    const picks = weightedPick(items, stats, 400, seeded(7));
    const n3 = picks.filter((p) => p.tone === 3).length;
    const n1 = picks.filter((p) => p.tone === 1).length;
    expect(n3).toBeGreaterThan(n1 * 2);
  });
  it('ne répète pas deux fois de suite la même syllabe', () => {
    const picks = weightedPick(toneSyllables, {}, 100, seeded(3));
    for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
  });
  it('propose 4 schémas tonals distincts dont le bon', () => {
    for (let seed = 0; seed < 20; seed++) {
      const opts = patternOptions([4, 5, 3], seeded(seed));
      expect(opts).toHaveLength(4);
      expect(new Set(opts.map((o) => o.join())).size).toBe(4);
      expect(opts.map((o) => o.join())).toContain('4,5,3');
      for (const o of opts) expect(o[0]).not.toBe(5);
    }
  });
});
