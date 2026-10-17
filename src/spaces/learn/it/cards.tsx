import type { CardView } from '../../../core/modules';
import { itCardById } from './content';

export const itCards: Record<string, CardView> = {
  term: {
    front: ({ card }) => (
      <div className="prompt stack">
        <span className="muted small">Cybersécurité · que signifie…</span>
        <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{itCardById.get(card.itemId)?.front}</div>
      </div>
    ),
    back: ({ card }) => <div style={{ fontSize: '1.05rem', textAlign: 'center' }}>{itCardById.get(card.itemId)?.back}</div>,
  },
};
