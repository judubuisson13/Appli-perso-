import { pickDistractors, shuffle, type Rng } from '../../../core/random';
import type { Grade4 } from '../../../core/srs';
import type { ZhWord } from '../../../content/schemas';

export type ExerciseType = 'discover' | 'meaning' | 'listen' | 'reverse' | 'speak' | 'trace';

export interface Exercise {
  key: string;
  type: ExerciseType;
  wordId: string;
  /** Identifiants des mots proposés (QCM), bonne réponse incluse. */
  options?: string[];
}

/** Les exercices notés renvoient l'exercice plus loin en cas d'erreur ; parler et tracer ne pénalisent pas. */
export const GRADED: Record<ExerciseType, boolean> = {
  discover: false,
  meaning: true,
  listen: true,
  reverse: true,
  speak: false,
  trace: false,
};

export interface LessonOptions {
  speak: boolean;
  trace: boolean;
  groupSize?: number;
}

export function buildLesson(words: ZhWord[], deck: ZhWord[], opts: LessonOptions, rng: Rng): Exercise[] {
  const size = opts.groupSize ?? 5;
  const out: Exercise[] = [];
  const mcq = (type: ExerciseType, w: ZhWord): Exercise => {
    // Pas deux propositions identiques à l'écran (他/她 ont le même pinyin, et l'écoute ne les distingue pas).
    const clash = (x: ZhWord) =>
      x.id === w.id || x.hanzi === w.hanzi || (type === 'listen' && x.pinyin === w.pinyin) || x.fr === w.fr;
    const distractors = pickDistractors(deck, clash, 3, rng);
    return { key: `${type}:${w.id}`, type, wordId: w.id, options: shuffle([w, ...distractors], rng).map((x) => x.id) };
  };
  for (let i = 0; i < words.length; i += size) {
    const group = words.slice(i, i + size);
    for (const w of group) out.push({ key: `discover:${w.id}`, type: 'discover', wordId: w.id });
    const drills = shuffle(
      group.flatMap((w) => [mcq('meaning', w), mcq('listen', w), mcq('reverse', w)]),
      rng,
    );
    // Évite deux exercices d'affilée sur le même mot quand c'est possible.
    for (let k = 1; k < drills.length; k++) {
      if (drills[k].wordId === drills[k - 1].wordId) {
        const j = drills.findIndex((d, idx) => idx > k && d.wordId !== drills[k - 1].wordId);
        if (j > 0) [drills[k], drills[j]] = [drills[j], drills[k]];
      }
    }
    out.push(...drills);
    if (opts.speak) for (const w of shuffle(group, rng).slice(0, 2)) out.push({ key: `speak:${w.id}`, type: 'speak', wordId: w.id });
    if (opts.trace) {
      const w = shuffle(group, rng)[0];
      out.push({ key: `trace:${w.id}`, type: 'trace', wordId: w.id });
    }
  }
  return out;
}

/** Note FSRS initiale d'un mot selon les erreurs faites pendant la leçon. */
export function gradeFromMistakes(mistakes: number): Grade4 {
  if (mistakes === 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
}

export function mistakesByWord(mistakes: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, n] of Object.entries(mistakes)) {
    const wordId = key.slice(key.indexOf(':') + 1);
    out[wordId] = (out[wordId] ?? 0) + n;
  }
  return out;
}
