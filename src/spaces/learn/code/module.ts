import { db } from '../../../core/db';
import type { TrackModule } from '../../../core/modules';
import { codeCards } from './cards';
import { missionRef, missions, TRACK } from './content';

export const codeModule: TrackModule = {
  id: TRACK,
  label: 'Code : la mission',
  short: 'Code',
  glyph: '</>',
  color: 'var(--learn)',
  path: '/learn/code',
  ready: true,
  pitch: 'Sauve la station Hélios, mission après mission, en Python dans le navigateur.',
  cards: codeCards,
  async getTodayItems({ today }) {
    const done = new Set((await db.lessonProgress.where('track').equals(TRACK).toArray()).map((p) => p.id));
    const refs = new Set((await db.activity.where('day').equals(today).toArray()).map((a) => a.ref));
    const doneToday = missions.find((m) => refs.has(missionRef(m.id)));
    const next = doneToday ?? missions.find((m) => !done.has(m.id));
    if (!next) return [];
    const n = missions.indexOf(next) + 1;
    return [
      {
        id: `code-${next.id}`,
        space: 'learn' as const,
        track: TRACK,
        title: `Code · Mission ${n} : ${next.title}`,
        detail: next.skill,
        minutes: 10,
        to: `/learn/code/${next.id}`,
        ref: missionRef(next.id),
        done: !!doneToday,
      },
    ];
  },
};
