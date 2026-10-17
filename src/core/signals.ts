/** Bips (Web Audio) et vibration pour les minuteurs. Silencieux si le navigateur refuse. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** À appeler sur un geste de l'utilisateur (clic « Démarrer ») pour autoriser le son ensuite. */
export function unlockAudio() {
  audio();
}

export function beep(freq = 880, ms = 160, volume = 0.25) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(a.destination);
  const t = a.currentTime;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non disponible */
  }
}

/** Signal de fin de phase : bip aigu + vibration. */
export function phaseEnd() {
  beep(1046, 260);
  vibrate([120, 60, 120]);
}

/** Garde l'écran allumé pendant une séance, si le navigateur le permet. */
export async function keepAwake(): Promise<() => void> {
  try {
    const lock = await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen');
    return () => void lock?.release();
  } catch {
    return () => {};
  }
}
