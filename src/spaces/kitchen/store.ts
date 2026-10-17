import { db, type PantryRow } from '../../core/db';
import type { Recipe } from '../../content/schemas';
import { CHECKED_KEY, HOUSEHOLD_KEY, recipes as baseRecipes, SELECTION_KEY } from './content';
import { DEFAULT_HOUSEHOLD, type Household } from './logic';

export interface Selection {
  recipeId: string;
  portions: number;
}

async function get<T>(key: string, fallback: T): Promise<T> {
  return ((await db.settings.get(key))?.value as T | undefined) ?? fallback;
}

export const getHousehold = () => get<Household>(HOUSEHOLD_KEY, DEFAULT_HOUSEHOLD);
export const setHousehold = (h: Household) => db.settings.put({ key: HOUSEHOLD_KEY, value: h });
export const getSelection = () => get<Selection[]>(SELECTION_KEY, []);
export const setSelection = (s: Selection[]) => db.settings.put({ key: SELECTION_KEY, value: s });
export const getChecked = () => get<string[]>(CHECKED_KEY, []);
export const setChecked = (c: string[]) => db.settings.put({ key: CHECKED_KEY, value: c });

/** Recettes de départ + les miennes (une recette à moi peut remplacer une recette de départ du même id). */
export async function allRecipes(): Promise<(Recipe & { mine: boolean })[]> {
  const mine = await db.userRecipes.toArray();
  const mineById = new Map(mine.map((r) => [r.id, r.recipe]));
  return [
    ...baseRecipes.filter((r) => !mineById.has(r.id)).map((r) => ({ ...r, mine: false })),
    ...mine.map((r) => ({ ...r.recipe, mine: true })),
  ];
}

export async function addToSelection(recipeId: string, portions: number) {
  const sel = await getSelection();
  const existing = sel.find((s) => s.recipeId === recipeId);
  await setSelection(existing ? sel.map((s) => (s.recipeId === recipeId ? { ...s, portions: s.portions + portions } : s)) : [...sel, { recipeId, portions }]);
}

/** Ajoute au placard (fusionne avec une ligne existante du même produit, même unité, sans date différente). */
export async function addToPantry(item: Omit<PantryRow, 'id' | 'addedAt'>) {
  const same = await db.pantry.where('ing').equals(item.ing).filter((p) => p.unit === item.unit && p.expires === item.expires).first();
  if (same) await db.pantry.update(same.id!, { qty: same.qty + item.qty });
  else await db.pantry.add({ ...item, addedAt: Date.now() });
}

/** Retire du placard ce qu'une recette a utilisé (les produits épuisés disparaissent). */
export async function consume(uses: { ing: string; qty: number; unit: string }[]) {
  for (const u of uses) {
    let left = u.qty;
    const rows = (await db.pantry.where('ing').equals(u.ing).toArray()).filter((r) => r.unit === u.unit).sort((a, b) => (a.expires ?? '9999').localeCompare(b.expires ?? '9999'));
    for (const r of rows) {
      if (left <= 0) break;
      const take = Math.min(r.qty, left);
      left -= take;
      if (r.qty - take <= 0.001) await db.pantry.delete(r.id!);
      else await db.pantry.update(r.id!, { qty: r.qty - take });
    }
  }
}
