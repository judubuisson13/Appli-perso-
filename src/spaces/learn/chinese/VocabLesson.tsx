import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Mic, SkipForward } from 'lucide-react';
import { db } from '../../../core/db';
import { ensureCard, gradeCard } from '../../../core/cards';
import { logActivity, minutesSince } from '../../../core/activity';
import { XP } from '../../../core/gamification';
import { answer, createQueue, isFinished, type QueueState } from '../../../core/queue';
import { canRecognize, listen } from '../../../core/speech';
import { useSettings } from '../../../core/settings';
import type { Grade4 } from '../../../core/srs';
import { AudioButton, ExerciseHeader, Feedback, useKeys } from '../../../ui/kit';
import { hsk1, lessonById, lessonWords, TRACK, wordsById } from './content';
import { buildLesson, GRADED, gradeFromMistakes, mistakesByWord, type Exercise } from './lesson';
import { HanziTrace } from './HanziTrace';
import { Hanzi, Pinyin, WordBlock } from './ui';

const BACK = '/learn/zh';

export function VocabLesson() {
  const { lessonId = '' } = useParams();
  const lesson = lessonById.get(lessonId);
  const settings = useSettings();
  const speakOk = settings.speakExercises && canRecognize();
  const initial = useMemo(
    () => buildLesson(lessonWords(lessonId), hsk1.words, { speak: speakOk, trace: true }, Math.random),
    // Les exercices oraux dépendent des réglages au moment d'ouvrir la leçon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId],
  );
  const [q, setQ] = useState<QueueState<Exercise>>(() => createQueue(initial));
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ xp: number; firstTry: number; answered: number } | null>(null);
  const start = useRef(Date.now());
  const saving = useRef(false);

  if (!lesson) return <p>Leçon introuvable.</p>;

  const finish = async (state: QueueState<Exercise>, knownIds: Set<string>) => {
    if (saving.current) return;
    saving.current = true;
    const mistakes = mistakesByWord(state.mistakes);
    const now = Date.now();
    for (const id of lesson.words) {
      const grade: Grade4 = knownIds.has(id) ? 4 : gradeFromMistakes(mistakes[id] ?? 0);
      for (const kind of ['recog', 'produce']) {
        const card = await ensureCard(TRACK, id, kind, now);
        if (card.srs.reps === 0) await gradeCard(card, grade, now);
      }
    }
    const score = state.answered ? state.firstTry / state.answered : 1;
    const prev = await db.lessonProgress.get(lesson.id);
    await db.lessonProgress.put({
      id: lesson.id,
      track: TRACK,
      completedAt: now,
      attempts: (prev?.attempts ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, score),
    });
    const xp = XP.lessonDone + state.firstTry * XP.correctAnswer;
    await logActivity({
      space: 'learn',
      track: TRACK,
      type: 'lesson',
      ref: `lesson:${lesson.id}`,
      xp,
      minutes: minutesSince(start.current),
      data: { score, known: knownIds.size },
    });
    setSummary({ xp, firstTry: state.firstTry, answered: state.answered });
  };

  const advance = (correct: boolean) => {
    const ex = q.items[q.index];
    const next = answer(q, ex.key, correct, GRADED[ex.type]);
    setQ(next);
    if (isFinished(next)) void finish(next, known);
  };

  const markKnown = () => {
    const ex = q.items[q.index];
    const k = new Set(known).add(ex.wordId);
    setKnown(k);
    const items = q.items.filter((x, i) => i <= q.index || x.wordId !== ex.wordId);
    const next = answer({ ...q, items }, ex.key, true, false);
    setQ(next);
    if (isFinished(next)) void finish(next, k);
  };

  if (summary) {
    const pct = summary.answered ? Math.round((summary.firstTry / summary.answered) * 100) : 100;
    return (
      <div className="stack">
        <div className="card empty stack">
          <h1>Leçon terminée 🎉</h1>
          <p className="muted">{lesson.title}</p>
          <div className="stat-row">
            <div className="stat">
              <b>+{summary.xp}</b>
              <span>XP</span>
            </div>
            <div className="stat">
              <b>{pct} %</b>
              <span>du premier coup</span>
            </div>
            <div className="stat">
              <b>{lesson.words.length - known.size}</b>
              <span>mots en révision</span>
            </div>
          </div>
          <p className="small muted">
            Les mots entrent dans ta file de révision : ceux où tu as hésité reviendront plus tôt.
          </p>
        </div>
        <Link to={BACK} className="btn primary block">
          Continuer
        </Link>
      </div>
    );
  }

  const ex = q.items[q.index];
  if (!ex) return null;
  const word = wordsById.get(ex.wordId)!;
  const progress = q.index / q.items.length;

  return (
    <div className="exercise">
      <ExerciseHeader value={progress} back={BACK} label="Progression de la leçon" />
      {ex.type === 'discover' && <Discover key={q.index} wordId={ex.wordId} onNext={() => advance(true)} onKnown={markKnown} />}
      {(ex.type === 'meaning' || ex.type === 'listen' || ex.type === 'reverse') && (
        <Mcq key={q.index} ex={ex} onDone={advance} />
      )}
      {ex.type === 'speak' && <Speak key={q.index} wordId={word.id} onDone={() => advance(true)} />}
      {ex.type === 'trace' && <Trace key={q.index} wordId={word.id} onDone={() => advance(true)} />}
    </div>
  );
}

