import { normalizeAnswer } from '../../core/text';
import type { Ingredient, Recipe } from '../../content/schemas';
import type { PantryRow } from '../../core/db';

export interface Household {
  adults: number;
  children: number;
  /** Part d'une portion adulte pour un jeune enfant. */
  childFactor: number;
}

export const DEFAULT_HOUSEHOLD: Household = { adults: 2, children: 1, childFactor: 0.5 };

export function portionsFor(h: Household): number {
  return h.adults + h.children * h.childFactor;
}

/** Quantité arrondie de façon lisible : entiers pour les pièces, multiples de 5 pour les grammes. */
export function roundQty(qty: number, unit: string): number {
  if (unit === 'g' || unit === 'ml') return qty >= 50 ? Math.round(qty / 5) * 5 : Math.round(qty);
  if (unit === 'pièce' || unit === 'gousse') return Math.max(1, Math.ceil(qty - 0.25));
  return Math.round(qty * 2) / 2;
}

export function scaleRecipe(r: Recipe, portions: number) {
  const f = portions / r.servings;
  return r.ingredients.map((i) => ({ ...i, qty: i.qty * f }));
}

export interface Need {
  ing: string;
  name: string;
  aisle: string;
  unit: string;
  qty: number;
  staple: boolean;
  from: string[];
}

/** Besoins agrégés pour plusieurs recettes (même ingrédient = une seule ligne). */
export function aggregate(selections: { recipe: Recipe; portions: number }[], catalog: Map<string, Ingredient>): Need[] {
  const map = new Map<string, Need>();
  for (const { recipe, portions } of selections) {
    for (const i of scaleRecipe(recipe, portions)) {
      const c = catalog.get(i.ing);
      const unit = i.unit ?? c?.unit ?? '';
      const key = `${i.ing}|${unit}`;
      const n = map.get(key) ?? { ing: i.ing, name: c?.name ?? i.name ?? i.ing, aisle: c?.aisle ?? 'Autre', unit, qty: 0, staple: !!c?.staple, from: [] };
      n.qty += i.qty;
      if (!n.from.includes(recipe.title)) n.from.push(recipe.title);
      map.set(key, n);
    }
  }
  return [...map.values()];
}

/** Retire ce que j'ai déjà (même ingrédient et même unité). Les basiques du placard ne sont pas listés. */
export function subtractStock(needs: Need[], stock: PantryRow[]): Need[] {
  const have = new Map<string, number>();
  for (const s of stock) have.set(`${s.ing}|${s.unit}`, (have.get(`${s.ing}|${s.unit}`) ?? 0) + s.qty);
  return needs
    .filter((n) => !n.staple)
    .map((n) => ({ ...n, qty: Math.max(0, n.qty - (have.get(`${n.ing}|${n.unit}`) ?? 0)) }))
    .filter((n) => n.qty > 0.001);
}

const AISLE_ORDER = ['Fruits et légumes', 'Boulangerie', 'Boucherie', 'Poissonnerie', 'Frais', 'Épicerie', 'Surgelés', 'Autre'];

export function byAisle(needs: Need[]): [string, Need[]][] {
  const groups = new Map<string, Need[]>();
  for (const n of needs) groups.set(n.aisle, [...(groups.get(n.aisle) ?? []), n]);
  const rank = (a: string) => (AISLE_ORDER.includes(a) ? AISLE_ORDER.indexOf(a) : AISLE_ORDER.length);
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([a, list]) => [a, list.sort((x, y) => x.name.localeCompare(y.name, 'fr'))]);
}

export function daysUntil(date: string, today: string): number {
  const [y1, m1, d1] = date.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 864e5);
}

export const USE_SOON_DAYS = 3;

export interface Suggestion {
  recipe: Recipe;
  missing: string[];
  usesSoon: string[];
}

/**
 * Plats faisables avec le stock (les basiques comme le sel ou l'huile sont supposés présents),
 * puis ceux à 1 ou 2 ingrédients près. Ceux qui utilisent un produit qui périme bientôt passent devant.
 */
