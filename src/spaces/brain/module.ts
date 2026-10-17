import type { SpaceModule } from '../../core/modules';
import { db } from '../../core/db';
import { gameOfDay, GAMES } from './stats';

export const brainSpace: SpaceModule = {
  id: 'brain',
  label: 'Cerveau',
  path: '/brain',
  ready: true,
  async getTodayItems({ today }) {
    const g = gameOfDay(today);
    const played = await db.activity.where('day').equals(today).filter((a) => a.type === 'brain').count();
    return [
      {
        id: `brain-${g}`,
        space: 'brain',
        title: `Cerveau · ${GAMES[g].title}`,
        detail: 'Mini-jeu du jour',
        minutes: GAMES[g].minutes,
        to: `/brain/${g}`,
        ref: `brain:${g}`,
        done: played > 0,
      },
    ];
  },
};
