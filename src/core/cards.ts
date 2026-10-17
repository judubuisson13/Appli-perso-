import { db, type CardRow } from './db';
import { newSrsState, review, type Grade4 } from './srs';

export const cardId = (track: string, itemId: string, kind: string) => `${track}:${itemId}:${kind}`;

/** Crée la carte si elle n'existe pas encore. */
export async function ensureCard(track: string, itemId: string, kind: string, now = Date.now()): Promise<CardRow> {
  const id = cardId(track, itemId, kind);
  const existing = await db.cards.get(id);
  if (existing) return existing;
  const srs = newSrsState(now);
  const row: CardRow = { id, track, kind, itemId, srs, due: srs.due, createdAt: now };
  await db.cards.put(row);
  return row;
}

export async function gradeCard(card: CardRow, grade: Grade4, now = Date.now()): Promise<CardRow> {
  const srs = review(card.srs, grade, now);
  const next = { ...card, srs, due: srs.due };
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.put(next);
    await db.reviewLogs.add({ cardId: card.id, track: card.track, grade, ts: now });
  });
  return next;
}

export async function dueCards(now = Date.now(), tracks?: string[], limit = 200): Promise<CardRow[]> {
  const rows = await db.cards.where('due').belowOrEqual(now).limit(limit * 4).toArray();
  const due = rows.filter((c) => !tracks || tracks.includes(c.track)).sort((a, b) => a.due - b.due).slice(0, limit);
  return spreadSiblings(due);
}

/**
 * Évite que deux cartes du même élément se suivent (ex. « 八 → huit » juste après « huit → 八 »),
 * sinon la seconde donne la réponse de la première.
 */
export function spreadSiblings<T extends { itemId: string }>(cards: T[]): T[] {
  // Tours successifs : la 1re carte de chaque élément (ordre d'échéance), puis la 2e, etc.
  const rounds: T[][] = [];
  const seen = new Map<string, number>();
  for (const c of cards) {
    const n = seen.get(c.itemId) ?? 0;
    seen.set(c.itemId, n + 1);
    (rounds[n] ??= []).push(c);
  }
  return rounds.flat();
}

export async function dueCountByTrack(now = Date.now()): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await db.cards
    .where('due')
    .belowOrEqual(now)
    .each((c) => {
      out[c.track] = (out[c.track] ?? 0) + 1;
    });
  return out;
}