function Discover({ wordId, onNext, onKnown }: { wordId: string; onNext: () => void; onKnown: () => void }) {
  const w = wordsById.get(wordId)!;
  useKeys((k) => k === 'Enter' && onNext(), [onNext]);
  return (
    <>
      <span className="chip" style={{ alignSelf: 'center' }}>
        Nouveau mot
      </span>
      <WordBlock word={w} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <AudioButton text={w.hanzi} autoPlay big />
      </div>
      {w.example && (
        <div className="notice">
          <div lang="zh-CN" style={{ fontSize: '1.15rem' }}>
            {w.example.hanzi}
          </div>
          <div className="muted">{w.example.pinyin}</div>
          <div>{w.example.fr}</div>
        </div>
      )}
      <div className="sticky-actions">
        <button className="btn" onClick={onKnown}>
          Je connais déjà
        </button>
        <button className="btn primary" onClick={onNext}>
          Suivant
        </button>
      </div>
    </>
  );
}

function Mcq({ ex, onDone }: { ex: Exercise; onDone: (correct: boolean) => void }) {
  const w = wordsById.get(ex.wordId)!;
  const options = ex.options!.map((id) => wordsById.get(id)!);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === w.id;

  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
  };
  useKeys(
    (k) => {
      if (!picked && ['1', '2', '3', '4'].includes(k)) pick(options[Number(k) - 1].id);
      else if (picked && (k === 'Enter' || k === ' ')) onDone(correct);
    },
    [picked],
  );

  const prompt = {
    meaning: (
      <div className="prompt stack" style={{ alignItems: 'center' }}>
        <span className="muted small">Que veut dire…</span>
        <Hanzi text={w.hanzi} />
        <AudioButton text={w.hanzi} autoPlay />
      </div>
    ),
    listen: (
      <div className="prompt stack" style={{ alignItems: 'center' }}>
        <span className="muted small">Quel mot entends-tu ?</span>
        <AudioButton text={w.hanzi} autoPlay big />
      </div>
    ),
    reverse: (
      <div className="prompt stack">
        <span className="muted small">Comment dit-on…</span>
        <div style={{ fontSize: '1.6rem', fontWeight: 600 }}>{w.fr}</div>
      </div>
    ),
  }[ex.type as 'meaning' | 'listen' | 'reverse'];

  return (
    <>
      {prompt}
      <div className="choices" role="group" aria-label="Propositions">
        {options.map((o, i) => {
          const state = picked ? (o.id === w.id ? 'right' : o.id === picked ? 'wrong' : '') : '';
          return (
            <button key={o.id} className={`choice ${state}`} onClick={() => pick(o.id)} disabled={!!picked} aria-keyshortcuts={String(i + 1)}>
              {ex.type === 'meaning' ? (
                o.fr
              ) : (
                <span className="stack" style={{ gap: 2 }}>
                  <Hanzi text={o.hanzi} size="md" />
                  {ex.type === 'reverse' && <Pinyin syllables={o.syllables} className="small" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <Feedback ok={correct}>
            {correct ? 'Bien joué !' : 'Pas tout à fait : on le revoit dans un instant.'}{' '}
            <span lang="zh-CN">{w.hanzi}</span> · <Pinyin syllables={w.syllables} className="" /> · {w.fr}
          </Feedback>
          <div className="sticky-actions">
            <button className="btn primary" onClick={() => onDone(correct)} autoFocus>
              Continuer
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Speak({ wordId, onDone }: { wordId: string; onDone: () => void }) {
  const w = wordsById.get(wordId)!;
  const [state, setState] = useState<'idle' | 'listening' | 'ok' | 'miss' | 'error'>('idle');
  const [heard, setHeard] = useState('');

  const go = async () => {
    setState('listening');
    try {
      const alts = await listen('zh-CN');
      setHeard(alts[0] ?? '');
      setState(alts.some((a) => a.replace(/[\s。！？，、.!?]/g, '').includes(w.hanzi)) ? 'ok' : 'miss');
    } catch (e) {
      setHeard((e as Error).message);
      setState('error');
    }
  };

  return (
    <>
      <span className="chip" style={{ alignSelf: 'center' }}>
        À toi de parler
      </span>
      <WordBlock word={w} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <AudioButton text={w.hanzi} />
        <button className="btn primary" onClick={go} disabled={state === 'listening'}>
          <Mic size={18} /> {state === 'listening' ? 'J’écoute…' : 'Répéter'}
        </button>
      </div>
      {state === 'ok' && <Feedback ok>Compris : « {heard} ». Très bien !</Feedback>}
      {state === 'miss' && (
        <Feedback ok={false}>
          {heard ? `J’ai compris « ${heard} ».` : 'Je n’ai rien entendu.'} Réécoute et réessaie : la reconnaissance est parfois
          capricieuse sur les mots isolés.
        </Feedback>
      )}
      {state === 'error' && <Feedback ok={false}>{heard}</Feedback>}
      <div className="sticky-actions">
        <button className="btn" onClick={onDone}>
          <SkipForward size={18} /> Passer
        </button>
        <button className="btn primary" onClick={onDone} disabled={state === 'idle' || state === 'listening'}>
          <Check size={18} /> Continuer
        </button>
      </div>
    </>
  );
}

function Trace({ wordId, onDone }: { wordId: string; onDone: () => void }) {
  const w = wordsById.get(wordId)!;
  const chars = [...w.hanzi];
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false);

  const complete = () => {
    void logActivity({ space: 'learn', track: TRACK, type: 'trace', ref: 'zh:trace', xp: XP.traceChar, minutes: 0.5, data: { char: chars[i] } });
    if (i + 1 < chars.length) setTimeout(() => setI(i + 1), 700);
    else setFinished(true);
  };

  return (
    <>
      <span className="chip" style={{ alignSelf: 'center' }}>
        Trace le caractère {chars.length > 1 ? `${i + 1}/${chars.length}` : ''}
      </span>
      <div className="prompt" style={{ padding: 0 }}>
        <Pinyin syllables={w.syllables} /> · {w.fr}
      </div>
      <HanziTrace key={chars[i]} char={chars[i]} onComplete={complete} />
      <div className="sticky-actions">
        <button className="btn" onClick={onDone}>
          <SkipForward size={18} /> Passer
        </button>
        <button className="btn primary" onClick={onDone} disabled={!finished}>
          Continuer
        </button>
      </div>
    </>
  );
}
