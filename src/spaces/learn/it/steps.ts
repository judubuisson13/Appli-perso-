import { db } from '../../../core/db';
import { ensureCard } from '../../../core/cards';
import { logActivity } from '../../../core/activity';
import { cyber, TRACK } from './content';

export async function completeStep(stepId: string, opts: { xp: number; minutes: number; score: number; data?: Record<string, unknown> }) {
  const prev = await db.lessonProgress.get(stepId);
  await db.lessonProgress.put({
    id: stepId,
    track: TRACK,
    completedAt: Date.now(),
    attempts: (prev?.attempts ?? 0) + 1,
    bestScore: Math.max(prev?.bestScore ?? 0, opts.score),
  });
  await logActivity({ space: 'learn', track: TRACK, type: 'it-step', ref: `lesson:${stepId}`, xp: opts.xp, minutes: opts.minutes, data: opts.data });
}

/** Ajoute les notions du module à la file de révision (sans doublon). */
export async function addCyberCards(): Promise<number> {
  let added = 0;
  for (const c of cyber.cards) {
    const exists = await db.cards.get(`${TRACK}:${c.id}:term`);
    if (!exists) {
      await ensureCard(TRACK, c.id, 'term');
      added++;
    }
  }
  return added;
}
