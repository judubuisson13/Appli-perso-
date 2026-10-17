import raw from '../../../content/sport/bodyweight.json';
import { sportContent } from '../../content/schemas';

export const sport = sportContent.parse(raw);
export const chainById = new Map(sport.chains.map((c) => [c.id, c]));
export const maxStep = Object.fromEntries(sport.chains.map((c) => [c.id, c.steps.length - 1]));
export const PROGRAM_KEY = 'sport.program';
export const DAYS_KEY = 'sport.days';
export const DEFAULT_DAYS = [1, 3, 5];
