import { db, type ActivityRow } from './db';
import { dayKey } from './dates';

export type NewActivity = Omit<ActivityRow, 'id' | 'day' | 'ts'> & { ts?: number };

export async function logActivity(a: NewActivity): Promise<void> {
  const ts = a.ts ?? Date.now();
  await db.activity.add({ ...a, ts, day: dayKey(ts), minutes: Math.round(a.minutes * 10) / 10 });
}

/** Minutes écoulées depuis `start`, plafonnées pour ne pas compter un onglet oublié. */
export function minutesSince(start: number, cap = 30): number {
  return Math.min(cap, Math.max(0.5, (Date.now() - start) / 60000));
}

export async function activityOn(day: string): Promise<ActivityRow[]> {
  return db.activity.where('day').equals(day).toArray();
}

/** Coche manuelle d'un élément d'« Aujourd'hui » (ex. séance faite hors de l'appli). */
export async function toggleManualCheck(ref: string, space: ActivityRow['space'], minutes: number, xp: number) {
  const today = dayKey();
  const existing = await db.activity
    .where('day')
    .equals(today)
    .filter((r) => r.ref === ref && r.type === 'check')
    .first();
  if (existing) await db.activity.delete(existing.id!);
  else await logActivity({ space, ref, type: 'check', xp, minutes });
}