export function suggest(recipes: Recipe[], stock: PantryRow[], catalog: Map<string, Ingredient>, today: string, maxMissing = 2): Suggestion[] {
  const have = new Set(stock.filter((s) => s.qty > 0).map((s) => s.ing));
  const soon = new Set(stock.filter((s) => s.expires && daysUntil(s.expires, today) <= USE_SOON_DAYS).map((s) => s.ing));
  return recipes
    .map((recipe) => {
      const needed = recipe.ingredients.filter((i) => !catalog.get(i.ing)?.staple);
      return {
        recipe,
        missing: needed.filter((i) => !have.has(i.ing)).map((i) => catalog.get(i.ing)?.name ?? i.name ?? i.ing),
        usesSoon: needed.filter((i) => soon.has(i.ing)).map((i) => catalog.get(i.ing)?.name ?? i.ing),
      };
    })
    .filter((s) => s.missing.length <= maxMissing && s.missing.length < s.recipe.ingredients.length)
    .sort((a, b) => a.missing.length - b.missing.length || b.usesSoon.length - a.usesSoon.length || a.recipe.minutes - b.recipe.minutes);
}

/* ---------- Saisie rapide ---------- */

const UNIT_WORDS: [RegExp, string][] = [
  [/^(g|gr|grammes?)$/, 'g'],
  [/^kg$/, 'kg'],
  [/^(ml|millilitres?)$/, 'ml'],
  [/^(cl)$/, 'cl'],
  [/^(l|litres?)$/, 'l'],
  [/^(c\.? ?a\.? ?s\.?|cas|cuilleres? a soupe)$/, 'c. à s.'],
  [/^(c\.? ?a\.? ?c\.?|cac|cuilleres? a cafe)$/, 'c. à c.'],
  [/^gousses?$/, 'gousse'],
  [/^pincees?$/, 'pincée'],
];

/** Trouve l'ingrédient du catalogue le plus proche d'un nom tapé (pluriels et accents tolérés). */
export function matchIngredient(name: string, catalog: Ingredient[]): Ingredient | undefined {
  const n = normalizeAnswer(name).replace(/s\b/g, '');
  if (!n) return undefined;
  const norm = (s: string) => normalizeAnswer(s).replace(/s\b/g, '');
  return catalog.find((c) => norm(c.name) === n || c.id === n.replace(/ /g, '-')) ?? catalog.find((c) => norm(c.name).startsWith(n) || n.startsWith(norm(c.name)));
}

/**
 * « 200 g de riz », « 3 œufs », « 1,5 l lait », « 2 c. à s. huile d’olive » → quantité, unité, ingrédient.
 * Les kilos et litres sont convertis en grammes et millilitres.
 */
export function parseLine(line: string, catalog: Ingredient[]): { ing: string; name: string; qty: number; unit: string } | null {
  const raw = line.trim();
  if (!raw) return null;
  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  let qty = 1;
  let rest = raw;
  if (m) {
    qty = Number(m[1].replace(',', '.'));
    rest = m[2];
  }
  let unit = '';
  const words = rest.split(/\s+/);
  for (let take = 4; take >= 1; take--) {
    const cand = normalizeAnswer(words.slice(0, take).join(' ')).replace(/ /g, ' ');
    const hit = UNIT_WORDS.find(([re]) => re.test(cand) || re.test(cand.replace(/ /g, '')));
    if (hit) {
      unit = hit[1];
      rest = words.slice(take).join(' ');
      break;
    }
  }
  rest = rest.replace(/^(de |d’|d'|des |du )/i, '').trim();
  if (unit === 'kg') [qty, unit] = [qty * 1000, 'g'];
  if (unit === 'l') [qty, unit] = [qty * 1000, 'ml'];
  if (unit === 'cl') [qty, unit] = [qty * 10, 'ml'];
  const c = matchIngredient(rest, catalog);
  if (c) return { ing: c.id, name: c.name, qty, unit: unit || c.unit };
  return { ing: `free:${normalizeAnswer(rest).replace(/ /g, '-')}`, name: rest || raw, qty, unit: unit || 'pièce' };
}
