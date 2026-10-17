import { db } from '../../core/db';
import type { SpaceModule } from '../../core/modules';
import { sport } from './content';
import { plannedSession } from './logic';
import { getDays } from './store';

export const sportSpace: SpaceModule = {
  id: 'sport',
  label: 'Sport',
  path: '/sport',
  ready: true,
  async getTodayItems({ today }) {
    const [days, all, todays] = await Promise.all([getDays(), db.workouts.count(), db.workouts.where('day').equals(today).count()]);
    // Le nombre de séances faites avant aujourd'hui décide de A ou B, même après la séance du jour.
    const ids = sport.program.sessions.map((s) => s.id);
    // Une séance faite un jour non prévu compte quand même : on l'affiche comme faite.
    const planned = plannedSession(days, today, ids, all - todays) ?? (todays > 0 ? ids[(all - todays) % ids.length] : null);
    if (!planned) return [];
    const s = sport.program.sessions.find((x) => x.id === planned)!;
    return [
      {
        id: 'sport-session',
        space: 'sport',
        title: `Sport · ${s.title}`,
        detail: s.blocks.map((b) => sport.chains.find((c) => c.id === b.chain)!.name.toLowerCase()).join(', '),
        minutes: 25,
        to: `/sport/session/${planned}`,
        ref: 'sport:session',
        done: todays > 0,
      },
    ];
  },
};
