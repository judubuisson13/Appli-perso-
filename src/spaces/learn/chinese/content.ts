import hsk1Raw from '../../../../content/chinese/hsk1.json';
import tonesRaw from '../../../../content/chinese/tones.json';
import { zhDeck, zhTones, type ZhWord } from '../../../content/schemas';
import { toneOf } from './pinyin';

export const TRACK = 'zh';

export const hsk1 = zhDeck.parse(hsk1Raw);
export const toneSyllables = zhTones.parse(tonesRaw).syllables.map((s) => ({ ...s, tone: toneOf(s.pinyin) }));

export const wordsById = new Map<string, ZhWord>(hsk1.words.map((w) => [w.id, w]));
export const lessonById = new Map(hsk1.lessons.map((l) => [l.id, l]));

export function lessonWords(lessonId: string): ZhWord[] {
  return (lessonById.get(lessonId)?.words ?? []).map((id) => wordsById.get(id)!);
}

/** Caractères distincts des mots du deck (ceux qu'on apprend à tracer). */
export const hsk1Chars = [...new Set(hsk1.words.flatMap((w) => [...w.hanzi]))];
