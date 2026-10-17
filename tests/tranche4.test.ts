import { describe, expect, it } from 'vitest';
import { advance, applySession, buildIntervals, formatClock, isoWeekday, isValidated, phaseAt, plannedSession, TABATA, totalSeconds } from '../src/spaces/sport/logic';
import { aggregate, byAisle, daysUntil, parseLine, portionsFor, roundQty, subtractStock, suggest, DEFAULT_HOUSEHOLD } from '../src/spaces/kitchen/logic';
import { sport } from '../src/spaces/sport/content';
import { catalog, catalogById, recipes } from '../src/spaces/kitchen/content';
import type { PantryRow } from '../src/core/db';

describe('sport : minuteur', () => {
  it('tabata : 8 × (20 s effort / 10 s repos), sans repos final', () => {
    const p = buildIntervals(TABATA);
    expect(p.filter((x) => x.kind === 'work')).toHaveLength(8);
    expect(p.filter((x) => x.kind === 'rest')).toHaveLength(7);
    expect(totalSeconds(p)).toBe(10 + 8 * 20 + 7 * 10);
    expect(p.at(-1)!.kind).toBe('work');
  });
  it('circuit en plusieurs tours avec repos long entre les tours', () => {
    const p = buildIntervals({ work: 30, rest: 15, rounds: 3, sets: 2, setRest: 60 });
    expect(p.map((x) => x.seconds)).toEqual([30, 15, 30, 15, 30, 60, 30, 15, 30, 15, 30]);
  });
  it('retrouve la phase en cours à partir du temps écoulé', () => {
    const p = buildIntervals({ work: 20, rest: 10, rounds: 2 });
    expect(phaseAt(p, 0)).toEqual({ index: 0, remaining: 20 });
    expect(phaseAt(p, 25)).toEqual({ index: 1, remaining: 5 });
    expect(phaseAt(p, 50)).toEqual({ index: 3, remaining: 0 });
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(0.2)).toBe('0:01');
  });
});

describe('sport : progression', () => {
  const max = { push: 3, pull: 3 };
  it('valide quand toutes les séries atteignent l’objectif', () => {
    expect(isValidated([12, 12, 12], 12, 3)).toBe(true);
    expect(isValidated([12, 11, 12], 12, 3)).toBe(false);
    expect(isValidated([12, 12], 12, 3)).toBe(false);
  });
  it('propose le palier suivant après 3 validations, sans l’imposer', () => {
    let s = {};
    let ready: string[] = [];
    for (let i = 0; i < 3; i++) ({ state: s, ready } = applySession(s, [{ chain: 'push', validated: true }, { chain: 'pull', validated: i !== 1 }], 3, max));
    expect(ready).toEqual(['push']);
    expect(s).toEqual({ push: { step: 0, validations: 3 }, pull: { step: 0, validations: 2 } });
    s = advance(s, 'push', 1, 3);
    expect(s).toMatchObject({ push: { step: 1, validations: 0 } });
  });
  it('ne propose rien au dernier palier et ne descend pas sous le premier', () => {
    const { ready } = applySession({ push: { step: 3, validations: 5 } }, [{ chain: 'push', validated: true }], 3, max);
    expect(ready).toEqual([]);
    expect(advance({}, 'push', -1, 3)).toEqual({ push: { step: 0, validations: 0 } });
  });
  it('planning : jours choisis, séances A/B en alternance', () => {
    expect(isoWeekday('2026-10-19')).toBe(1);
    expect(isoWeekday('2026-10-18')).toBe(7);
    expect(plannedSession([1, 3, 5], '2026-10-19', ['A', 'B'], 0)).toBe('A');
    expect(plannedSession([1, 3, 5], '2026-10-21', ['A', 'B'], 1)).toBe('B');
    expect(plannedSession([1, 3, 5], '2026-10-20', ['A', 'B'], 1)).toBeNull();
  });
  it('contenu : chaque chaîne a une progression du plus facile au plus dur', () => {
    expect(sport.chains.map((c) => c.id)).toEqual(['pull', 'push', 'dips', 'legs', 'core']);
    expect(sport.chains.find((c) => c.id === 'pull')!.steps.at(-1)!.id).toBe('pullup');
  });
});

