import { pickDistractors, shuffle, type Rng } from '../../../core/random';

export type LnExerciseType = 'discover' | 'meaning' | 'reverse' | 'listen' | 'write';

export interface LnExercise {
  key: string;
  type: LnExerciseType;
  itemId: string;
  options?: string[];
}

export const LN_GRADED: Record<LnExerciseType, boolean> = { discover: false, meaning: true, reverse: true, listen: true, write: true };

interface Entry {
  id: string;
  ln: string;
  fr: string;
  audioCount: number;
}

/**
 * Leçon lingala : découverte par groupes, puis QCM sens / traduction, écoute si un enregistrement existe,
 * et une traduction à taper par groupe.
 */
export function buildLnLesson(items: Entry[], pool: Entry[], rng: Rng, groupSize = 4): LnExercise[] {
  const out: LnExercise[] = [];
  const mcq = (type: LnExerciseType, e: Entry): LnExercise => {
    const distractors = pickDistractors(pool, (x) => x.id === e.id || x.ln === e.ln || x.fr === e.fr, 3, rng);
    return { key: `${type}:${e.id}`, type, itemId: e.id, options: shuffle([e, ...distractors], rng).map((x) => x.id) };
  };
  for (let i = 0; i < items.length; i += groupSize) {
    const group = items.slice(i, i + groupSize);
    for (const e of group) out.push({ key: `discover:${e.id}`, type: 'discover', itemId: e.id });
    const drills = group.flatMap((e) => {
      const list = [mcq('meaning', e), mcq('reverse', e)];
      if (e.audioCount > 0) list.push(mcq('listen', e));
      return list;
    });
    out.push(...shuffle(drills, rng));
    const w = shuffle(group, rng)[0];
    out.push({ key: `write:${w.id}`, type: 'write', itemId: w.id });
  }
  return out;
}
