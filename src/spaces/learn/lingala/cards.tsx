import { useLiveQuery } from 'dexie-react-hooks';
import type { CardRow } from '../../../core/db';
import type { CardView } from '../../../core/modules';
import { loadEntries } from './content';
import { LnAudio, StatusBadge } from './ui';

function useEntry(card: CardRow) {
  return useLiveQuery(async () => (await loadEntries()).find((e) => e.id === card.itemId), [card.itemId]);
}

export const lnCards: Record<string, CardView> = {
  recog: {
    front: ({ card }) => {
      const e = useEntry(card);
      if (!e) return null;
      return (
        <div className="prompt stack" style={{ alignItems: 'center' }}>
          <span className="muted small">Que veut dire…</span>
          <span className="ln-text" lang="ln">
            {e.ln}
          </span>
          <LnAudio itemId={e.id} />
        </div>
      );
    },
    back: ({ card }) => {
      const e = useEntry(card);
      if (!e) return null;
      return (
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem' }}>{e.fr}</div>
          {e.notes && <div className="muted small">{e.notes}</div>}
          <StatusBadge status={e.status} />
        </div>
      );
    },
  },
  produce: {
    front: ({ card }) => {
      const e = useEntry(card);
      if (!e) return null;
      return (
        <div className="prompt stack">
          <span className="muted small">Comment dit-on en lingala…</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{e.fr}</div>
        </div>
      );
    },
    back: ({ card }) => {
      const e = useEntry(card);
      if (!e) return null;
      return (
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="ln-text" lang="ln">
            {e.ln}
          </span>
          <LnAudio itemId={e.id} />
          <StatusBadge status={e.status} />
        </div>
      );
    },
  },
};
