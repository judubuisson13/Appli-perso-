import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export interface Settings {
  dailyGoalMinutes: number;
  theme: 'system' | 'light' | 'dark';
  speechRate: number;
  speakExercises: boolean;
  reviewBatch: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMinutes: 15,
  theme: 'system',
  speechRate: 0.8,
  speakExercises: true,
  reviewBatch: 40,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as unknown as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value });
  if (key === 'theme') applyTheme(value as Settings['theme']);
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {
    /* stockage indisponible : le thème sera réappliqué depuis IndexedDB */
  }
}
