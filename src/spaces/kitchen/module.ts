import { db } from '../../core/db';
import type { SpaceModule, TodayItem } from '../../core/modules';
import { catalogById } from './content';
import { aggregate, daysUntil, subtractStock, USE_SOON_DAYS } from './logic';
import { allRecipes, getSelection } from './store';

export const kitchenSpace: SpaceModule = {
  id: 'kitchen',
  label: 'Cuisine',
  path: '/kitchen',
  ready: true,
  async getTodayItems({ today }) {
    const [recipes, selection, pantry] = await Promise.all([allRecipes(), getSelection(), db.pantry.toArray()]);
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const sel = selection.filter((s) => byId.has(s.recipeId));
    const items: TodayItem[] = [];
    if (sel.length) {
      const needs = subtractStock(aggregate(sel.map((s) => ({ recipe: byId.get(s.recipeId)!, portions: s.portions })), catalogById), pantry);
      if (needs.length)
        items.push({
          id: 'kitchen-shopping',
          space: 'kitchen',
          title: `Courses : ${needs.length} article${needs.length > 1 ? 's' : ''}`,
          detail: sel.map((s) => byId.get(s.recipeId)!.title).slice(0, 3).join(', '),
          minutes: 0,
          to: '/kitchen/shopping',
          ref: 'kitchen:shopping',
        });
    }
    const soon = pantry.filter((p) => p.expires && daysUntil(p.expires, today) <= USE_SOON_DAYS);
    if (soon.length)
      items.push({
        id: 'kitchen-soon',
        space: 'kitchen',
        title: `À cuisiner vite : ${soon.map((p) => p.name).slice(0, 3).join(', ')}`,
        detail: 'Voir les plats qui les utilisent',
        minutes: 0,
        to: '/kitchen',
        ref: 'kitchen:cook',
      });
    return items;
  },
};
