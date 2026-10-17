import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Layers, Lock, MailWarning, ListChecks } from 'lucide-react';
import { db } from '../../../core/db';
import { minutesSince } from '../../../core/activity';
import { XP } from '../../../core/gamification';
import { shuffle } from '../../../core/random';
import { ExerciseHeader, Feedback, PageTitle, RichText, useKeys } from '../../../ui/kit';
import { CYBER_STEPS, cyber, IT_MODULES, TRACK } from './content';
import { addCyberCards, completeStep } from './steps';

export function ItHome() {
  return (
    <div className="stack">
      <PageTitle title="Informatique « DSI »" sub="Comprendre les enjeux pour décider, pas devenir expert." back="/learn" />
      {IT_MODULES.map((m) =>
        m.ready ? (
          <Link key={m.id} to={`/learn/it/${m.id}`} className="card lesson-row">
            <span className="lesson-num">⛨</span>
            <span style={{ flex: 1 }}>
              <b>{m.title}</b>
              <br />
              <span className="muted small">{m.pitch}</span>
            </span>
            <span className="chip warn">priorité</span>
          </Link>
        ) : (
          <div key={m.id} className="card lesson-row" style={{ opacity: 0.55 }} aria-disabled="true">
            <span className="lesson-num">
              <Lock size={16} />
            </span>
            <span style={{ flex: 1 }}>
              <b>{m.title}</b>
              <br />
              <span className="muted small">{m.pitch}</span>
            </span>
            <span className="chip">bientôt</span>
          </div>
        ),
      )}
    </div>
  );
}

const STEP_ICONS = { 'cyber-sheet': BookOpen, 'cyber-phishing': MailWarning, 'cyber-quiz': ListChecks };

export function CyberHome() {
  const data = useLiveQuery(async () => {
    const [progress, cards, due] = await Promise.all([
      db.lessonProgress.where('track').equals(TRACK).toArray(),
      db.cards.where('track').equals(TRACK).count(),
      db.cards.where('[track+due]').between([TRACK, 0], [TRACK, Date.now()]).count(),
    ]);
    return { done: new Map(progress.map((p) => [p.id, p])), cards, due };
  }, []);
  const [added, setAdded] = useState<number | null>(null);
  if (!data) return null;
  return (
    <div className="stack">
      <PageTitle title={cyber.title} sub="Une fiche, une simulation, un quiz, puis les notions en révision." back="/learn/it" />
      {CYBER_STEPS.map((s, i) => {
        const p = data.done.get(s.id);
        const Icon = STEP_ICONS[s.id];
        return (
          <Link key={s.id} to={s.path} className="card lesson-row">
            <span className={`lesson-num ${p ? 'done' : ''}`}>{i + 1}</span>
            <Icon size={20} />
            <span style={{ flex: 1 }}>
              <b>{s.title}</b>
              <br />
              <span className="muted small">{s.minutes} min</span>
            </span>
            {p && s.id !== 'cyber-sheet' && <span className="chip ok">{Math.round(p.bestScore * 100)} %</span>}
          </Link>
        );
      })}
      <div className="card stack">
        <div className="row" style={{ gap: 8 }}>
          <Layers size={20} />
          <b>Flashcards</b>
          <span className="muted small">
            {data.cards} / {cyber.cards.length} notions dans ta file · {data.due} à revoir
          </span>
        </div>
        <div className="row">
          {data.cards < cyber.cards.length && (
            <button className="btn" onClick={async () => setAdded(await addCyberCards())}>
              Ajouter les notions à mes révisions
            </button>
          )}
          {data.due > 0 && (
            <Link to={`/review?track=${TRACK}`} className="btn primary">
              Réviser
            </Link>
          )}
        </div>
        {added !== null && <span className="small muted">{added} notion(s) ajoutée(s).</span>}
      </div>
    </div>
  );
}

export function CyberSheet() {
  const start = useRef(Date.now());
  const [done, setDone] = useState(false);
  return (
    <div className="stack">
      <PageTitle title="Fiche · Cybersécurité" back="/learn/it/cyber" />
      {cyber.sheet.map((s) => (
        <section key={s.title} className="card stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} style={{ margin: 0, maxWidth: '65ch' }}>
              <RichText text={p} />
            </p>
          ))}
        </section>
      ))}
      {done ? (
        <div className="stack">
          <Feedback ok>Fiche lue : les {cyber.cards.length} notions rejoignent ta file de révision.</Feedback>
          <Link to="/learn/it/cyber/phishing" className="btn primary block">
            Passer à la simulation phishing
          </Link>
        </div>
      ) : (
        <button
          className="btn primary block"
          onClick={async () => {
            await completeStep('cyber-sheet', { xp: 5, minutes: minutesSince(start.current, 15), score: 1 });
            await addCyberCards();
            setDone(true);
          }}
        >
          J’ai lu la fiche
        </button>
      )}
    </div>
  );
}

export function CyberQuiz() {
  const [questions] = useState(() => shuffle(cyber.quiz));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const start = useRef(Date.now());
  const q = questions[i];

  const next = async () => {
    if (i + 1 < questions.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    await completeStep('cyber-quiz', { xp: score * XP.correctAnswer + 5, minutes: minutesSince(start.current), score: score / questions.length });
    setFinished(true);
  };
  useKeys(
    (k) => {
      if (picked === null && /^[1-4]$/.test(k) && Number(k) <= q.options.length) pick(Number(k) - 1);
      else if (picked !== null && k === 'Enter') void next();
    },
    [picked, i],
  );
  const pick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.answer) setScore((s) => s + 1);
  };

  if (finished)
    return (
      <div className="stack">
        <div className="card empty stack">
          <h1>
            {score} / {questions.length}
          </h1>
          <p className="muted">{score >= 8 ? 'Solide : tu as les bons réflexes.' : 'Relis la fiche sur les points manqués, le quiz se refait quand tu veux.'}</p>
        </div>
        <Link to="/learn/it/cyber" className="btn primary block">
          Retour au module
        </Link>
      </div>
    );

  return (
    <div className="exercise">
      <ExerciseHeader value={i / questions.length} back="/learn/it/cyber" label="Progression du quiz" />
      <h2 style={{ fontSize: '1.2rem' }}>{q.q}</h2>
      <div className="stack">
        {q.options.map((o, idx) => (
          <button
            key={idx}
            className={`choice ${picked === null ? '' : idx === q.answer ? 'right' : idx === picked ? 'wrong' : ''}`}
            disabled={picked !== null}
            onClick={() => pick(idx)}
            style={{ textAlign: 'left' }}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <>
          <Feedback ok={picked === q.answer}>
            {picked === q.answer ? 'Exact. ' : 'Non. '}
            {q.explain}
          </Feedback>
          <div className="sticky-actions">
            <button className="btn primary" onClick={() => void next()} autoFocus>
              {i + 1 < questions.length ? 'Question suivante' : 'Voir le score'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
