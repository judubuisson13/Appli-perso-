import type { ZhWord } from '../../../content/schemas';
import { toneOf, type Tone, TONE_INFO } from './pinyin';

export function Pinyin({ syllables, className = 'pinyin' }: { syllables: string[]; className?: string }) {
  return (
    <span className={className}>
      {syllables.map((s, i) => (
        <span key={i} className={`t${toneOf(s)}`}>
          {s}
        </span>
      ))}
    </span>
  );
}

export function Hanzi({ text, size }: { text: string; size?: 'md' }) {
  return (
    <span className={`hanzi ${size ?? ''}`} lang="zh-CN">
      {text}
    </span>
  );
}

export function WordBlock({ word, showFr = true }: { word: ZhWord; showFr?: boolean }) {
  return (
    <div className="prompt stack" style={{ gap: 6 }}>
      <Hanzi text={word.hanzi} />
      <Pinyin syllables={word.syllables} />
      {showFr && <div style={{ fontSize: '1.15rem' }}>{word.fr}</div>}
    </div>
  );
}

/** Courbe mélodique d'un ton (échelle de 1 à 5 de Chao). */
const CONTOURS: Record<Tone, string> = {
  1: 'M4 6 L40 6',
  2: 'M4 18 L40 4',
  3: 'M4 12 Q16 28 26 24 T40 8',
  4: 'M4 4 L40 26',
  5: 'M18 18 L26 18',
};

export function ToneContour({ tone }: { tone: Tone }) {
  return (
    <svg className="tone-contour" viewBox="0 0 44 30" aria-hidden="true">
      <path d={CONTOURS[tone]} fill="none" stroke="currentColor" strokeWidth={tone === 5 ? 6 : 4} strokeLinecap="round" />
    </svg>
  );
}

export function TonePattern({ tones }: { tones: Tone[] }) {
  return (
    <span className="row" style={{ gap: 4, justifyContent: 'center' }} aria-label={tones.map((t) => TONE_INFO[t].name).join(', ')}>
      {tones.map((t, i) => (
        <span key={i} className={`t${t}`}>
          <ToneContour tone={t} />
        </span>
      ))}
    </span>
  );
}
