import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { logActivity } from '../../core/activity';
import { beep, keepAwake, phaseEnd, unlockAudio } from '../../core/signals';
import { PageTitle } from '../../ui/kit';
import { buildIntervals, formatClock, phaseAt, TABATA, totalSeconds, type IntervalConfig } from './logic';

const PRESETS: { id: string; label: string; config: IntervalConfig }[] = [
  { id: 'tabata', label: 'Tabata 20/10 × 8', config: TABATA },
  { id: 'circuit', label: 'Circuit 40/20 × 5, 3 tours', config: { work: 40, rest: 20, rounds: 5, sets: 3, setRest: 90, prepare: 10 } },
  { id: 'emom', label: 'Chaque minute × 10', config: { work: 60, rest: 0, rounds: 10, prepare: 10 } },
  { id: 'rest90', label: 'Repos 90 s', config: { work: 90, rest: 0, rounds: 1 } },
];

const NUMBER_FIELDS: [keyof IntervalConfig, string][] = [
  ['work', 'Effort (s)'],
  ['rest', 'Repos (s)'],
  ['rounds', 'Répétitions'],
  ['sets', 'Tours'],
  ['setRest', 'Repos entre tours (s)'],
];

export function TimerPage() {
  const [config, setConfig] = useState<IntervalConfig>(TABATA);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const base = useRef(0);
  const lastIndex = useRef(-1);
  const lastWhole = useRef(0);
  const release = useRef<() => void>(() => {});
  const logged = useRef(false);
  const phases = buildIntervals(config);
  const total = totalSeconds(phases);
  const { index, remaining } = phaseAt(phases, elapsed);
  const phase = phases[index];
  const finished = index >= phases.length;

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Signaux : 3 bips avant chaque changement, un signal long au changement.
  useEffect(() => {
    if (!running) return;
    if (index !== lastIndex.current) {
      if (lastIndex.current >= 0) phaseEnd();
      lastIndex.current = index;
    }
    const whole = Math.ceil(remaining);
    if (!finished && whole <= 3 && whole > 0 && whole !== lastWhole.current) beep(660, 110);
    lastWhole.current = whole;
    if (finished) {
      setRunning(false);
      release.current();
      if (!logged.current && total >= 60) {
        logged.current = true;
        void logActivity({ space: 'sport', type: 'timer', ref: 'sport:timer', xp: 10, minutes: total / 60 });
      }
    }
  }, [index, remaining, running, finished, total]);

  const toggle = async () => {
    if (finished) return reset();
    unlockAudio();
    if (!running) release.current = await keepAwake();
    else release.current();
    base.current = elapsed;
    setRunning(!running);
  };
  const reset = () => {
    setRunning(false);
    setElapsed(0);
    lastIndex.current = -1;
    logged.current = false;
    release.current();
  };

  const color = !phase ? 'var(--ok)' : phase.kind === 'work' ? 'var(--sport)' : phase.kind === 'rest' ? 'var(--learn)' : 'var(--accent)';

  return (
    <div className="stack" data-space="sport">
      <PageTitle title="Minuteur" back="/sport" />
      <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', borderTop: `6px solid ${color}` }}>
        <span className="chip" style={{ color }}>
          {finished ? 'Terminé' : phase.label}
        </span>
        <span className="timer" style={{ fontSize: 'clamp(4rem, 22vw, 6.5rem)', lineHeight: 1, color }} aria-live="off">
          {formatClock(finished ? 0 : remaining)}
        </span>
        <span className="small muted">
          Total {formatClock(Math.max(0, total - elapsed))} restant · {formatClock(total)} en tout
        </span>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => void toggle()} style={{ minWidth: 140 }}>
            {running ? <Pause size={18} /> : <Play size={18} />} {running ? 'Pause' : finished ? 'Recommencer' : elapsed > 0 ? 'Reprendre' : 'Démarrer'}
          </button>
          <button className="btn" onClick={reset} aria-label="Remettre à zéro">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      {!running && (
        <>
          <h2 className="section-title">Formats</h2>
          <div className="filter-row">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className="btn"
                aria-pressed={JSON.stringify(p.config) === JSON.stringify(config)}
                onClick={() => {
                  reset();
                  setConfig(p.config);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="card grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {NUMBER_FIELDS.map(([k, label]) => (
              <label key={k} className="field small" htmlFor={`timer-${k}`}>
                {label}
                <input
                  id={`timer-${k}`}
                  type="number"
                  min={k === 'rounds' || k === 'sets' ? 1 : 0}
                  max={3600}
                  value={(config[k] as number | undefined) ?? (k === 'sets' ? 1 : 0)}
                  onChange={(e) => {
                    reset();
                    setConfig({ ...config, [k]: Math.max(0, Number(e.target.value) || 0) });
                  }}
                />
              </label>
            ))}
          </div>
          <p className="small muted">Les 3 dernières secondes de chaque phase sonnent, et le téléphone vibre au changement. L’écran reste allumé pendant la séance.</p>
        </>
      )}
    </div>
  );
}
