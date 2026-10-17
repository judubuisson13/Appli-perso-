import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/db';
import { PageTitle } from '../../ui/kit';
import { chainById, sport } from './content';

const FEELINGS = ['', 'Épuisé·e', 'Dur', 'Correct', 'Bien', 'En forme'];

export function Journal() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('ts').toArray(), []);
  if (!workouts) return null;
  const recent = [...workouts].reverse();
  return (
    <div className="stack" data-space="sport">
      <PageTitle title="Journal" sub={`${workouts.length} séance${workouts.length > 1 ? 's' : ''} enregistrée${workouts.length > 1 ? 's' : ''}`} back="/sport" />
      {workouts.length === 0 && <p className="empty muted">Ta première séance apparaîtra ici, avec tes courbes de progression.</p>}
      {workouts.length > 0 && (
        <>
          <h2 className="section-title">Progression par exercice</h2>
          <div className="grid-2">
            {sport.chains.map((c) => {
              const points = workouts
                .map((w) => w.entries.find((e) => e.chain === c.id))
                .filter((e): e is NonNullable<typeof e> => !!e && e.sets.length > 0)
                .map((e) => ({ total: e.sets.reduce((a, b) => a + b, 0), metric: e.metric, step: e.stepId }))
                .slice(-12);
              if (points.length === 0) return null;
              const max = Math.max(1, ...points.map((p) => p.total));
              const last = points.at(-1)!;
              return (
                <div key={c.id} className="card stack" style={{ gap: 6 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b>{c.name}</b>
                    <span className="small muted">
                      dernière : {last.total} {last.metric === 'seconds' ? 's' : 'reps'}
                    </span>
                  </div>
                  <div className="spark" style={{ height: 48 }} aria-label={`Total par séance : ${points.map((p) => p.total).join(', ')}`}>
                    {points.map((p, k) => (
                      <span key={k} style={{ height: `${(p.total / max) * 100}%`, background: 'var(--sport)' }} title={`${p.total}`} />
                    ))}
                  </div>
                  <span className="small muted">Total des séries, {points.length} dernières séances</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <h2 className="section-title">Séances</h2>
      {recent.map((w) => (
        <div key={w.id} className="card stack" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{new Date(w.ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
            <span className="small muted">
              {Math.round(w.minutes)} min{w.feeling ? ` · ${FEELINGS[w.feeling]}` : ''}
            </span>
          </div>
          {w.entries.map((e) => {
            const step = chainById.get(e.chain)?.steps.find((s) => s.id === e.stepId);
            return (
              <div key={e.chain} className="row small" style={{ justifyContent: 'space-between' }}>
                <span>{step?.name ?? e.stepId}</span>
                <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {e.sets.join(' · ')} {e.metric === 'seconds' ? 's' : ''} (obj. {e.target})
                </span>
              </div>
            );
          })}
          {w.note && <span className="small muted">« {w.note} »</span>}
        </div>
      ))}
    </div>
  );
}
