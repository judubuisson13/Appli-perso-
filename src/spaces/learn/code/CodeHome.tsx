import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers, Lock } from 'lucide-react';
import { db } from '../../../core/db';
import { PageTitle } from '../../../ui/kit';
import { chapters, TRACK } from './content';

export function CodeHome() {
  const data = useLiveQuery(async () => {
    const [progress, due] = await Promise.all([
      db.lessonProgress.where('track').equals(TRACK).toArray(),
      db.cards.where('[track+due]').between([TRACK, 0], [TRACK, Date.now()]).count(),
    ]);
    return { done: new Set(progress.map((p) => p.id)), due };
  }, []);
  if (!data) return null;
  return (
    <div className="stack">
      <PageTitle title="Code : la mission" sub="Chaque mission débloque la suivante. Ton code tourne dans le navigateur, hors ligne." back="/learn" />
      {chapters.map((c, ci) => {
        let unlocked = true;
        return (
          <section key={c.id} className="stack">
            <div className="card stack">
              <span className="muted small">Chapitre {ci + 1} · Python</span>
              <h2 style={{ margin: 0 }}>{c.title}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {c.intro}
              </p>
              <span className="small">
                {c.missions.filter((m) => data.done.has(m.id)).length} / {c.missions.length} missions
              </span>
            </div>
            {c.missions.map((m, i) => {
              const done = data.done.has(m.id);
              const open = unlocked;
              unlocked = unlocked && done;
              const body = (
                <>
                  <span className={`lesson-num ${done ? 'done' : ''}`}>{open ? i + 1 : <Lock size={16} />}</span>
                  <span style={{ flex: 1 }}>
                    <b>{m.title}</b>
                    <br />
                    <span className="muted small">{m.skill}</span>
                  </span>
                </>
              );
              return open ? (
                <Link key={m.id} to={`/learn/code/${m.id}`} className="card lesson-row">
                  {body}
                </Link>
              ) : (
                <div key={m.id} className="card lesson-row" style={{ opacity: 0.55 }} aria-disabled="true">
                  {body}
                </div>
              );
            })}
            {c.missions.every((m) => data.done.has(m.id)) && <p className="notice">{c.outro}</p>}
          </section>
        );
      })}
      <Link to={`/review?track=${TRACK}`} className="card lesson-row">
        <Layers size={22} />
        <span>
          <b>Réviser les notions</b>
          <br />
          <span className="muted small">{data.due ? `${data.due} carte${data.due > 1 ? 's' : ''} à revoir` : 'Chaque mission réussie ajoute ses notions à la file'}</span>
        </span>
      </Link>
      <p className="small muted">Suite du parcours : structures de données, Git, ligne de commande, SQL, API et HTTP, scripts d’automatisation.</p>
    </div>
  );
}
