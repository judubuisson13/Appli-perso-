import type { CardRow } from '../../../core/db';
import type { CardView } from '../../../core/modules';
import { AudioButton } from '../../../ui/kit';
import { wordsById } from './content';
import { Hanzi, Pinyin } from './ui';

function useWord(card: CardRow) {
  return wordsById.get(card.itemId);
}

function Example({ card }: { card: CardRow }) {
  const ex = useWord(card)?.example;
  if (!ex) return null;
  return (
    <div className="notice" style={{ textAlign: 'left' }}>
      <div lang="zh-CN" className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: '1.2rem' }}>{ex.hanzi}</span>
        <AudioButton text={ex.hanzi} />
      </div>
      <div className="muted">{ex.pinyin}</div>
      <div>{ex.fr}</div>
    </div>
  );
}

export const zhCards: Record<string, CardView> = {
  recog: {
    front: ({ card }) => {
      const w = useWord(card);
      if (!w) return null;
      return (
        <div className="prompt stack" style={{ alignItems: 'center' }}>
          <span className="muted small">Que veut dire ce mot ?</span>
          <Hanzi text={w.hanzi} />
          <AudioButton text={w.hanzi} />
        </div>
      );
    },
    back: ({ card }) => {
      const w = useWord(card);
      if (!w) return null;
      return (
        <div className="stack" style={{ textAlign: 'center' }}>
          <Pinyin syllables={w.syllables} />
          <div style={{ fontSize: '1.2rem' }}>{w.fr}</div>
          <Example card={card} />
        </div>
      );
    },
  },
  produce: {
    front: ({ card }) => {
      const w = useWord(card);
      if (!w) return null;
      return (
        <div className="prompt stack">
          <span className="muted small">Comment dit-on en chinois…</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 600 }}>{w.fr}</div>
          <span className="muted small">Dis-le à voix haute, puis vérifie.</span>
        </div>
      );
    },
    back: ({ card }) => {
      const w = useWord(card);
      if (!w) return null;
      return (
        <div className="stack" style={{ alignItems: 'center' }}>
          <Hanzi text={w.hanzi} size="md" />
          <Pinyin syllables={w.syllables} />
          <AudioButton text={w.hanzi} autoPlay />
          <Example card={card} />
        </div>
      );
    },
  },
};
