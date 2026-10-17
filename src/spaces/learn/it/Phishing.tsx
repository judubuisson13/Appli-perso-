import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { minutesSince } from '../../../core/activity';
import { XP } from '../../../core/gamification';
import { shuffle } from '../../../core/random';
import { ExerciseHeader, Feedback } from '../../../ui/kit';
import type { PhishingMail } from '../../../content/schemas';
import { cyber } from './content';
import { completeStep } from './steps';

/** « Repère le phishing » : examine le message comme dans ta messagerie, puis tranche. */
export function PhishingGame() {
  const [mails] = useState(() => shuffle(cyber.phishing));
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<PhishingMail['verdict'] | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const start = useRef(Date.now());
  const m = mails[i];

  const decide = (v: PhishingMail['verdict']) => {
    if (answer) return;
    setAnswer(v);
    if (v === m.verdict) setScore((s) => s + 1);
  };
  const next = async () => {
    if (i + 1 < mails.length) {
      setI(i + 1);
      setAnswer(null);
      return;
    }
    await completeStep('cyber-phishing', { xp: score * XP.correctAnswer * 2, minutes: minutesSince(start.current), score: score / mails.length });
    setFinished(true);
  };

  if (finished)
    return (
      <div className="stack">
        <div className="card empty stack">
          <h1>
            {score} / {mails.length}
          </h1>
          <p className="muted">
            {score === mails.length ? 'Aucun piège ne t’a échappé.' : 'Les indices à retenir : expéditeur, urgence, lien réel, demande inhabituelle.'}
          </p>
        </div>
        <Link to="/learn/it/cyber/quiz" className="btn primary block">
          Passer au quiz
        </Link>
        <Link to="/learn/it/cyber" className="btn ghost block">
          Retour au module
        </Link>
      </div>
    );

  return (
    <div className="exercise">
      <ExerciseHeader value={i / mails.length} back="/learn/it/cyber" label="Progression" />
      <p className="muted small" style={{ margin: 0 }}>
        Message {i + 1} / {mails.length}. Touche l’expéditeur et les liens pour les inspecter.
      </p>
      <Mail key={m.id} m={m} />
      {!answer ? (
        <div className="sticky-actions">
          <button className="btn" onClick={() => decide('legit')}>
            <ShieldCheck size={18} /> Légitime
          </button>
          <button className="btn primary" onClick={() => decide('phishing')}>
            <ShieldAlert size={18} /> Phishing
          </button>
        </div>
      ) : (
        <>
          <Feedback ok={answer === m.verdict}>
            {answer === m.verdict ? 'Bien vu : ' : 'Raté : '}
            {m.verdict === 'phishing' ? 'c’était du phishing.' : 'ce message était légitime.'}
          </Feedback>
          <div className="card stack" style={{ gap: 6 }}>
            <b>Les indices</b>
            <ul style={{ margin: 0, paddingLeft: 20 }} className="stack">
              {m.clues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="sticky-actions">
            <button className="btn primary" onClick={() => void next()} autoFocus>
              {i + 1 < mails.length ? 'Message suivant' : 'Voir le score'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Mail({ m }: { m: PhishingMail }) {
  const [showFrom, setShowFrom] = useState(false);
  const [showLink, setShowLink] = useState(false);
  return (
    <article className="card stack mail" style={{ gap: 10 }} aria-label="Message à analyser">
      <div className="stack" style={{ gap: 2 }}>
        <button className="link-like" onClick={() => setShowFrom(!showFrom)} aria-expanded={showFrom}>
          De : <b>{m.fromName}</b> {showFrom ? <span className="mono">&lt;{m.fromEmail}&gt;</span> : <span className="muted small">(voir l’adresse)</span>}
        </button>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{m.subject}</div>
      </div>
      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0, width: '100%' }} />
      {m.body.map((line, k) =>
        line === '{link}' && m.link ? (
          <div key={k} className="stack" style={{ gap: 6 }}>
            <button className="btn" style={{ alignSelf: 'flex-start', color: 'var(--learn)' }} onClick={() => setShowLink(true)}>
              {m.link.text}
            </button>
            {showLink && (
              <span className="small notice">
                Ce lien mène vers : <span className="mono">{m.link.href}</span>
              </span>
            )}
          </div>
        ) : (
          <p key={k} style={{ margin: 0 }}>
            {line}
          </p>
        ),
      )}
    </article>
  );
}
