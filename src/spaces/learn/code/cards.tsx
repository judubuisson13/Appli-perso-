import type { CardView } from '../../../core/modules';
import { RichText } from '../../../ui/kit';
import { conceptById, missionById } from './content';

export const codeCards: Record<string, CardView> = {
  concept: {
    front: ({ card }) => {
      const c = conceptById.get(card.itemId);
      if (!c) return null;
      return (
        <div className="prompt stack">
          <span className="muted small">Python · {missionById.get(c.missionId)?.skill}</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>
            <RichText text={c.front} />
          </div>
        </div>
      );
    },
    back: ({ card }) => {
      const c = conceptById.get(card.itemId);
      if (!c) return null;
      return (
        <div style={{ fontSize: '1.1rem', textAlign: 'center' }}>
          <RichText text={c.back} />
        </div>
      );
    },
  },
};