describe('cuisine', () => {
  const dal = recipes.find((r) => r.id === 'dal')!;
  const omelette = recipes.find((r) => r.id === 'omelette-courgette')!;
  it('foyer de 2 adultes + 1 enfant = 2,5 portions', () => {
    expect(portionsFor(DEFAULT_HOUSEHOLD)).toBe(2.5);
  });
  it('agrège les ingrédients de plusieurs recettes à la bonne échelle', () => {
    const needs = aggregate([{ recipe: dal, portions: 2 }, { recipe: omelette, portions: 4 }], catalogById);
    const oignon = needs.find((n) => n.ing === 'oignon')!;
    expect(oignon.qty).toBeCloseTo(0.5);
    expect(needs.find((n) => n.ing === 'oeuf')!.qty).toBe(10);
    expect(needs.find((n) => n.ing === 'huile-olive')!.from).toEqual([dal.title, omelette.title]);
  });
  it('retire le stock et les basiques, trie par rayon', () => {
    const needs = aggregate([{ recipe: omelette, portions: 2 }], catalogById);
    const stock: PantryRow[] = [{ ing: 'oeuf', name: 'œufs', qty: 2, unit: 'pièce', addedAt: 0 }];
    const list = subtractStock(needs, stock);
    expect(list.find((n) => n.ing === 'oeuf')!.qty).toBe(3);
    expect(list.some((n) => n.ing === 'sel' || n.ing === 'huile-olive')).toBe(false);
    expect(byAisle(list).map(([a]) => a)).toEqual(['Fruits et légumes', 'Frais']);
  });
  it('arrondit les quantités de façon lisible', () => {
    expect(roundQty(187.5, 'g')).toBe(190);
    expect(roundQty(0.5, 'pièce')).toBe(1);
    expect(roundQty(1.2, 'pièce')).toBe(1);
    expect(roundQty(1.3, 'pièce')).toBe(2);
  });
  it('suggère d’abord les plats faisables, puis ceux à 1-2 ingrédients près, en priorisant ce qui périme', () => {
    const stock: PantryRow[] = [
      { ing: 'oeuf', name: 'œufs', qty: 6, unit: 'pièce', addedAt: 0 },
      { ing: 'courgette', name: 'courgette', qty: 1, unit: 'pièce', addedAt: 0, expires: '2026-10-18' },
      { ing: 'feta', name: 'feta', qty: 100, unit: 'g', addedAt: 0 },
      { ing: 'pates', name: 'pâtes', qty: 500, unit: 'g', addedAt: 0 },
      { ing: 'thon', name: 'thon', qty: 280, unit: 'g', addedAt: 0 },
    ];
    const s = suggest(recipes, stock, catalogById, '2026-10-17');
    expect(s[0].recipe.id).toBe('omelette-courgette');
    expect(s[0].missing).toEqual([]);
    expect(s[0].usesSoon).toEqual(['courgette']);
    const thon = s.find((x) => x.recipe.id === 'pates-thon-tomate')!;
    expect(thon.missing.sort()).toEqual(['oignon', 'tomates concassées']);
    expect(s.every((x) => x.missing.length <= 2)).toBe(true);
  });
  it('compte les jours avant péremption', () => {
    expect(daysUntil('2026-10-20', '2026-10-17')).toBe(3);
    expect(daysUntil('2026-10-16', '2026-10-17')).toBe(-1);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });
  it('comprend une saisie rapide en français', () => {
    expect(parseLine('200 g de riz', catalog)).toEqual({ ing: 'riz', name: 'riz', qty: 200, unit: 'g' });
    expect(parseLine('3 oeufs', catalog)).toMatchObject({ ing: 'oeuf', qty: 3, unit: 'pièce' });
    expect(parseLine('1,5 l lait', catalog)).toMatchObject({ ing: 'lait', qty: 1500, unit: 'ml' });
    expect(parseLine('2 c. à s. huile d’olive', catalog)).toMatchObject({ ing: 'huile-olive', qty: 2, unit: 'c. à s.' });
    expect(parseLine('courgettes', catalog)).toMatchObject({ ing: 'courgette', qty: 1 });
    expect(parseLine('1 kg farine', catalog)).toMatchObject({ ing: 'farine', qty: 1000, unit: 'g' });
    expect(parseLine('2 mangues', catalog)).toMatchObject({ ing: 'free:mangues', name: 'mangues', qty: 2 });
  });
});

import { beforeEach } from 'vitest';
import { db } from '../src/core/db';
import { addToPantry, addToSelection, allRecipes, consume, getSelection } from '../src/spaces/kitchen/store';

describe('cuisine : placard et sélection', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });
  it('fusionne les ajouts identiques et consomme d’abord ce qui périme le plus tôt', async () => {
    await addToPantry({ ing: 'oeuf', name: 'œufs', qty: 4, unit: 'pièce', expires: '2026-10-25' });
    await addToPantry({ ing: 'oeuf', name: 'œufs', qty: 2, unit: 'pièce', expires: '2026-10-25' });
    await addToPantry({ ing: 'oeuf', name: 'œufs', qty: 6, unit: 'pièce', expires: '2026-10-20' });
    expect(await db.pantry.count()).toBe(2);
    await consume([{ ing: 'oeuf', qty: 7, unit: 'pièce' }]);
    const left = await db.pantry.toArray();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ expires: '2026-10-25', qty: 5 });
  });
  it('ajouter deux fois la même recette cumule les portions', async () => {
    await addToSelection('dal', 2.5);
    await addToSelection('dal', 2.5);
    expect(await getSelection()).toEqual([{ recipeId: 'dal', portions: 5 }]);
  });
  it('mes recettes s’ajoutent aux recettes de départ', async () => {
    const base = (await allRecipes()).length;
    await db.userRecipes.put({ id: 'mine-x', recipe: { ...recipes[0], id: 'mine-x', title: 'Ma soupe' }, updatedAt: 1 });
    const all = await allRecipes();
    expect(all).toHaveLength(base + 1);
    expect(all.find((r) => r.id === 'mine-x')).toMatchObject({ mine: true, title: 'Ma soupe' });
  });
});
