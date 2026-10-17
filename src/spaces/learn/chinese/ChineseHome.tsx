import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Brush, Ear, Layers } from 'lucide-react';
import { db } from '../../../core/db';
import { levelInfo } from '../../../core/gamification';
import { PageTitle, ProgressBar } from '../../../ui/kit';
import { hsk1, lessonById, TRACK, wordsById } from './content';

export function ChineseHome() {
  const data = useLiveQuery(async () => {
    const [progress, due, xpRows, cards] = await Promise.all([
      db.lessonProgress.where('track').equals(TRACK).toArray(),
      db.cards.where('[track+due]').between([TRACK, 0], [TRACK, Date.now()]).count(),
      db.activity.where('track').equals(TRACK).toArray(),
      db.cards.where('track').equals(TRACK).count(),
    ]);
    return {
      done: new Map(progress.map((p) => [p.id, p])),
      due,
      xp: xpRows.reduce((a, r) => a + r.xp, 0),
      words: cards / 2,
    };
  }, []);
  if (!data) return null;
  const lvl = levelInfo(data.xp);

  return (
    <div className="stack">
      <PageTitle title="Chinois mandarin" sub={`${hsk1.level} · ${data.words} / ${hsk1.words.length} mots appris`} back="/learn" />
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>Niveau {lvl.level}</b>
          <span className="muted small">
            {data.xp} / {lvl.next} XP
          </span>
        </div>
        <ProgressBar value={lvl.progress} label="Progression du niveau" />
      </div>

      <div className="grid-2">
        <Link to={`/review?track=${TRACK}`} className="card lesson-row">
          <Layers size={22} />
          <span>
            <b>Réviser</b>
            <br />
            <span className="muted small">{data.due ? `${data.due} carte${data.due > 1 ? 's' : ''} à revoir` : 'Rien à revoir pour l’instant'}</span>
          </span>
        </Link>
        <Link to="/learn/zh/tones" className="card lesson-row">
          <Ear size={22} />
          <span>
            <b>Oreille des tons</b>
            <br />
            <span className="muted small">3 minutes d’écoute ciblée</span>
          </span>
        </Link>
        <Link to="/learn/zh/trace" className="card lesson-row">
          <Brush size={22} />
          <span>
            <b>Tracer les caractères</b>
            <br />
            <span className="muted small">Ordre des traits avec correction</span>
          </span>
        </Link>
      </div>

      <h2 className="section-title">Leçons</h2>
      <div className="stack">
        {[...lessonById.values()].map((l, i) => {
          const p = data.done.get(l.id);
          return (
            <Link key={l.id} to={`/learn/zh/lesson/${l.id}`} className="card lesson-row">
              <span className={`lesson-num ${p ? 'done' : ''}`}>{i + 1}</span>
              <span style={{ flex: 1 }}>
                <b>{l.title}</b>
                <br />
                <span className="muted small" lang="zh-CN">
                  {l.words
                    .map((id) => wordsById.get(id)?.hanzi)
                    .join(' ')}
                </span>
              </span>
              {p && <span className="chip ok">{Math.round(p.bestScore * 100)} %</span>}
            </Link>
          );
        })}
      </div>
      <p className="small muted">
        Dialogues de la vie réelle, radicaux et HSK 2–3 arrivent dans les phases suivantes.
      </p>
    </div>
  );
}
