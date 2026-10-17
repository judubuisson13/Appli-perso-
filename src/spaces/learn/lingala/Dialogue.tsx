import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, Play } from 'lucide-react';
import { logActivity, minutesSince } from '../../../core/activity';
import { playLatest } from '../../../core/audio';
import { XP } from '../../../core/gamification';
import { shuffle } from '../../../core/random';
import { Feedback, PageTitle } from '../../../ui/kit';
import { lineAudioId, loadDialogues, loadEntries, TRACK, type LnDialogueView } from './content';
import { StatusBadge } from './ui';

/** Dialogue : lecture avec audio enregistré, puis « à toi de répondre » (rôle B). */
export function DialoguePage() {
  const { dialogueId = '' } = useParams();
  const [d, setD] = useState<LnDialogueView | null>(null);
  const [pool, setPool] = useState<string[]>([]);
  const [mode, setMode] = useState<'read' | 'play'>('read');

  useEffect(() => {
    void loadDialogues().then((all) => setD(all.find((x) => x.id === dialogueId) ?? null));
    void loadEntries().then((e) => setPool(e.map((x) => x.ln)));
  }, [dialogueId]);

  if (!d) return null;
  return (
    <div className="stack">
      <PageTitle title={d.title} back="/learn/ln" />
      <div className="row">
        <StatusBadge status={d.status} />
        <Link to={`/learn/ln/dialogue/${d.id}/edit`} className="btn ghost">
          <Pencil size={16} /> Corriger, enregistrer
        </Link>
      </div>
      <div className="filter-row" role="group" aria-label="Mode">
        <button className="btn" aria-pressed={mode === 'read'} onClick={() => setMode('read')}>
          Lire
        </button>
        <button className="btn" aria-pressed={mode === 'play'} onClick={() => setMode('play')}>
          Jouer le rôle de B
        </button>
      </div>
      {mode === 'read' ? <Read d={d} /> : <PlayB key={d.id} d={d} pool={pool} />}
    </div>
  );
}

function Read({ d }: { d: LnDialogueView }) {
  const [showFr, setShowFr] = useState(true);
  return (
    <>
      <label className="switch">
        <span>Afficher la traduction</span>
        <input id="dlg-fr" type="checkbox" checked={showFr} onChange={(e) => setShowFr(e.target.checked)} />
      </label>
      <div className="stack">
        {d.lines.map((l, i) => (
          <div key={i} className={`bubble ${l.speaker === 'B' ? 'me' : ''}`}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <b lang="ln">
                {l.speaker} · {l.ln}
              </b>
              <button className="icon-btn" aria-label="Écouter cette réplique" onClick={() => void playLatest(lineAudioId(d.id, i))}>
                <Play size={16} />
              </button>
            </div>
            {showFr && <div className="muted small">{l.fr}</div>}
          </div>
        ))}
      </div>
      <p className="small muted">Le bouton ▶ joue ton enregistrement de la réplique, s’il existe.</p>
    </>
  );
}

function PlayB({ d, pool }: { d: LnDialogueView; pool: string[] }) {
  const turns = d.lines.map((l, i) => ({ ...l, i })).filter((l) => l.speaker === 'B');
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const start = useRef(Date.now());
  const logged = useRef(false);
  const turn = turns[step];
  const options = useMemo(() => {
    if (!turn) return [];
    const others = shuffle([...new Set([...d.lines.map((l) => l.ln), ...pool])].filter((x) => x !== turn.ln)).slice(0, 2);
    return shuffle([turn.ln, ...others]);
  }, [turn, d.lines, pool]);

  useEffect(() => {
    if (turn || logged.current) return;
    logged.current = true;
    void logActivity({ space: 'learn', track: TRACK, type: 'dialogue', ref: `dialogue:${d.id}`, xp: score * XP.correctAnswer + 5, minutes: minutesSince(start.current) });
  }, [turn, d.id, score]);

  if (!turn)
    return (
      <div className="card empty stack">
        <h2>
          {score} / {turns.length} bonnes répliques
        </h2>
        <Link to="/learn/ln" className="btn primary">
          Retour au lingala
        </Link>
      </div>
    );

  const before = d.lines.slice(0, turn.i);
  return (
    <>
      <div className="stack">
        {before.map((l, i) => (
          <div key={i} className={`bubble ${l.speaker === 'B' ? 'me' : ''}`} lang="ln">
            <b>{l.speaker}</b> · {l.ln}
          </div>
        ))}
      </div>
      <p className="muted small">À toi (B). Ce que tu veux dire : « {turn.fr} »</p>
      <div className="stack">
        {options.map((o) => (
          <button
            key={o}
            className={`choice ${picked ? (o === turn.ln ? 'right' : o === picked ? 'wrong' : '') : ''}`}
            disabled={!!picked}
            lang="ln"
            onClick={() => {
              setPicked(o);
              if (o === turn.ln) setScore((s) => s + 1);
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <>
          <Feedback ok={picked === turn.ln}>{picked === turn.ln ? 'Bonne réplique !' : `On dirait plutôt : « ${turn.ln} »`}</Feedback>
          <button
            className="btn primary block"
            autoFocus
            onClick={() => {
              setPicked(null);
              setStep(step + 1);
            }}
          >
            Continuer
          </button>
        </>
      )}
    </>
  );
}
