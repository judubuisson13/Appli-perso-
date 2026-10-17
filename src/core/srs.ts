import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';

/** 1 = À revoir, 2 = Difficile, 3 = Bien, 4 = Facile (mêmes valeurs que ts-fsrs). */
export type Grade4 = 1 | 2 | 3 | 4;
export const GRADES: Grade4[] = [1, 2, 3, 4];
export const GRADE_LABELS: Record<Grade4, string> = { 1: 'À revoir', 2: 'Difficile', 3: 'Bien', 4: 'Facile' };

/** État FSRS sérialisable (dates en millisecondes) pour IndexedDB et les sauvegardes. */
export interface SrsState {
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview?: number;
}

export { State as SrsPhase };

function makeScheduler(fuzz: boolean) {
  return fsrs(generatorParameters({ enable_fuzz: fuzz, maximum_interval: 3 * 365, request_retention: 0.9 }));
}
const scheduler = makeScheduler(true);
const exactScheduler = makeScheduler(false);

function toCard(s: SrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  };
}

function fromCard(c: Card): SrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review?.getTime(),
  };
}

export function newSrsState(now: number = Date.now()): SrsState {
  return fromCard(createEmptyCard(new Date(now)));
}

/** Applique une réponse et renvoie le nouvel état. `fuzz` (aléa sur l'intervalle) désactivable pour les tests. */
export function review(state: SrsState, grade: Grade4, now: number = Date.now(), fuzz = true): SrsState {
  const s = fuzz ? scheduler : exactScheduler;
  return fromCard(s.next(toCard(state), new Date(now), grade as Grade).card);
}

/** Délai avant la prochaine révision pour chaque réponse possible (sans aléa). */
export function previewIntervals(state: SrsState, now: number = Date.now()): Record<Grade4, number> {
  const out = {} as Record<Grade4, number>;
  for (const g of GRADES) out[g] = review(state, g, now, false).due - now;
  return out;
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} j`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mois`;
  return `${(d / 365).toFixed(1).replace('.0', '')} an${d >= 730 ? 's' : ''}`;
}

/** Une carte est « maîtrisée » quand sa stabilité dépasse 3 semaines. */
export function isMastered(s: SrsState): boolean {
  return s.state === State.Review && s.stability >= 21;
}

export { Rating };
