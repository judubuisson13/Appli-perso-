import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, NotebookPen, Play, Timer } from 'lucide-react';
import { db } from '../../core/db';
import { dayKey } from '../../core/dates';
import { PageTitle, ProgressBar } from '../../ui/kit';
import { chainById, maxStep, sport } from './content';
import { advance, chainState, plannedSession } from './logic';
import { getDays, getProgram, setDays, setProgram } from './store';

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEK_FULL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function SportHome() {
  const data = useLiveQuery(async () => {
    const [program, days, count, last] = await Promise.all([getProgram(), getDays(), db.workouts.count(), db.workouts.orderBy('ts').last()]);
    return { program, days, count, last };
  }, []);
  if (!data) return null;
  const today = dayKey();
  const planned = plannedSession(data.days, today, sport.program.sessions.map((s) => s.id), data.count);
  const nextId = sport.program.sessions[data.count % sport.program.sessions.length].id;
  const threshold = sport.program.validationsToProgress;

  return (
    <div className="stack" data-space="sport">
      <PageTitle title="Sport" sub={`${sport.program.title} · ${sport.program.sessionsPerWeek} séances par semaine`} />
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>{planned ? `Aujourd’hui : séance ${planned}` : 'Pas de séance prévue aujourd’hui'}</b>
          {data.last && <span className="small muted">Dernière : {new Date(data.last.ts).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
        </div>
        <Link to={`/sport/session/${planned ?? nextId}`} className="btn primary">
          <Play size={18} /> Lancer la séance {planned ?? nextId}
        </Link>
        <div className="row small muted" style={{ gap: 6 }}>
          Mes jours :
          {WEEK.map((d, i) => {
            const n = i + 1;
            const on = data.days.includes(n);
            return (
              <button
                key={n}
                className="btn"
                style={{ minHeight: 36, padding: '4px 10px', ...(on ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' } : {}) }}
                aria-pressed={on}
                aria-label={`${on ? 'Retirer' : 'Ajouter'} le ${WEEK_FULL[i]}`}
                onClick={() => void setDays(on ? data.days.filter((x) => x !== n) : [...data.days, n])}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid-2">
        <Link to="/sport/timer" className="card lesson-row">
          <Timer size={22} />
          <span>
            <b>Minuteur</b>
            <br />
            <span className="muted small">Tabata, intervalles, circuits, repos</span>
          </span>
        </Link>
        <Link to="/sport/journal" className="card lesson-row">
          <NotebookPen size={22} />
          <span>
            <b>Journal</b>
            <br />
            <span className="muted small">{data.count} séance{data.count > 1 ? 's' : ''} · courbes de progression</span>
          </span>
        </Link>
      </div>

      <h2 className="section-title">Mes progressions</h2>
      {sport.chains.map((c) => {
        const st = chainState(data.program, c.id);
        const step = c.steps[st.step];
        const ready = st.validations >= threshold && st.step < maxStep[c.id];
        return (
          <div key={c.id} className="card stack" style={{ gap: 8 }}>
            <Link to={`/sport/exercise/${c.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', textDecoration: 'none' }}>
              <span>
                <b>{c.name}</b> <span className="muted small">· {c.muscles}</span>
                <br />
                <span className="small">
                  Palier {st.step + 1}/{c.steps.length} : {step.name} ({step.sets} × {step.target}
                  {step.metric === 'seconds' ? ' s' : ''})
                </span>
              </span>
              <ChevronRight size={20} />
            </Link>
            <ProgressBar value={(st.step + Math.min(1, st.validations / threshold)) / c.steps.length} label={`Progression ${c.name}`} />
            <span className="small muted">
              Validé {Math.min(st.validations, threshold)}/{threshold} fois à ce palier
            </span>
            {ready && (
              <div className="notice row" style={{ justifyContent: 'space-between' }}>
                <span>Prêt·e pour : {c.steps[st.step + 1].name} ?</span>
                <button className="btn primary" onClick={async () => setProgram(advance(await getProgram(), c.id, 1, maxStep[c.id]))}>
                  Passer au palier suivant
                </button>
              </div>
            )}
          </div>
        );
      })}
      <p className="small muted">Méditation guidée, respiration et tai chi arrivent dans une phase suivante.</p>
    </div>
  );
}

export function ExerciseSheet({ chainId }: { chainId: string }) {
  const program = useLiveQuery(getProgram, []);
  const c = chainById.get(chainId);
  if (!c || !program) return null;
  const st = chainState(program, c.id);
  return (
    <div className="stack" data-space="sport">
      <PageTitle title={c.name} sub={`Muscles : ${c.muscles}. Du plus facile au plus difficile.`} back="/sport" />
      {c.steps.map((s, i) => (
        <div key={s.id} className="card stack" style={{ gap: 6, ...(i === st.step ? { borderColor: 'var(--sport)', borderWidth: 2 } : {}) }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>
              {i + 1}. {s.name}
            </b>
            {i === st.step && <span className="chip ok">ton palier</span>}
          </div>
          <span className="small">
            Objectif : {s.sets} séries de {s.target}
            {s.metric === 'seconds' ? ' secondes' : ' répétitions'}
          </span>
          <span className="small muted">Consignes</span>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {s.cues.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {s.mistakes.length > 0 && (
            <>
              <span className="small muted">Erreurs fréquentes</span>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {s.mistakes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          {i !== st.step && (
            <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={async () => setProgram({ ...(await getProgram()), [c.id]: { step: i, validations: 0 } })}>
              {i < st.step ? 'Revenir à cette variante plus facile' : 'Choisir cette variante'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
