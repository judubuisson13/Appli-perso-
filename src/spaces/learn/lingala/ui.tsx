import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleAlert, CircleCheck, Volume2 } from 'lucide-react';
import { db } from '../../../core/db';
import { playLatest } from '../../../core/audio';
import type { VerifyStatus } from '../../../content/schemas';
import { TRACK } from './content';

export function StatusBadge({ status }: { status: VerifyStatus }) {
  return status === 'verified' ? (
    <span className="chip ok">
      <CircleCheck size={14} /> vérifié
    </span>
  ) : (
    <span className="chip warn" title="Contenu généré, pas encore validé par un locuteur">
      <CircleAlert size={14} /> à vérifier
    </span>
  );
}

/** Bouton d'écoute de mon enregistrement (le lingala n'a pas de voix de synthèse fiable). */
export function LnAudio({ itemId, big = false }: { itemId: string; big?: boolean }) {
  const count = useLiveQuery(() => db.audioClips.where('itemId').equals(`${TRACK}:${itemId}`).count(), [itemId], 0);
  const [playing, setPlaying] = useState(false);
  if (!count) return big ? <span className="small muted">Pas encore d’enregistrement</span> : null;
  return (
    <button
      className={`btn ${big ? 'audio-btn primary' : ''}`}
      aria-label="Écouter l’enregistrement"
      disabled={playing}
      onClick={async () => {
        setPlaying(true);
        await playLatest(`${TRACK}:${itemId}`);
        setPlaying(false);
      }}
    >
      <Volume2 size={big ? 26 : 18} />
    </button>
  );
}
