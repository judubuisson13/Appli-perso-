import hsk1Raw from '../../../../content/chinese/hsk1.json';
import tonesRaw from '../../../../content/chinese/tones.json';
import { zhDeck, zhTones, type ZhLesson, type ZhWord } from '../../../content/schemas';
import { db } from '../../../core/db';
import { toneOf } from './pinyin';

export const TRACK = 'zh';

export const hsk1 = zhDeck.parse(hsk1Raw);
export const toneSyllables = zhTones.parse(tonesRaw).syllables.map((s) => ({ ...s, tone: toneOf(s.pinyin) }));

export const wordsById = new Map<string, ZhWord>(hsk1.words.map((w) => [w.id, w]));
export const lessonById = new Map<string, ZhLesson>(hsk1.lessons.map((l) => [l.id, l]));

/** Mes mots ajoutés ou importés (stockés dans contentEdits), chargés au démarrage. */
export let userWords: ZhWord[] = [];
export const USER_LESSON = 'zh-user';

export async function hydrateUserWords() {
  const rows = await db.contentEdits.where('track').equals(TRACK).toArray();
  userWords = rows
    .filter((r) => r.id.startsWith(`${TRACK}:user-`))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .map((r) => ({ ...(r.patch as Omit<ZhWord, 'id'>), id: r.id.slice(TRACK.length + 1) }));
  for (const w of userWords) wordsById.set(w.id, w);
  // La leçon « Mes mots » propose jusqu'à 10 mots pas encore appris.
  const learned = new Set((await db.cards.where('track').equals(TRACK).toArray()).map((c) => c.itemId));
  const fresh = userWords.filter((w) => !learned.has(w.id)).slice(0, 10);
  if (fresh.length) lessonById.set(USER_LESSON, { id: USER_LESSON, title: 'Mes mots', words: fresh.map((w) => w.id) });
  else lessonById.delete(USER_LESSON);
}

export function lessonWords(lessonId: string): ZhWord[] {
  return (lessonById.get(lessonId)?.words ?? []).map((id) => wordsById.get(id)!);
}

/** Caractères distincts des mots du deck (ceux qu'on apprend à tracer). */
export const hsk1Chars = [...new Set(hsk1.words.flatMap((w) => [...w.hanzi]))];
