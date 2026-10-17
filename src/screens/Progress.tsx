import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../core/db';
import { dayKey, lastDays } from '../core/dates';
import { badges, levelInfo, streakInfo } from '../core/gamification';
import { isMastered, SrsPhase } from '../core/srs';
import { PageTitle, ProgressBar } from '../ui/kit';
import { TRACKS } from '../spaces/registry';
import { hsk1, hsk1Chars, TRACK as ZH } from '../spaces/learn/chinese/content';
import { TONE_INFO, type Tone } from '../spaces/learn/chinese/pinyin';
import type { ToneStats } from '../spaces/learn/chinese/toneDrill';

async function load() {
  const [activity, cards, logs, toneRow] = await Promise.all([
    db.activity.toArray(),
    db.cards.toArray(),
    db.reviewLogs.where('ts').above(Date.now() - 30 * 864e5).toArray(),
    db.settings.get('zh.toneStats'),
  ]);
  const today = dayKey();
  const streak = streakInfo(new Set(activity.map((a) => a.day)), today);
  const perDay = new Map<string, number>();
  for (const a of activity) perDay.set(a.day, (perDay.get(a.day) ?? 0) + a.minutes);

  const tracks = TRACKS.filter((t) => t.ready).map((t) => {
    const tc = cards.filter((c) => c.track === t.id);
    const tl = logs.filter((l) => l.track === t.id);
    return {
      track: t,
      xp: activity.filter((a) => a.track === t.id).reduce((s, a) => s + a.xp, 0),
      total: tc.length,
      learning: tc.filter((c) => c.srs.state !== SrsPhase.Review).length,
      mastered: tc.filter((c) => isMastered(c.srs)).length,
      retention: tl.length ? tl.filter((l) => l.grade > 1).length / tl.length : null,
    };
  });

  const zhWords = new Set(cards.filter((c) => c.track === ZH).map((c) => c.itemId)).size;
  const traced = new Set(activity.filter((a) => a.type === 'trace').map((a) => a.data?.char)).size;
  const toneScores = activity.filter((a) => a.type === 'tones').map((a) => Number(a.data?.score ?? 0));

  return {
    streak,
    totalXp: activity.reduce((s, a) => s + a.xp, 0),
    days: lastDays(today, 14).map((d) => ({ d, m: perDay.get(d) ?? 0 })),
    tracks,
    zh: { words: zhWords, traced, tones: (toneRow?.value ?? {}) as ToneStats },
    badges: badges({
      activeDays: perDay.size,
      bestStreak: streak.best,
      reviews: await db.reviewLogs.count(),
      wordsLearned: zhWords,
      bestToneScore: Math.max(0, ...toneScores),
      charsTraced: traced,
    }),
  };
}

export function Progress() {
  const data = useLiveQuery(load, []);
  if (!data) return null;
  const maxM = Math.max(5, ...data.days.map((d) => d.m));
  const global = levelInfo(data.totalXp);

  return (
    <div className="stack">
      <PageTitle title="Progression" />
      <div className="card stack">
        <div className="stat-row" style={{ marginTop: 0 }}>
          <div className="stat">
            <b>{data.streak.current}</b>
            <span>jours de série</span>
          </div>
          <div className="stat">
            <b>{data.streak.best}</b>
            <span>meilleure série</span>
          </div>
          <div className="stat">
            <b>{data.totalXp}</b>
            <span>XP · niv. {global.level}</span>
          </div>
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Minutes de pratique, 14 derniers jours
          </div>
          <div className="spark" aria-label="Minutes par jour">
            {data.days.map(({ d, m }) => (
              <span key={d} className={m ? '' : 'zero'} style={{ height: `${(m / maxM) * 100}%` }} title={`${d} : ${Math.round(m)} min`} />
            ))}
          </div>
        </div>
      </div>

      <h2 className="section-title">Par parcours</h2>
      {data.tracks.map((t) => {
        const lvl = levelInfo(t.xp);
        return (
          <div key={t.track.id} className="card stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>{t.track.label}</b>
              <span className="chip">Niveau {lvl.level}</span>
            </div>
            <ProgressBar value={lvl.progress} label={`Niveau ${t.track.label}`} />
            <div className="stat-row" style={{ marginTop: 0 }}>
              <div className="stat">
                <b>{t.total}</b>
                <span>cartes</span>
              </div>
              <div className="stat">
                <b>{t.mastered}</b>
                <span>maîtrisées</span>
              </div>
              <div className="stat">
                <b>{t.retention === null ? '—' : `${Math.round(t.retention * 100)} %`}</b>
                <span>rétention 30 j</span>
              </div>
            </div>
            {t.track.id === ZH && (
              <div className="stack" style={{ gap: 8 }}>
                <h3 style={{ margin: '8px 0 0' }}>Compétences</h3>
                <Skill label={`Vocabulaire ${hsk1.level}`} value={data.zh.words / hsk1.words.length} detail={`${data.zh.words} / ${hsk1.words.length} mots`} />
                <Skill label="Caractères tracés" value={data.zh.traced / hsk1Chars.length} detail={`${data.zh.traced} / ${hsk1Chars.length}`} />
                {([1, 2, 3, 4] as Tone[]).map((tone) => {
                  const s = data.zh.tones[tone];
                  const acc = s?.seen ? 1 - s.wrong / s.seen : 0;
                  return <Skill key={tone} label={`Oreille · ${TONE_INFO[tone].name}`} value={acc} detail={s?.seen ? `${Math.round(acc * 100)} % sur ${s.seen}` : 'pas encore testé'} />;
                })}
              </div>
            )}
          </div>
        );
      })}

      <h2 className="section-title">Badges</h2>
      <div className="badge-grid">
        {data.badges.map((b) => (
          <div key={b.id} className={`badge ${b.earned ? 'earned' : ''}`}>
            <b>{b.label}</b>
            <div className="muted">{b.hint}</div>
            <span className="sr-only">{b.earned ? 'obtenu' : 'pas encore obtenu'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skill({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="row small" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span className="muted">{detail}</span>
      </div>
      <ProgressBar value={value} label={label} />
    </div>
  );
}
