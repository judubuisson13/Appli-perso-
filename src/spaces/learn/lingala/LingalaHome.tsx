import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Layers, MessagesSquare } from 'lucide-react';
import { db } from '../../../core/db';
import { PageTitle } from '../../../ui/kit';
import { deck, lessonEntries, loadDialogues, loadEntries, TRACK } from './content';
import { StatusBadge } from './ui';

export function LingalaHome() {
  const data = useLiveQuery(async () => {
    const [entries, dialogues, progress, due] = await Promise.all([
      loadEntries(),
      loadDialogues(),
      db.lessonProgress.where('track').equals(TRACK).toArray(),
      db.cards.where('[track+due]').between([TRACK, 0], [TRACK, Date.now()]).count(),
    ]);
    return { entries, dialogues, done: new Map(progress.map((p) => [p.id, p])), due };
  }, []);
  if (!data) return null;
  const toVerify = data.entries.filter((e) => e.status === 'to-verify').length;
  const userCount = data.entries.filter((e) => e.userCreated).length;
  const lessons = [...deck.lessons, ...(userCount ? [{ id: 'ln-user', title: 'Mes ajouts', items: [] as string[] }] : [])];

  return (
    <div className="stack">
      <PageTitle title="Lingala" sub="Bases du quotidien, à valider avec un locuteur natif." back="/learn" />
      {toVerify > 0 && (
        <div className="notice">
          <b>{toVerify} expression{toVerify > 1 ? 's' : ''} à vérifier.</b> Ce contenu a été rédigé sans relecture native : il peut contenir
          des erreurs d’orthographe ou d’usage. Corrige-le et enregistre la prononciation depuis le lexique.
        </div>
      )}
      <div className="grid-2">
        <Link to={`/review?track=${TRACK}`} className="card lesson-row">
          <Layers size={22} />
          <span>
            <b>Réviser</b>
            <br />
            <span className="muted small">{data.due ? `${data.due} carte${data.due > 1 ? 's' : ''} à revoir` : 'Rien à revoir pour l’instant'}</span>
          </span>
        </Link>
        <Link to="/learn/ln/lexicon" className="card lesson-row">
          <BookOpen size={22} />
          <span>
            <b>Lexique et vérification</b>
            <br />
            <span className="muted small">
              {data.entries.length} entrées · {data.entries.filter((e) => e.audioCount).length} avec audio
            </span>
          </span>
        </Link>
      </div>

      <h2 className="section-title">Leçons</h2>
      {lessons.map((l, i) => {
        const p = data.done.get(l.id);
        const items = lessonEntries(l.id, data.entries);
        return (
          <Link key={l.id} to={`/learn/ln/lesson/${l.id}`} className="card lesson-row">
            <span className={`lesson-num ${p ? 'done' : ''}`}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{l.title}</b>
              <br />
              <span className="muted small" lang="ln">
                {items.map((e) => e.ln).join(' · ')}
              </span>
            </span>
            {p && <span className="chip ok">{Math.round(p.bestScore * 100)} %</span>}
          </Link>
        );
      })}

      <h2 className="section-title">Dialogues</h2>
      {data.dialogues.map((d) => (
        <Link key={d.id} to={`/learn/ln/dialogue/${d.id}`} className="card lesson-row">
          <MessagesSquare size={22} />
          <span style={{ flex: 1 }}>
            <b>{d.title}</b>
            <br />
            <span className="muted small">{d.lines.length} répliques</span>
          </span>
          <StatusBadge status={d.status} />
        </Link>
      ))}
      <p className="small muted">
        Famille, nombres, conjugaison et expressions courantes arrivent dans les phases suivantes. Tu peux déjà ajouter tes propres
        expressions, une par une ou par import CSV (Réglages › Mon contenu).
      </p>
    </div>
  );
}
