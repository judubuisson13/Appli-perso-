import { db } from './db';

export async function latestClip(itemId: string) {
  const clips = await db.audioClips.where('itemId').equals(itemId).sortBy('createdAt');
  return clips.at(-1);
}

let current: HTMLAudioElement | null = null;

export async function playBlob(blob: Blob): Promise<void> {
  current?.pause();
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  current = a;
  await new Promise<void>((resolve) => {
    a.onended = a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
  URL.revokeObjectURL(url);
}

/** Joue le dernier enregistrement d'un élément. Renvoie false s'il n'y en a pas. */
export async function playLatest(itemId: string): Promise<boolean> {
  const clip = await latestClip(itemId);
  if (!clip) return false;
  await playBlob(clip.blob);
  return true;
}

export function canRecord(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

function pickMime(): string {
  for (const m of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg']) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return '';
}

/** Démarre un enregistrement ; appeler la fonction renvoyée pour l'arrêter et obtenir le fichier. */
export async function startRecording(maxMs = 10_000): Promise<() => Promise<Blob>> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }));
    };
  });
  rec.start();
  const timer = setTimeout(() => rec.state === 'recording' && rec.stop(), maxMs);
  return async () => {
    clearTimeout(timer);
    if (rec.state === 'recording') rec.stop();
    return done;
  };
}
