import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../../../core/db';
import { ensureCard, gradeCard } from '../../../core/cards';
import { logActivity, minutesSince } from '../../../core/activity';
import { XP } from '../../../core/gamification';
import { answer, createQueue, isFinished, type QueueState } from '../../../core/queue';
import { checkAnswer } from '../../../core/text';
import { ExerciseHeader, Feedback, useKeys } from '../../../ui/kit';
import { gradeFromMistakes, mistakesByWord } from '../chinese/lesson';
import { deck, lessonEntries, loadEntries, TRACK, type LnEntry } from './content';
import { buildLnLesson, LN_GRADED, type LnExercise } from './lesson';
import { LnAudio, StatusBadge } from './ui';

const BACK = '/learn/ln';

export function LingalaLesson() {
  const { lessonId = '' } = useParams();
  const [state, setState] = useState<{ entries: Map<string, LnEntry>; q: QueueState<LnExercise> } | null>(null);
  const [summary, setSummary] = useState<{ xp: number; pct: number } | null>(null);
  const start = useRef(Date.now());
  const saving = useRef(false);
  const title = lessonId === 'ln-user' ? 'Mes ajouts' : deck.lessons.find((l) => l.id === lessonId)?.title;

  useEffect(() => {
    void loadEntries().then((all) => {
      const items = lessonEntries(lessonId, all).slice(0, 12);
      setState({ entries: new Map(all.map((e) => [e.id, e])), q: createQueue(buildLnLesson(items, all, Math.random)) });
    });
  }, [lessonId]);

  if (!state) return null;
  const { q, entries } = state;
  if (q.items.length === 0) return <p>Cette leçon est vide.</p>;

  const finish = async (s: QueueState<LnExercise>) => {
    if (saving.current) return;
    saving.current = true;
    const mistakes = mistakesByWord(s.mistakes);
    const ids = [...new Set(s.items.map((x) => x.itemId))];
    const now = Date.now();
    for (const id of ids)
      for (const kind of ['recog', 'produce']) {
        const card = await ensureCard(TRACK, id, kind, now);
        if (card.srs.reps === 0) await gradeCard(card, gradeFromMistakes(mistakes[id] ?? 0), now);
      }
    const pct = s.answered ? s.firstTry / s.answered : 1;
    const prev = await db.lessonProgress.get(lessonId);
    await db.lessonProgress.put({ id: lessonId, track: TRACK, completedAt: now, attempts: (prev?.attempts ?? 0) + 1, bestScore: Math.max(prev?.bestScore ?? 0, pct) });
    const xp = XP.lessonDone + s.firstTry * XP.correctAnswer;
    await logActivity({ space: 'learn', track: TRACK, type: 'lesson', ref: `lesson:${lessonId}`, xp, minutes: minutesSince(start.current), data: { score: pct } });
    setSummary({ xp, pct });
  };

  const advance = (correct: boolean) => {
    const ex = q.items[q.index];
    const next = answer(q, ex.key, correct, LN_GRADED[ex.type]);
    setState({ entries, q: next });
    if (isFinished(next)) void finish(next);
  };

  if (summary)
    return (
      <div className="stack">
        <div className="card empty stack">
          <h1>Leçon terminée</h1>
          <p className="muted">{title}</p>
          <div className="stat-row">
            <div className="stat">
              <b>+{summary.xp}</b>
              <span>XP</span>
            </div>
            <div className="stat">
              <b>{Math.round(summary.pct * 100)} %</b>
              <span>du premier coup</span>
            </div>
            <div className="stat">
              <b>{new Set(q.items.map((x) => x.itemId)).size}</b>
              <span>expressions en révision</span>
            </div>
          </div>
        </div>
        <Link to={BACK} className="btn primary block">
          Continuer
        </Link>
      </div>
    );

  const ex = q.items[q.index];
  // Fin de file : le bilan s'affiche dès que l'enregistrement est terminé.
  if (!ex) return null;
  const entry = entries.get(ex.itemId)!;
  return (
    <div className="exercise">
      <ExerciseHeader value={q.index / q.items.length} back={BACK} label="Progression de la leçon" />
      {ex.type === 'discover' && <Discover key={q.index} e={entry} onNext={() => advance(true)} />}
      {(ex.type === 'meaning' || ex.type === 'reverse' || ex.type === 'listen') && (
        <Mcq key={q.index} ex={ex} e={entry} entries={entries} onDone={advance} />
      )}
      {ex.type === 'write' && <Write key={q.index} e={entry} onDone={advance} />}
    </div>
  );
}

