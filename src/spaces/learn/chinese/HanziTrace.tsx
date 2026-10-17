import { useEffect, useRef, useState } from 'react';
import HanziWriter, { type CharacterJson } from 'hanzi-writer';
import { Eye, PenLine, RotateCcw } from 'lucide-react';

const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

/** Données de tracé : copie locale (hors ligne) puis CDN en secours. */
function loadChar(char: string, onLoad: (data: CharacterJson) => void, onError: (e: unknown) => void) {
  const local = `${import.meta.env.BASE_URL}hanzi/${encodeURIComponent(char)}.json`;
  fetch(local)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('absent'))))
    .catch(() => fetch(`${CDN}${encodeURIComponent(char)}.json`).then((r) => r.json()))
    .then(onLoad, onError);
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

interface Props {
  char: string;
  /** Appelé quand le tracé complet est réussi, avec le nombre d'erreurs. */
  onComplete?: (mistakes: number) => void;
  autoQuiz?: boolean;
}

export function HanziTrace({ char, onComplete, autoQuiz = true }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'done' | 'error'>('loading');
  const [mistakes, setMistakes] = useState(0);
  const done = useRef(onComplete);
  done.current = onComplete;

  const startQuiz = () => {
    setMistakes(0);
    setStatus('ready');
    writer.current?.quiz({
      showHintAfterMisses: 2,
      onMistake: (s) => setMistakes(s.totalMistakes),
      onComplete: (s) => {
        setStatus('done');
        done.current?.(s.totalMistakes);
      },
    });
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = '';
    setStatus('loading');
    const size = el.clientWidth || 260;
    const w = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 16,
      showOutline: true,
      showCharacter: false,
      strokeColor: cssVar('--text'),
      outlineColor: cssVar('--border'),
      drawingColor: cssVar('--learn'),
      highlightColor: cssVar('--accent'),
      radicalColor: cssVar('--t1'),
      drawingWidth: 22,
      charDataLoader: loadChar,
      onLoadCharDataSuccess: () => {
        setStatus('ready');
        if (autoQuiz) startQuiz();
      },
      onLoadCharDataError: () => setStatus('error'),
    });
    writer.current = w;
    return () => {
      writer.current = null;
      el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  const demo = () => {
    writer.current?.cancelQuiz();
    writer.current?.hideCharacter();
    writer.current?.animateCharacter({ onComplete: () => startQuiz() });
  };

  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <div ref={box} className="trace-box" aria-label={`Zone de tracé du caractère ${char}`} />
      {status === 'error' && <p className="muted small">Tracé indisponible pour ce caractère hors ligne.</p>}
      <p className="small muted" aria-live="polite">
        {status === 'done'
          ? mistakes === 0
            ? 'Parfait, sans erreur !'
            : `Réussi avec ${mistakes} erreur${mistakes > 1 ? 's' : ''}.`
          : 'Trace les traits dans l’ordre. Un indice apparaît après 2 erreurs.'}
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={demo}>
          <Eye size={18} /> Voir l’ordre
        </button>
        <button type="button" className="btn" onClick={startQuiz}>
          {status === 'done' ? <RotateCcw size={18} /> : <PenLine size={18} />} Recommencer
        </button>
      </div>
    </div>
  );
}
