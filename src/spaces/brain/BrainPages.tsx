import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Brain, Calculator, Delete } from 'lucide-react';
import { logActivity, minutesSince } from '../../core/activity';
import { dayKey } from '../../core/dates';
import { PageTitle, useKeys } from '../../ui/kit';
import { adapt, extendSequence, flashMs, GRID_CELLS, makeProblem, startLength, startLevel, type Adapt, type Problem } from './logic';
import { gameOfDay, GAMES, scoresOf, type GameId } from './stats';

const ICONS: Record<GameId, typeof Brain> = { memory: Brain, math: Calculator };

export function BrainHome() {
  const data = useLiveQuery(async () => ({ memory: await scoresOf('memory'), math: await scoresOf('math') }), []);
  const today = gameOfDay(dayKey());
  if (!data) return null;
  return (
    <div className="stack" data-space="brain">
      <PageTitle title="Cerveau" sub="Mini-jeux de 2 à 5 minutes. La difficulté s’adapte à toi." />
      {(Object.keys(GAMES) as GameId[]).map((g) => {
        const s = data[g];
        const best = Math.max(0, ...s.map((x) => x.score));
        const last = s.slice(-14);
        const max = Math.max(1, ...last.map((x) => x.score));
        const Icon = ICONS[g];
        return (
          <Link key={g} to={`/brain/${g}`} className="card stack" style={{ textDecoration: 'none' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="row" style={{ gap: 8 }}>
                <Icon size={22} color="var(--brain)" />
                <b>{GAMES[g].title}</b>
              </span>
              {today === g && <span className="chip warn">jeu du jour</span>}
            </div>
            <span className="muted small">{GAMES[g].pitch}</span>
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span>
                Record : <b>{best || '—'}</b> {best ? GAMES[g].unit : ''}
              </span>
              <span className="muted">{s.length} partie{s.length > 1 ? 's' : ''}</span>
            </div>
            {last.length > 1 && (
              <div className="spark" style={{ height: 40 }} aria-label={`Derniers scores : ${last.map((x) => x.score).join(', ')}`}>
                {last.map((x) => (
                  <span key={x.ts} style={{ height: `${(x.score / max) * 100}%`, background: 'var(--brain)' }} />
                ))}
              </div>
            )}
          </Link>
        );
      })}
      <p className="small muted">Quiz de compétences numériques façon Pix : dans une phase suivante, relié au parcours Informatique.</p>
    </div>
  );
}

/* ---------- Séquence ---------- */

export function MemoryGame() {
  const best = useLiveQuery(async () => Math.max(0, ...(await scoresOf('memory')).map((s) => s.score)), [], undefined);
  const [seq, setSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<'intro' | 'show' | 'input' | 'over'>('intro');
  const [lit, setLit] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const [reached, setReached] = useState(0);
  const start = useRef(Date.now());
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (s: number[]) => {
    setPhase('show');
    setPos(0);
    const step = flashMs(s.length);
    s.forEach((cell, k) => {
      timers.current.push(window.setTimeout(() => setLit(cell), 500 + k * step));
      timers.current.push(window.setTimeout(() => setLit(null), 500 + k * step + step * 0.7));
    });
    timers.current.push(window.setTimeout(() => setPhase('input'), 500 + s.length * step));
  };

  const begin = () => {
    start.current = Date.now();
    let s: number[] = [];
    for (let i = 0; i < startLength(best ?? 0); i++) s = extendSequence(s, Math.random);
    setSeq(s);
    setReached(0);
    setBad(null);
    play(s);
  };

  const tap = async (cell: number) => {
    if (phase !== 'input') return;
    setLit(cell);
    timers.current.push(window.setTimeout(() => setLit(null), 180));
    if (cell !== seq[pos]) {
      setBad(cell);
      setPhase('over');
      const score = Math.max(reached, 0);
      await logActivity({ space: 'brain', type: 'brain', ref: 'brain:memory', xp: score, minutes: minutesSince(start.current), data: { game: 'memory', score } });
      return;
    }
    if (pos + 1 === seq.length) {
      setReached(seq.length);
      const next = extendSequence(seq, Math.random);
      setSeq(next);
      timers.current.push(window.setTimeout(() => play(next), 600));
    } else setPos(pos + 1);
  };

  return (
    <div className="stack" data-space="brain">
      <PageTitle title="Séquence" sub={phase === 'show' ? 'Regarde bien…' : phase === 'input' ? `À toi : ${pos + 1} / ${seq.length}` : GAMES.memory.pitch} back="/brain" />
      <div className="row small" style={{ justifyContent: 'space-between' }}>
        <span>
          Séquence réussie : <b>{reached}</b>
        </span>
        <span className="muted">Record : {best || '—'}</span>
      </div>
      <div className="sim-grid" role="group" aria-label="Grille de la séquence">
        {Array.from({ length: GRID_CELLS }, (_, c) => (
          <button
            key={c}
            className={`sim-cell ${lit === c ? 'lit' : ''} ${bad === c ? 'bad' : ''}`}
            onClick={() => void tap(c)}
            disabled={phase !== 'input'}
            aria-label={`Case ${c + 1}`}
          />
        ))}
      </div>
      {phase === 'intro' && (
        <button className="btn primary block" onClick={begin}>
          Commencer (séquence de {startLength(best ?? 0)})
        </button>
      )}
      {phase === 'over' && (
        <div className="stack">
          <div className="feedback bad">
            Raté à la case {pos + 1}. Meilleure séquence : {reached} case{reached > 1 ? 's' : ''}
            {reached > (best ?? 0) ? ' : nouveau record !' : '.'}
          </div>
          <button className="btn primary block" onClick={begin}>
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Calcul mental ---------- */

const DURATION = 60;

export function MathGame() {
  const scores = useLiveQuery(() => scoresOf('math'), []);
  const [state, setState] = useState<'intro' | 'play' | 'over'>('intro');
  const [ad, setAd] = useState<Adapt>({ level: 1, streak: 0 });
  const [p, setP] = useState<Problem>(() => makeProblem(1, Math.random));
  const [input, setInput] = useState('');
  const [left, setLeft] = useState(DURATION);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const maxLevel = useRef(1);
  const start = useRef(0);

  useEffect(() => {
    if (state !== 'play') return;
    const t = setInterval(() => {
      const l = DURATION - Math.floor((Date.now() - start.current) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) setState('over');
    }, 250);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (state !== 'over') return;
    void logActivity({
      space: 'brain',
      type: 'brain',
      ref: 'brain:math',
      xp: correct,
      minutes: minutesSince(start.current),
      data: { game: 'math', score: correct, level: maxLevel.current },
    });
    // Une seule écriture par partie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const begin = () => {
    const level = startLevel(scores?.at(-1)?.level);
    maxLevel.current = level;
    setAd({ level, streak: 0 });
    setP(makeProblem(level, Math.random));
    setInput('');
    setCorrect(0);
    setLeft(DURATION);
    start.current = Date.now();
    setState('play');
  };

  const submit = (value = input) => {
    if (state !== 'play' || value === '') return;
    const ok = Number(value) === p.answer;
    const next = adapt(ad, ok);
    maxLevel.current = Math.max(maxLevel.current, next.level);
    if (ok) setCorrect((c) => c + 1);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 250);
    setAd(next);
    setP(makeProblem(next.level, Math.random));
    setInput('');
  };

  const press = (k: string) => {
    if (k === '⌫') setInput((v) => v.slice(0, -1));
    else if (k === 'OK') submit();
    else if (input.length < 4) setInput((v) => v + k);
  };

  useKeys(
    (k) => {
      if (state !== 'play') return;
      if (/^\d$/.test(k)) press(k);
      else if (k === 'Backspace') press('⌫');
      else if (k === 'Enter') submit();
    },
    [state, input, p, ad],
  );

  const best = Math.max(0, ...(scores ?? []).map((s) => s.score));

  return (
    <div className="stack" data-space="brain">
      <PageTitle title="Calcul mental" back="/brain" />
      {state === 'intro' && (
        <>
          <p className="muted">{GAMES.math.pitch} Trois bonnes réponses d’affilée font monter d’un niveau, une erreur fait redescendre.</p>
          <button className="btn primary block" onClick={begin}>
            Commencer au niveau {startLevel(scores?.at(-1)?.level)}
          </button>
        </>
      )}
      {state === 'play' && (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="timer">{left} s</span>
            <span className="chip">Niveau {ad.level}</span>
            <span>
              <b>{correct}</b> juste{correct > 1 ? 's' : ''}
            </span>
          </div>
          <div className="math-q" aria-live="polite" style={{ color: flash === 'bad' ? 'var(--bad)' : flash === 'ok' ? 'var(--ok)' : undefined }}>
            {p.text} = {input || '?'}
          </div>
          <div className="keypad">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', 'OK'].map((k) => (
              <button key={k} className={`btn ${k === 'OK' ? 'primary' : ''}`} onClick={() => press(k)} aria-label={k === '⌫' ? 'Effacer' : k === 'OK' ? 'Valider' : k}>
                {k === '⌫' ? <Delete size={22} /> : k}
              </button>
            ))}
          </div>
        </>
      )}
      {state === 'over' && (
        <div className="stack">
          <div className="card empty stack">
            <h1>{correct} bonnes réponses</h1>
            <p className="muted">
              Niveau atteint : {maxLevel.current}
              {correct > best ? ' · nouveau record !' : ''}
            </p>
          </div>
          <button className="btn primary block" onClick={begin}>
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
