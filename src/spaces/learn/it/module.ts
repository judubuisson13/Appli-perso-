import { db } from '../../../core/db';
import type { TrackModule } from '../../../core/modules';
import { itCards } from './cards';
import { CYBER_STEPS, TRACK } from './content';

export const itModuleTrack: TrackModule = {
  id: TRACK,
  label: 'Informatique « DSI »',
  short: 'Info',
  glyph: '⛨',
  color: 'var(--brain)',
  path: '/learn/it',
  ready: true,
  pitch: 'Comprendre les enjeux. Cybersécurité d’abord : fiche, quiz, flashcards, phishing.',
  cards: itCards,
  async getTodayItems({ today }) {
    const done = new Set((await db.lessonProgress.where('track').equals(TRACK).toArray()).map((p) => p.id));
    const refs = new Set((await db.activity.where('day').equals(today).toArray()).map((a) => a.ref));
    const doneToday = CYBER_STEPS.find((s) => refs.has(`lesson:${s.id}`));
    const next = doneToday ?? CYBER_STEPS.find((s) => !done.has(s.id));
    if (!next) return [];
    return [
      {
        id: `it-${next.id}`,
        space: 'learn' as const,
        track: TRACK,
        title: `Cyber · ${next.title}`,
        minutes: next.minutes,
        to: next.path,
        ref: `lesson:${next.id}`,
        done: !!doneToday,
      },
    ];
  },
};
