/* ---------- Minuteur ---------- */

export type PhaseKind = 'prepare' | 'work' | 'rest' | 'done';
export interface Phase {
  kind: PhaseKind;
  label: string;
  seconds: number;
}

export interface IntervalConfig {
  work: number;
  rest: number;
  rounds: number;
  /** Circuits : nombre de tours, avec un repos plus long entre deux tours. */
  sets?: number;
  setRest?: number;
  prepare?: number;
}

export const TABATA: IntervalConfig = { work: 20, rest: 10, rounds: 8, prepare: 10 };

/** Déroulé complet d'une séance d'intervalles (sans repos après le tout dernier effort). */
export function buildIntervals(c: IntervalConfig): Phase[] {
  const out: Phase[] = [];
  if (c.prepare) out.push({ kind: 'prepare', label: 'Prépare-toi', seconds: c.prepare });
  const sets = c.sets ?? 1;
  for (let s = 0; s < sets; s++) {
    for (let r = 0; r < c.rounds; r++) {
      const tag = sets > 1 ? `Tour ${s + 1} · ${r + 1}/${c.rounds}` : `${r + 1}/${c.rounds}`;
      out.push({ kind: 'work', label: `Effort ${tag}`, seconds: c.work });
      const last = r === c.rounds - 1;
      if (!last && c.rest > 0) out.push({ kind: 'rest', label: 'Repos', seconds: c.rest });
    }
    if (s < sets - 1 && (c.setRest ?? 0) > 0) out.push({ kind: 'rest', label: 'Repos entre les tours', seconds: c.setRest! });
  }
  return out;
}

export function totalSeconds(phases: Phase[]): number {
  return phases.reduce((a, p) => a + p.seconds, 0);
}

/** Phase en cours et secondes restantes après `elapsed` secondes. */
export function phaseAt(phases: Phase[], elapsed: number): { index: number; remaining: number } {
  let t = elapsed;
  for (let i = 0; i < phases.length; i++) {
    if (t < phases[i].seconds) return { index: i, remaining: phases[i].seconds - t };
    t -= phases[i].seconds;
  }
  return { index: phases.length, remaining: 0 };
}

export function formatClock(s: number): string {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

/* ---------- Progression du programme ---------- */

export interface ChainState {
  step: number;
  /** Séances où toutes les séries ont atteint l'objectif, à ce palier. */
  validations: number;
}
export type ProgramState = Record<string, ChainState>;

export function chainState(state: ProgramState, chain: string): ChainState {
  return state[chain] ?? { step: 0, validations: 0 };
}

/** Un exercice est validé quand chaque série atteint l'objectif. */
export function isValidated(sets: number[], target: number, expectedSets: number): boolean {
  return sets.length >= expectedSets && sets.slice(0, expectedSets).every((v) => v >= target);
}

/**
 * Met à jour les validations après une séance. Renvoie les chaînes prêtes à passer au palier suivant :
 * on propose, on n'impose pas (c'est l'utilisateur qui accepte).
 */
export function applySession(
  state: ProgramState,
  results: { chain: string; validated: boolean }[],
  threshold: number,
  maxStep: Record<string, number>,
): { state: ProgramState; ready: string[] } {
  const next: ProgramState = { ...state };
  const ready: string[] = [];
  for (const r of results) {
    const cur = chainState(next, r.chain);
    const validations = r.validated ? cur.validations + 1 : cur.validations;
    next[r.chain] = { ...cur, validations };
    if (validations >= threshold && cur.step < maxStep[r.chain]) ready.push(r.chain);
  }
  return { state: next, ready };
}

export function advance(state: ProgramState, chain: string, delta: 1 | -1, maxStep: number): ProgramState {
  const cur = chainState(state, chain);
  return { ...state, [chain]: { step: Math.max(0, Math.min(maxStep, cur.step + delta)), validations: 0 } };
}

/* ---------- Planning ---------- */

/** Jours ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return w === 0 ? 7 : w;
}

/** Séance du jour : alterne A/B selon le nombre de séances déjà faites. */
export function plannedSession(days: number[], day: string, sessionIds: string[], doneCount: number): string | null {
  if (!days.includes(isoWeekday(day))) return null;
  return sessionIds[doneCount % sessionIds.length];
}