function Discover({ e, onNext }: { e: LnEntry; onNext: () => void }) {
  useKeys((k) => k === 'Enter' && onNext(), [onNext]);
  return (
    <>
      <div className="row" style={{ justifyContent: 'center' }}>
        <span className="chip">Nouvelle expression</span>
        <StatusBadge status={e.status} />
      </div>
      <div className="prompt stack" style={{ alignItems: 'center' }}>
        <span className="ln-text" lang="ln">
          {e.ln}
        </span>
        <span style={{ fontSize: '1.2rem' }}>{e.fr}</span>
        {e.notes && <span className="muted small">{e.notes}</span>}
        <LnAudio itemId={e.id} big />
      </div>
      <div className="sticky-actions">
        <Link to={`/learn/ln/item/${e.id}`} className="btn">
          Corriger / enregistrer
        </Link>
        <button className="btn primary" onClick={onNext}>
          Suivant
        </button>
      </div>
    </>
  );
}

function Mcq({ ex, e, entries, onDone }: { ex: LnExercise; e: LnEntry; entries: Map<string, LnEntry>; onDone: (ok: boolean) => void }) {
  const options = ex.options!.map((id) => entries.get(id)!);
  const [picked, setPicked] = useState<string | null>(null);
  const ok = picked === e.id;
  useKeys(
    (k) => {
      if (!picked && ['1', '2', '3', '4'].includes(k) && options[Number(k) - 1]) setPicked(options[Number(k) - 1].id);
      else if (picked && (k === 'Enter' || k === ' ')) onDone(ok);
    },
    [picked],
  );
  const showLn = ex.type !== 'meaning';
  return (
    <>
      <div className="prompt stack" style={{ alignItems: 'center' }}>
        {ex.type === 'meaning' && (
          <>
            <span className="muted small">Que veut dire…</span>
            <span className="ln-text" lang="ln">
              {e.ln}
            </span>
          </>
        )}
        {ex.type === 'reverse' && (
          <>
            <span className="muted small">Comment dit-on en lingala…</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{e.fr}</span>
          </>
        )}
        {ex.type === 'listen' && (
          <>
            <span className="muted small">Qu’entends-tu ?</span>
            <LnAudio itemId={e.id} big />
          </>
        )}
      </div>
      <div className="choices">
        {options.map((o) => (
          <button
            key={o.id}
            className={`choice ${picked ? (o.id === e.id ? 'right' : o.id === picked ? 'wrong' : '') : ''}`}
            disabled={!!picked}
            onClick={() => setPicked(o.id)}
            lang={showLn ? 'ln' : 'fr'}
          >
            {showLn ? o.ln : o.fr}
          </button>
        ))}
      </div>
      {picked && (
        <>
          <Feedback ok={ok}>
            {ok ? 'Exact !' : 'Pas tout à fait, on le revoit bientôt.'} {e.ln} = {e.fr}
          </Feedback>
          <div className="sticky-actions">
            <button className="btn primary" onClick={() => onDone(ok)} autoFocus>
              Continuer
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Write({ e, onDone }: { e: LnEntry; onDone: (ok: boolean) => void }) {
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<ReturnType<typeof checkAnswer> | null>(null);
  // « Kombo na ngai … » : on n'exige que la partie fixe.
  const expected = e.ln.replace(/…/g, '').trim();
  const submit = () => !verdict && setVerdict(checkAnswer(value, expected));
  const ok = verdict === 'exact' || verdict === 'close';
  return (
    <>
      <div className="prompt stack">
        <span className="muted small">Écris en lingala</span>
        <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{e.fr}</span>
      </div>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (verdict) onDone(ok);
          else submit();
        }}
        className="stack"
      >
        <input
          id="ln-write"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="ln"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          disabled={!!verdict}
          aria-label="Ta traduction en lingala"
        />
        {verdict && (
          <Feedback ok={ok}>
            {verdict === 'exact' && 'Parfait !'}
            {verdict === 'close' && `Presque : on écrit « ${e.ln} ».`}
            {verdict === 'wrong' && `La réponse : « ${e.ln} ». Tu la retrouveras un peu plus loin.`}
          </Feedback>
        )}
        <div className="sticky-actions">
          <button className="btn primary" type="submit">
            {verdict ? 'Continuer' : 'Vérifier'}
          </button>
        </div>
      </form>
    </>
  );
}
