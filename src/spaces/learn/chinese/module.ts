import { db } from '../../../core/db';
import type { TrackModule } from '../../../core/modules';
import { zhCards } from './cards';
import { hsk1, TRACK } from './content';

export const chineseModule: TrackModule = {
  id: TRACK,
  label: 'Chinois mandarin',
  short: 'Chinois',
  glyph: '中',
  color: 'var(--t1)',
  path: '/learn/zh',
  ready: true,
  pitch: 'Tons, caractères, vocabulaire HSK en répétition espacée.',
  cards: zhCards,
  async getTodayItems({ today }) {
    const progress = await db.lessonProgress.where('track').equals(TRACK).toArray();
    const done = new Set(progress.map((p) => p.id));
    const todayActs = await db.activity.where('day').equals(today).filter((a) => a.track === TRACK).toArray();
    const doneTodayRefs = new Set(todayActs.map((a) => a.ref));

    const items = [];
    const doneToday = hsk1.lessons.find((l) => doneTodayRefs.has(`lesson:${l.id}`));
    const next = doneToday ?? hsk1.lessons.find((l) => !done.has(l.id));
    if (next) {
      const n = hsk1.lessons.indexOf(next) + 1;
      items.push({
        id: `zh-lesson-${next.id}`,
        space: 'learn' as const,
        track: TRACK,
        title: `Chinois · Leçon ${n} : ${next.title}`,
        detail: `${next.words.length} mots HSK 1`,
        minutes: 8,
        to: `/learn/zh/lesson/${next.id}`,
        ref: `lesson:${next.id}`,
        done: !!doneToday,
      });
    }
    items.push({
      id: 'zh-tones',
      space: 'learn' as const,
      track: TRACK,
      title: 'Chinois · Oreille des tons',
      detail: '12 écoutes, centrées sur tes tons faibles',
      minutes: 3,
      to: '/learn/zh/tones',
      ref: 'zh:tones',
      done: doneTodayRefs.has('zh:tones'),
    });
    return items;
  },
};
