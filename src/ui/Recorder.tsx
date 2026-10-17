import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Mic, Play, Square, Trash2 } from 'lucide-react';
import { db } from '../core/db';
import { canRecord, playBlob, startRecording } from '../core/audio';

/** Enregistrer, réécouter et supprimer des prononciations rattachées à un élément de contenu. */
export function Recorder({ itemId }: { itemId: string }) {
  const clips = useLiveQuery(() => db.audioClips.where('itemId').equals(itemId).sortBy('createdAt'), [itemId], []);
  const stop = useRef<(() => Promise<Blob>) | null>(null);
  const [recording, setRecording] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!canRecord()) {
    return (
      <p className="small muted">
        Enregistrement indisponible ici : le micro demande une connexion sécurisée (HTTPS ou localhost) et un navigateur qui le permet.
      </p>
    );
  }

  const finish = async () => {
    const s = stop.current;
    if (!s) return;
    stop.current = null;
    const blob = await s();
    setRecording(false);
    if (blob.size > 0) await db.audioClips.add({ itemId, blob, mime: blob.type, createdAt: Date.now(), label: label.trim() || undefined });
  };

  const toggle = async () => {
    setError(null);
    if (stop.current) return finish();
    try {
      const s = await startRecording();
      stop.current = s;
      setRecording(true);
      // Arrêt automatique après 10 s : le fichier est quand même enregistré.
      setTimeout(() => {
        if (stop.current === s) void finish();
      }, 10_000);
    } catch (e) {
      setError((e as Error).name === 'NotAllowedError' ? 'Micro refusé. Autorise-le dans les réglages du navigateur.' : (e as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <input
          id={`rec-label-${itemId}`}
          placeholder="Qui parle ? (facultatif)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
          aria-label="Nom de la personne enregistrée"
        />
        <button className={`btn ${recording ? 'danger' : 'primary'}`} onClick={() => void toggle()}>
          {recording ? <Square size={18} /> : <Mic size={18} />} {recording ? 'Arrêter' : 'Enregistrer'}
        </button>
      </div>
      {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      {clips.map((c) => (
        <div key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn" onClick={() => void playBlob(c.blob)}>
            <Play size={16} /> Écouter
          </button>
          <span className="small muted" style={{ flex: 1 }}>
            {c.label ? `${c.label} · ` : ''}
            {new Date(c.createdAt).toLocaleDateString('fr-FR')}
          </span>
          <button className="icon-btn" aria-label="Supprimer cet enregistrement" onClick={() => void db.audioClips.delete(c.id!)}>
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
