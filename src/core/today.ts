import type { ActivityRow } from './db';
import type { TodayItem } from './modules';

/** Secondes estimées par carte de révision. */
export const SECONDS_PER_CARD = 8;

export function reviewItem(due: number, reviewedToday: boolean): TodayItem | null {
  if (due === 0 && !reviewedToday) return null;
  return {
    id: 'review',
    space: 'learn',
    title: due ? `Révisions : ${due} carte${due > 1 ? 's' : ''}` : 'Révisions à jour',
    detail: 'Tous parcours confondus',
    minutes: Math.max(1, Math.ceil((due * SECONDS_PER_CARD) / 60)),
    to: '/review',
    ref: 'review',
    done: due === 0,
  };
}

/** Marque comme faits les éléments ayant une activité du jour avec le même `ref`. */
export function resolveToday(items: TodayItem[], todayActivity: ActivityRow[]) {
  const refs = new Set(todayActivity.map((a) => a.ref).filter(Boolean));
  const checks = new Set(todayActivity.filter((a) => a.type === 'check').map((a) => a.ref));
  const resolved = items.map((i) => ({ ...i, done: !!i.done || refs.has(i.ref), checked: checks.has(i.ref) }));
  const remaining = resolved.filter((i) => !i.done).reduce((a, i) => a + i.minutes, 0);
  const total = resolved.reduce((a, i) => a + i.minutes, 0);
  const minutesDone = todayActivity.reduce((a, r) => a + r.minutes, 0);
  const xpToday = todayActivity.reduce((a, r) => a + r.xp, 0);
  return { items: resolved, remaining, total, minutesDone, xpToday };
}

/** Activités faites hors de l'appli, à cocher pour qu'elles comptent dans la série. */
export const OFF_APP: TodayItem[] = [
  { id: 'off-sport', space: 'sport', title: 'Séance de sport', detail: 'Faite hors de l’appli', minutes: 20, to: '/sport', ref: 'off:sport' },
  { id: 'off-meditation', space: 'sport', title: 'Méditation ou tai chi', detail: 'Faite hors de l’appli', minutes: 10, to: '/sport', ref: 'off:meditation' },
  { id: 'off-cook', space: 'kitchen', title: 'Repas fait maison', detail: 'Faite hors de l’appli', minutes: 0, to: '/kitchen', ref: 'off:cook' },
];
