import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronRight, Flame, Target, Timer } from 'lucide-react';
import { db } from '../core/db';
import { dayKey } from '../core/dates';
import { dueCountByTrack } from '../core/cards';
import { toggleManualCheck } from '../core/activity';
import { streakInfo, XP } from '../core/gamification';
import { OFF_APP, resolveToday, reviewItem } from '../core/today';
import type { TodayItem } from '../core/modules';
import { useSettings } from '../core/settings';
import { CountUp, GoalRing } from '../ui/motion';
import { SPACES, TRACKS } from '../spaces/registry';

async function loadToday() {
  const now = Date.now();
  const today = dayKey(now);
  const dueByTrack = await dueCountByTrack(now);
  const readyTracks = new Set(TRACKS.filter((t) => t.ready).map((t) => t.id));
  const due = Object.entries(dueByTrack).reduce((a, [t, n]) => a + (readyTracks.has(t) ? n : 0), 0);
  const todayActivity = await db.activity.where('day').equals(today).toArray();
  const ctx = { now, today, dueByTrack };
  const moduleItems = (await Promise.all(SPACES.filter((s) => s.getTodayItems).map((s) => s.getTodayItems!(ctx)))).flat();
  const rev = reviewItem(due, todayActivity.some((a) => a.ref === 'review'));
  const days = await db.activity.orderBy('day').uniqueKeys();
  return {
    ...resolveToday(rev ? [rev, ...moduleItems] : moduleItems, todayActivity),
    offApp: resolveToday(OFF_APP, todayActivity).items,
    streak: streakInfo(days as string[], today),
  };
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
}

export function Today() {
  const data = useLiveQuery(loadToday, []);
  const { dailyGoalMinutes } = useSettings();
  if (!data) return null;
  const goal = Math.min(1, data.minutesDone / dailyGoalMinutes);
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="stack">
      <section className="hero" style={{ padding: '12px 0 4px' }}>
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <span className="eyebrow">{dateLabel}</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.6rem, 11vw, 3.6rem)' }}>{greeting()}.</h1>
          <span className={`flame ${data.streak.doneToday ? 'lit' : ''}`} title="Série de jours">
            <Flame size={22} strokeWidth={1.5} />
            <CountUp value={data.streak.current} />
            <span className="small muted" style={{ fontFamily: 'var(--font-body)' }}>
              jour{data.streak.current > 1 ? 's' : ''} de suite
            </span>
          </span>
        </div>
        <GoalRing value={goal}>
          <span>
            <b>
              <CountUp value={Math.round(data.minutesDone)} />
            </b>
            <span>/ {dailyGoalMinutes} min</span>
          </span>
        </GoalRing>
      </section>
      <div className="stat-row" style={{ marginTop: 0 }}>
        <div className="stat">
          <b>
            <CountUp value={Math.round(data.remaining)} />
          </b>
          <span>min restantes</span>
        </div>
        <div className="stat">
          <b>
            <CountUp value={data.items.filter((i) => i.done).length} />
            <span style={{ color: 'var(--faint)', fontSize: '1.1rem' }}> / {data.items.length}</span>
          </b>
          <span>fait</span>
        </div>
        <div className="stat">
          <b>
            +<CountUp value={data.xpToday} />
          </b>
          <span>XP du jour</span>
        </div>
      </div>
      <p className="small muted" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Target size={15} color="var(--accent)" />
        {goal >= 1
          ? 'Objectif du jour atteint. Le reste est du bonus.'
          : !data.streak.doneToday && data.streak.current > 0
            ? `Une activité suffit pour prolonger ta série de ${data.streak.current} jour${data.streak.current > 1 ? 's' : ''}.`
            : `Objectif : ${dailyGoalMinutes} minutes de pratique.`}
      </p>

      <h2 className="section-title">Au programme</h2>
      <div className="stack">
        {data.items.length === 0 && <p className="muted">Rien de prévu. Lance une leçon depuis « Apprendre ».</p>}
        {data.items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </div>

      <h2 className="section-title">Fait hors de l’appli</h2>
      <div className="stack">
        {data.offApp.map((item) => (
          <Row key={item.id} item={item} manualOnly />
        ))}
      </div>
    </div>
  );
}

function Row({ item, manualOnly = false }: { item: TodayItem; manualOnly?: boolean }) {
  // Un élément fait dans l'appli reste fait ; seule une coche manuelle peut être retirée.
  const locked = !!item.done && !item.checked;
  const toggle = () => {
    if (!locked) void toggleManualCheck(item.ref, item.space, item.minutes, XP.manualCheck);
  };
  return (
    <div className={`today-item ${item.done ? 'done' : ''}`} data-space={item.space}>
      <button
        className={`check ${item.done ? 'on' : ''}`}
        onClick={toggle}
        aria-pressed={item.done}
        disabled={locked}
        aria-label={item.done ? `Décocher : ${item.title}` : `Marquer comme fait : ${item.title}`}
      >
        {item.done && <Check size={18} />}
      </button>
      {manualOnly ? (
        <div>
          <div className="title">{item.title}</div>
          <div className="small muted">{item.minutes ? `${item.minutes} min · ` : ''}{item.detail}</div>
        </div>
      ) : (
        <Link to={item.to} className="go">
          <div className="title">{item.title}</div>
          <div className="small muted">
            <Timer size={12} /> {item.minutes} min{item.detail ? ` · ${item.detail}` : ''}
          </div>
        </Link>
      )}
      {!manualOnly && (
        <Link to={item.to} className="icon-btn" aria-label={`Ouvrir : ${item.title}`}>
          <ChevronRight size={20} />
        </Link>
      )}
    </div>
  );
}
