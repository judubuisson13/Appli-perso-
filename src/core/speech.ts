/** Synthèse et reconnaissance vocales du navigateur (Web Speech API). */

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  voicesReady ??= new Promise((resolve) => {
    const now = speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesReady;
}

export async function voiceFor(lang: string): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await loadVoices();
  const base = lang.split('-')[0];
  return (
    voices.find((v) => v.lang.replace('_', '-') === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base))
  );
}

export async function hasVoice(lang: string): Promise<boolean> {
  return !!(await voiceFor(lang));
}

export async function speak(text: string, lang = 'zh-CN', rate = 0.8): Promise<void> {
  if (!('speechSynthesis' in window)) return;
  const voice = await voiceFor(lang);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  if (voice) u.voice = voice;
  await new Promise<void>((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
}

export function canRecognize(): boolean {
  return typeof window !== 'undefined' && !!recognitionCtor() && window.isSecureContext;
}

/** Écoute une phrase et renvoie les transcriptions candidates (vide si rien entendu). */
export function listen(lang = 'zh-CN', timeoutMs = 7000): Promise<string[]> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.reject(new Error('Reconnaissance vocale non disponible sur ce navigateur.'));
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 5;
    let results: string[] = [];
    const timer = setTimeout(() => r.abort(), timeoutMs);
    r.onresult = (e) => {
      const first = e.results[0];
      results = Array.from({ length: first.length }, (_, i) => first[i].transcript.trim());
    };
    r.onerror = (e) => {
      clearTimeout(timer);
      if (e.error === 'no-speech' || e.error === 'aborted') resolve([]);
      else reject(new Error(e.error === 'not-allowed' ? 'Micro refusé.' : `Erreur : ${e.error}`));
    };
    r.onend = () => {
      clearTimeout(timer);
      resolve(results);
    };
    r.start();
  });
}
