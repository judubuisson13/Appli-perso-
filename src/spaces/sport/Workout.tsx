import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Minus, Pause, Play, Plus, SkipForward } from 'lucide-react';
import { db, type WorkoutRow } from '../../core/db';
import { logActivity, minutesSince } from '../../core/activity';
import { dayKey } from '../../core/dates';
import { beep, keepAwake, phaseEnd, unlockAudio } from '../../core/signals';
import { ExerciseHeader, Feedback } from '../../ui/kit';
import { chainById, maxStep, sport } from './content';
import { applySession, chainState, formatClock, isValidated } from './logic';
import { getProgram, setProgram } from './store';

const XP_SESSION = 20;

interface Slot {
  chain: string;
  setIndex: number;
  rest: number;
}

/** Séance guidée : série par série, saisie des reps ou chrono de maintien, puis repos minuté. */
export function WorkoutRunner() {
  const { sessionId = 'A' } = useParams();
  const session = sport.program.sessions.find((s) => s.id === sessionId) ?? sport.program.sessions[0];
  const [program, setProg] = useState<Awaited<ReturnType<typeof getProgram>> | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<'intro' | 'set' | 'rest' | 'feel' | 'done'>('intro');
  const [done, setDone] = useState<Record<string, number[]>>({});
  const [value, setValue] = useState(0);
  const [ready, setReady] = useState<string[]>([]);
  const start = useRef(Date.now());
  const release = useRef<() => void>(() => {});

  useEffect(() => {
    void getProgram().then((p) => {
      setProg(p);
      const list: Slot[] = [];
      for (const b of session.blocks) {
        const step = chainById.get(b.chain)!.steps[chainState(p, b.chain).step];
        for (let k = 0; k < step.sets; k++) list.push({ chain: b.chain, setIndex: k, rest: b.rest });
      }
      setSlots(list);
    });
    return () => release.current();
  }, [session]);

  if (!program || slots.length === 0) return null;
  const stepOf = (chain: string) => chainById.get(chain)!.steps[chainState(program, chain).step];
  const slot = slots[i];
  const step = slot ? stepOf(slot.chain) : null;

  const begin = async () => {
    unlockAudio();
    release.current = await keepAwake();
    start.current = Date.now();
    setValue(stepOf(slots[0].chain).target);
    setMode('set');
  };

  const recordSet = (v: number) => {
    setDone((d) => ({ ...d, [slot.chain]: [...(d[slot.chain] ?? []), v] }));
    if (i + 1 >= slots.length) {
      setMode('feel');
      return;
    }
    setMode('rest');
  };

  const nextSet = () => {
    const n = i + 1;
    setI(n);
    setValue(stepOf(slots[n].chain).target);
    setMode('set');
  };

  const finish = async (feeling: number, note: string) => {
    const entries: WorkoutRow['entries'] = session.blocks.map((b) => {
      const s = stepOf(b.chain);
      return { chain: b.chain, stepId: s.id, metric: s.metric, target: s.target, sets: done[b.chain] ?? [] };
    });
    const minutes = minutesSince(start.current, 120);
    const now = Date.now();
    await db.workouts.add({ day: dayKey(now), ts: now, sessionId: session.id, title: `${sport.program.title} · ${session.title}`, entries, minutes, feeling, note: note || undefined });
    const results = entries.map((e) => ({ chain: e.chain, validated: isValidated(e.sets, e.target, stepOf(e.chain).sets) }));
    const { state, ready } = applySession(await getProgram(), results, sport.program.validationsToProgress, maxStep);
    await setProgram(state);
    await logActivity({ space: 'sport', type: 'workout', ref: 'sport:session', xp: XP_SESSION, minutes, data: { session: session.id, feeling } });
    setReady(ready);
    release.current();
    setMode('done');
  };

  if (mode === 'intro')
    return (
      <div className="stack" data-space="sport">
        <ExerciseHeader value={0} back="/sport" />
        <h1>{session.title}</h1>
        <div className="stack">
          {session.blocks.map((b) => {
            const s = stepOf(b.chain);
            return (
              <div key={b.chain} className="card">
                <b>{s.name}</b>
                <div className="small muted">
                  {s.sets} × {s.target}
                  {s.metric === 'seconds' ? ' s' : ' reps'} · repos {b.rest} s
                </div>
              </div>
            );
          })}
        </div>
        <p className="small muted">Échauffe-toi 3 à 5 minutes avant : rotations des épaules, montées de genoux, quelques squats.</p>
        <button className="btn primary block" onClick={() => void begin()}>
          <Play size={18} /> C’est parti
        </button>
      </div>
    );

  if (mode === 'done')
    return (
      <div className="stack" data-space="sport">
        <div className="card empty stack">
          <h1>Séance terminée</h1>
          <p className="muted">+{XP_SESSION} XP. Elle est dans ton journal.</p>
        </div>
        {ready.length > 0 && (
          <Feedback ok>
            Tu as validé {ready.map((c) => chainById.get(c)!.name.toLowerCase()).join(' et ')} plusieurs fois : le palier suivant t’attend sur la page Sport.
          </Feedback>
        )}
        <Link to="/sport" className="btn primary block">
          Retour au sport
        </Link>
      </div>
    );

  if (mode === 'feel') return <Feeling onDone={finish} />;

  return (
    <div className="exercise" data-space="sport">
      <ExerciseHeader value={i / slots.length} back="/sport" label="Progression de la séance" />
      {mode === 'rest' ? (
        <RestTimer seconds={slot.rest} next={stepOf(slots[i + 1].chain).name} onDone={nextSet} />
      ) : (
        step && (
          <>
            <div className="prompt stack">
              <span className="muted small">
                {chainById.get(slot.chain)!.name} · série {slot.setIndex + 1}/{step.sets}
              </span>
              <h2 style={{ margin: 0 }}>{step.name}</h2>
              <span>
                Objectif : {step.target} {step.metric === 'seconds' ? 'secondes' : 'répétitions'}
              </span>
            </div>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 20 }}>
              {step.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            {step.metric === 'seconds' ? (
              <HoldTimer key={i} target={step.target} onDone={recordSet} />
            ) : (
              <>
                <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
                  <button className="btn audio-btn" aria-label="Une répétition de moins" onClick={() => setValue((v) => Math.max(0, v - 1))}>
                    <Minus size={22} />
                  </button>
                  <span className="math-q" aria-live="polite" style={{ minWidth: 80 }}>
                    {value}
                  </span>
                  <button className="btn audio-btn" aria-label="Une répétition de plus" onClick={() => setValue((v) => v + 1)}>
                    <Plus size={22} />
                  </button>
                </div>
                <div className="sticky-actions">
                  <button className="btn primary" onClick={() => recordSet(value)}>
                    Série faite : {value} reps
                  </button>
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}

function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now() - (seconds - left) * 1000;
    let lastBeep = Math.ceil(left);
    const id = setInterval(() => {
      const l = seconds - (Date.now() - t0) / 1000;
      setLeft(Math.max(0, l));
      const whole = Math.ceil(l);
      if (whole <= 3 && whole > 0 && whole < lastBeep) beep(660, 120);
      lastBeep = whole;
      if (l <= 0) {
        clearInterval(id);
        phaseEnd();
        end.current();
      }
    }, 100);
    return () => clearInterval(id);
    // Redémarre seulement quand on (re)lance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds]);
  return left;
}

function RestTimer({ seconds, next, onDone }: { seconds: number; next: string; onDone: () => void }) {
  const left = useCountdown(seconds, true, onDone);
  return (
    <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
      <span className="chip">Repos</span>
      <span className="math-q timer">{formatClock(left)}</span>
      <span className="muted">Ensuite : {next}</span>
      <button className="btn" onClick={onDone}>
        <SkipForward size={18} /> Passer le repos
      </button>
    </div>
  );
}

function HoldTimer({ target, onDone }: { target: number; onDone: (seconds: number) => void }) {
  const [running, setRunning] = useState(false);
  const started = useRef(0);
  const left = useCountdown(target, running, () => onDone(target));
  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <span className="math-q timer">{formatClock(left)}</span>
      {!running ? (
        <button
          className="btn primary"
          onClick={() => {
            started.current = Date.now();
            setRunning(true);
          }}
        >
          <Play size={18} /> Démarrer le maintien
        </button>
      ) : (
        <button className="btn" onClick={() => onDone(Math.floor((Date.now() - started.current) / 1000))}>
          <Pause size={18} /> J’arrête ici
        </button>
      )}
    </div>
  );
}

const FEELINGS = ['Épuisé·e', 'Dur', 'Correct', 'Bien', 'En forme'];

function Feeling({ onDone }: { onDone: (feeling: number, note: string) => void }) {
  const [feel, setFeel] = useState<number | null>(null);
  const [note, setNote] = useState('');
  return (
    <div className="stack" data-space="sport">
      <h1>Comment c’était ?</h1>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
        {FEELINGS.map((f, k) => (
          <button key={f} className={`choice ${feel === k + 1 ? 'right' : ''}`} onClick={() => setFeel(k + 1)} aria-pressed={feel === k + 1}>
            {f}
          </button>
        ))}
      </div>
      <label className="field" htmlFor="workout-note">
        Note (facultatif)
        <textarea id="workout-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Douleur, forme du jour, conditions…" />
      </label>
      <button className="btn primary block" disabled={feel === null} onClick={() => onDone(feel!, note)}>
        Enregistrer la séance
      </button>
    </div>
  );
}
