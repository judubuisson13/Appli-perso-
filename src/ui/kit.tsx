import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, X } from 'lucide-react';
import { speak } from '../core/speech';
import { useSettings } from '../core/settings';

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** En-tête d'exercice : quitter + progression. */
export function ExerciseHeader({ value, back, label }: { value: number; back: string; label?: string }) {
  return (
    <div className="progress-head">
      <Link to={back} className="icon-btn" aria-label="Quitter">
        <X size={20} />
      </Link>
      <ProgressBar value={value} label={label ?? 'Progression'} />
    </div>
  );
}

export function AudioButton({ text, lang = 'zh-CN', autoPlay = false, big = false }: { text: string; lang?: string; autoPlay?: boolean; big?: boolean }) {
  const { speechRate } = useSettings();
  const [playing, setPlaying] = useState(false);
  const play = async () => {
    setPlaying(true);
    await speak(text, lang, speechRate);
    setPlaying(false);
  };
  useEffect(() => {
    if (autoPlay) void speak(text, lang, speechRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);
  return (
    <button type="button" className={`btn ${big ? 'audio-btn primary' : ''}`} onClick={play} aria-label="Écouter" disabled={playing}>
      <Volume2 size={big ? 26 : 18} />
    </button>
  );
}

export function Feedback({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div className={`feedback ${ok ? 'ok' : 'bad'}`} role="status">
      {children}
    </div>
  );
}

export function PageTitle({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <header style={{ marginBottom: 12 }}>
      {back && (
        <Link to={back} className="small muted" style={{ textDecoration: 'none' }}>
          ← Retour
        </Link>
      )}
      <h1 style={{ marginTop: back ? 6 : 0 }}>{title}</h1>
      {sub && <p className="muted">{sub}</p>}
    </header>
  );
}

/** Raccourcis clavier pour les exercices sur ordinateur. */
export function useKeys(handler: (key: string) => void, deps: unknown[]) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handler(e.key);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Texte avec `code`, **gras** et *italique* en ligne (seules mises en forme utilisées dans le contenu). */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
        if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
