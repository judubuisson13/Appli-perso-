import { db } from '../../../core/db';
import type { TrackModule } from '../../../core/modules';
import { lnCards } from './cards';
import { deck, TRACK } from './content';

export const lingalaModule: TrackModule = {
  id: TRACK,
  label: 'Lingala',
  short: 'Lingala',
  glyph: 'Ln',
  color: 'var(--sport)',
  path: '/learn/ln',
  ready: true,
  pitch: 'Salutations, politesse, dialogues. Contenu vérifiable, audio enregistré par toi.',
  cards: lnCards,
  async getTodayItems({ today }) {
    const done = new Set((await db.lessonProgress.where('track').equals(TRACK).toArray()).map((p) => p.id));
    const refs = new Set((await db.activity.where('day').equals(today).toArray()).map((a) => a.ref));
    const doneToday = deck.lessons.find((l) => refs.has(`lesson:${l.id}`));
    const next = doneToday ?? deck.lessons.find((l) => !done.has(l.id));
    if (next) {
      return [
        {
          id: `ln-${next.id}`,
          space: 'learn' as const,
          track: TRACK,
          title: `Lingala · ${next.title}`,
          detail: `${next.items.length} expressions`,
          minutes: 6,
          to: `/learn/ln/lesson/${next.id}`,
          ref: `lesson:${next.id}`,
          done: !!doneToday,
        },
      ];
    }
    // Toutes les leçons faites : on propose le dialogue.
    const d = deck.dialogues[0];
    if (!d) return [];
    return [
      {
        id: `ln-${d.id}`,
        space: 'learn' as const,
        track: TRACK,
        title: `Lingala · Dialogue : ${d.title}`,
        minutes: 4,
        to: `/learn/ln/dialogue/${d.id}`,
        ref: `dialogue:${d.id}`,
      },
    ];
  },
};
