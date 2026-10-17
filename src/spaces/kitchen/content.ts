import raw from '../../../content/kitchen/base.json';
import { kitchenContent, type Ingredient } from '../../content/schemas';

const data = kitchenContent.parse(raw);
export const catalog = data.catalog;
export const catalogById = new Map<string, Ingredient>(catalog.map((c) => [c.id, c]));
export const recipes = data.recipes;
export const tips = data.tips;

export const HOUSEHOLD_KEY = 'kitchen.household';
export const SELECTION_KEY = 'kitchen.selection';
export const CHECKED_KEY = 'kitchen.checked';
