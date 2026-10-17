import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CardRow } from '../core/db';
import { dueCards, gradeCard } from '../core/cards';
import { logActivity, minutesSince } from '../core/activity';
import { XP } from '../core/gamification';
import { formatInterval, GRADE_LABELS, GRADES, previewIntervals, type Grade4 } from '../core/srs';
import { getSettings } from '../core/settings';
import { ExerciseHeader, useKeys } from '../ui/kit';
import { TRACKS, trackById } from '../spaces/registry';

export function Review() {
  const [params] = useSearchParams();
  const track = params.get('track');
  const back = track ? (trackById.get(track)?.path ?? '/') : '/';
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState(0);
  const [again, setAgain] = useState(0);
  const start = useRef(Date.now());
  const logged = useRef(false);

  useEffect(() => {
    void (async () => {
      const { reviewBatch } = await getSettings();
      const tracks = track ? [track] : TRACKS.filter((t) => t.ready).map((t) => t.id);
      setQueue(await dueCards(Date.now(), tracks, reviewBatch));
    })();
  }, [track]);

  const finished = queue !== null && i >= queue.length;

  useEffect(() => {
    if (!finished || graded === 0 || logged.current) return;
    logged.current = true;
    void logActivity({
      space: 'learn',
      track: track ?? undefined,
      type: 'review',
      ref: 'review',
      xp: graded * XP.reviewCard,
      minutes: minutesSince(start.current),
      data: { cards: graded, again },
    });
  }, [finished, graded, again, track]);

  const card = queue?.[i];
  const grade = async (g: Grade4) => {
    if (!card || !revealed) return;
    await gradeCard(card, g);
    setGraded((n) => n + 1);
    if (g === 1) setAgain((n) => n + 1);
    setRevealed(false);
    setI((n) => n + 1);
  };

  useKeys(
    (k) => {
      if (!revealed && (k === ' ' || k === 'Enter')) setRevealed(true);
      else if (revealed && ['1', '2', '3', '4'].includes(k)) void grade(Number(k) as Grade4);
    },
    [revealed, card],
  );

  if (!queue) return null;

  if (finished) {
    return (
      <div className="stack">
        <div className="card empty stack">
          {graded === 0 ? (
            <>
              <h1>Rien à réviser</h1>
              <p className="muted">Ta file est à jour. Les prochaines cartes reviendront au bon moment.</p>
            </>
          ) : (
            <>
              <h1>Révisions faites ✔</h1>
              <p className="muted">
                {graded} carte{graded > 1 ? 's' : ''} · +{graded * XP.reviewCard} XP
                {again ? ` · ${again} à revoir bientôt` : ''}
              </p>
            </>
          )}
        </div>
        <Link to={back} className="btn primary block">
          Retour
        </Link>
      </div>
    );
  }

  const view = trackById.get(card!.track)?.cards?.[card!.kind];
  const intervals = previewIntervals(card!.srs);

  return (
    <div className="exercise">
      <ExerciseHeader value={i / queue.length} back={back} label="Progression des révisions" />
      <div className="row muted small" style={{ justifyContent: 'space-between' }}>
        <span>{trackById.get(card!.track)?.short}</span>
        <span>
          {i + 1} / {queue.length}
        </span>
      </div>
      {view ? <view.front card={card!} /> : <p>Carte inconnue ({card!.id}).</p>}
      {revealed && view && (
        <div className="card">
          <view.back card={card!} />
        </div>
      )}
      <div className="sticky-actions" style={{ display: 'block' }}>
        {!revealed ? (
          <button className="btn primary block" onClick={() => setRevealed(true)}>
            Afficher la réponse
          </button>
        ) : (
          <div className="grades" role="group" aria-label="Comment c'était ?">
            {GRADES.map((g) => (
              <button key={g} className={`btn ${g === 3 ? 'primary' : ''}`} onClick={() => void grade(g)} aria-keyshortcuts={String(g)}>
                {GRADE_LABELS[g]}
                <small style={g === 3 ? { color: 'inherit' } : undefined}>{formatInterval(intervals[g])}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

