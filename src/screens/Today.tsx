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
import { ProgressBar } from '../ui/kit';
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
      <section className="card">
        <div className="hero">
          <div>
            <p className="muted small" style={{ margin: 0, textTransform: 'capitalize' }}>
              {dateLabel}
            </p>
            <h1 style={{ margin: 0 }}>{greeting()} !</h1>
          </div>
          <span className="chip" title="Série de jours" style={{ fontSize: '1rem' }}>
            <Flame size={18} color={data.streak.doneToday ? 'var(--accent)' : undefined} /> {data.streak.current}
          </span>
        </div>
        <div className="stat-row">
          <div className="stat">
            <b>{Math.round(data.remaining)} min</b>
            <span>restantes estimées</span>
          </div>
          <div className="stat">
            <b>{Math.round(data.minutesDone)} / {dailyGoalMinutes}</b>
            <span>min · objectif</span>
          </div>
          <div className="stat">
            <b>+{data.xpToday}</b>
            <span>XP aujourd’hui</span>
          </div>
        </div>
        <div style={{ marginTop: 12 }} className="stack">
          <div className="row small muted" style={{ gap: 6 }}>
            <Target size={16} />
            {goal >= 1 ? 'Objectif du jour atteint. Le reste est du bonus.' : `Objectif : ${dailyGoalMinutes} minutes de pratique`}
          </div>
          <ProgressBar value={goal} label="Objectif du jour" />
        </div>
        {!data.streak.doneToday && data.streak.current > 0 && (
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            Une seule activité aujourd’hui suffit pour prolonger ta série de {data.streak.current} jour{data.streak.current > 1 ? 's' : ''}.
          </p>
        )}
      </section>

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
