import { db } from '../../core/db';

export type GameId = 'memory' | 'math';

export const GAMES: Record<GameId, { title: string; pitch: string; unit: string; minutes: number }> = {
  memory: { title: 'Séquence', pitch: 'Mémorise l’ordre des cases qui s’allument, puis reproduis-le.', unit: 'cases', minutes: 3 },
  math: { title: 'Calcul mental', pitch: '60 secondes de calculs. La difficulté suit ton niveau.', unit: 'bonnes réponses', minutes: 2 },
};

export interface GameScore {
  ts: number;
  score: number;
  level?: number;
}

export async function scoresOf(game: GameId): Promise<GameScore[]> {
  const rows = await db.activity.where('type').equals('brain').toArray();
  return rows
    .filter((r) => r.data?.game === game)
    .sort((a, b) => a.ts - b.ts)
    .map((r) => ({ ts: r.ts, score: Number(r.data?.score ?? 0), level: r.data?.level as number | undefined }));
}

/** Jeu du jour : alterne selon la date pour varier sans rien décider. */
export function gameOfDay(day: string): GameId {
  const n = [...day].reduce((a, c) => a + c.charCodeAt(0), 0);
  return n % 2 === 0 ? 'memory' : 'math';
}
