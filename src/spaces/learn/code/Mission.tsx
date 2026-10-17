import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Eye, Lightbulb, Play, RotateCcw, XCircle } from 'lucide-react';
import { db } from '../../../core/db';
import { ensureCard } from '../../../core/cards';
import { logActivity, minutesSince } from '../../../core/activity';
import { Feedback, PageTitle, RichText } from '../../../ui/kit';
import { draftKey, missionById, missionRef, missions, TRACK } from './content';
import { insertTab, newlineWithIndent, smartBackspace, type Edit } from './editor';
import { loadPython, runPython, type RunResponse } from './python';

const XP_SOLVED = 15;
const XP_WITH_SOLUTION = 5;

export function Mission() {
  const { missionId = '' } = useParams();
  const m = missionById.get(missionId);
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [py, setPy] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [pyError, setPyError] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [solution, setSolution] = useState<'hidden' | 'confirm' | 'shown'>('hidden');
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const start = useRef(Date.now());
  const pending = useRef<Edit | null>(null);

  useEffect(() => {
    if (!m) return;
    setResult(null);
    setHints(0);
    setSolution('hidden');
    setSolved(false);
    setAttempts(0);
    start.current = Date.now();
    void db.settings.get(draftKey(m.id)).then((d) => setCode((d?.value as string | undefined) ?? m.starter));
    setPy('loading');
    loadPython()
      .then(() => setPy('ready'))
      .catch((e: Error) => {
        setPy('error');
        setPyError(e.message);
      });
  }, [m]);

  // Brouillon sauvegardé à chaque frappe (léger : une seule ligne en base).
  useEffect(() => {
    if (m && code !== null) void db.settings.put({ key: draftKey(m.id), value: code });
  }, [m, code]);

  // Place le curseur après une modification faite par les aides d'édition.
  useEffect(() => {
    if (pending.current && area.current) {
      area.current.selectionStart = area.current.selectionEnd = pending.current.cursor;
      pending.current = null;
    }
  });

  if (!m) return <p>Mission introuvable.</p>;
  const index = missions.indexOf(m);
  const next = missions[index + 1];

  const apply = (edit: Edit | null, e: KeyboardEvent) => {
    if (!edit) return;
    e.preventDefault();
    pending.current = edit;
    setCode(edit.value);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void run();
    } else if (e.key === 'Tab' && !e.shiftKey) apply(insertTab(t.value, t.selectionStart, t.selectionEnd), e);
    else if (e.key === 'Enter') apply(newlineWithIndent(t.value, t.selectionStart, t.selectionEnd), e);
    else if (e.key === 'Backspace') apply(smartBackspace(t.value, t.selectionStart, t.selectionEnd), e);
  };

  const run = async () => {
    if (running || code === null) return;
    setRunning(true);
    setRunError(null);
    setAttempts((a) => a + 1);
    try {
      const r = await runPython(code, m.tests);
      setResult(r);
      const allOk = !r.error && r.results.length === m.tests.length && r.results.every((x) => x.ok);
      if (allOk && !solved) {
        setSolved(true);
        await complete();
      }
    } catch (e) {
      setResult(null);
      setRunError((e as Error).message);
      setPy('loading');
      loadPython().then(() => setPy('ready'));
    } finally {
      setRunning(false);
    }
  };

  const complete = async () => {
    const prev = await db.lessonProgress.get(m.id);
    const score = solution === 'shown' ? 0.3 : Math.max(0.4, 1 - hints * 0.2);
    await db.lessonProgress.put({ id: m.id, track: TRACK, completedAt: Date.now(), attempts: (prev?.attempts ?? 0) + 1, bestScore: Math.max(prev?.bestScore ?? 0, score) });
    for (const c of m.cards) await ensureCard(TRACK, c.id, 'concept');
    await logActivity({
      space: 'learn',
      track: TRACK,
      type: 'mission',
      ref: missionRef(m.id),
      xp: solution === 'shown' ? XP_WITH_SOLUTION : XP_SOLVED,
      minutes: minutesSince(start.current, 40),
      data: { hints, solution: solution === 'shown', attempts: attempts + 1 },
    });
  };

  const passed = result?.results.filter((r) => r.ok).length ?? 0;

  return (
    <div className="stack">
      <PageTitle title={`Mission ${index + 1} · ${m.title}`} back="/learn/code" />
      <p className="story">{m.story}</p>
      <div className="card stack">
        <span className="chip" style={{ alignSelf: 'flex-start' }}>
          {m.skill}
        </span>
        <p style={{ margin: 0 }}>
          <RichText text={m.task} />
        </p>
      </div>

      <label htmlFor="code-editor" className="sr-only">
        Ton code Python
      </label>
      <textarea
        id="code-editor"
        ref={area}
        className="code-editor"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        value={code ?? ''}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={onKey}
        rows={Math.max(8, (code ?? '').split('\n').length + 2)}
      />
      <div className="row">
        <button className="btn primary" onClick={() => void run()} disabled={running || py !== 'ready'}>
          <Play size={18} /> {running ? 'Exécution…' : 'Lancer les tests'}
        </button>
        <button className="btn ghost" onClick={() => setCode(m.starter)} title="Revenir au code de départ">
          <RotateCcw size={18} /> Repartir de zéro
        </button>
        <span className="small muted">{py === 'loading' ? 'Chargement de Python (≈ 13 Mo la première fois)…' : 'Ctrl + Entrée pour lancer'}</span>
      </div>
      {py === 'error' && <Feedback ok={false}>Python n’a pas pu se charger : {pyError}</Feedback>}
      {runError && <Feedback ok={false}>{runError}</Feedback>}

      {result && (
        <div className="card stack">
          {result.error ? (
            <>
              <b style={{ color: 'var(--bad)' }}>Ton code s’arrête sur une erreur</b>
              <pre className="console">{result.error}</pre>
            </>
          ) : (
            <>
              <b>
                Tests : {passed} / {m.tests.length}
              </b>
              {result.results.map((r) => (
                <div key={r.name} className="test-row">
                  {r.ok ? <CheckCircle2 size={18} className="ok" /> : <XCircle size={18} className="bad" />}
                  <span>
                    {r.name}
                    {!r.ok && <span className="small muted"> · {r.message}</span>}
                  </span>
                </div>
              ))}
            </>
          )}
          {result.stdout && (
            <>
              <span className="small muted">Sortie</span>
              <pre className="console">{result.stdout}</pre>
            </>
          )}
        </div>
      )}

      {solved && (
        <div className="card stack">
          <Feedback ok>Mission accomplie ! +{solution === 'shown' ? XP_WITH_SOLUTION : XP_SOLVED} XP. Les notions de la mission rejoignent ta file de révision.</Feedback>
          {next ? (
            <button className="btn primary" onClick={() => navigate(`/learn/code/${next.id}`)}>
              Mission suivante : {next.title}
            </button>
          ) : (
            <Link to="/learn/code" className="btn primary">
              Fin du chapitre
            </Link>
          )}
        </div>
      )}

      <h2 className="section-title">Coup de pouce</h2>
      <div className="stack">
        {m.hints.slice(0, hints).map((h, i) => (
          <div key={i} className="notice">
            <b>Indice {i + 1}.</b> <RichText text={h} />
          </div>
        ))}
        {hints < m.hints.length && (
          <button className="btn" onClick={() => setHints(hints + 1)}>
            <Lightbulb size={18} /> {hints === 0 ? 'Un indice' : 'Indice suivant'} ({hints + 1}/{m.hints.length})
          </button>
        )}
        {solution === 'hidden' && (
          <button className="btn ghost" onClick={() => setSolution('confirm')}>
            <Eye size={18} /> Voir la solution
          </button>
        )}
        {solution === 'confirm' && (
          <div className="notice stack">
            <span>
              {attempts === 0 ? 'Tu n’as pas encore essayé. ' : ''}Voir la solution fait passer la mission à {XP_WITH_SOLUTION} XP. On la révèle ?
            </span>
            <div className="row">
              <button className="btn primary" onClick={() => setSolution('shown')}>
                Oui, montrer
              </button>
              <button className="btn" onClick={() => setSolution('hidden')}>
                Je continue à chercher
              </button>
            </div>
          </div>
        )}
        {solution === 'shown' && (
          <div className="stack">
            <pre className="console">{m.solution}</pre>
            <button className="btn" onClick={() => setCode(m.solution)}>
              Copier dans l’éditeur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
