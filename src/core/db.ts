import Dexie, { type EntityTable } from 'dexie';
import type { SrsState } from './srs';

export type SpaceId = 'learn' | 'sport' | 'kitchen' | 'brain';

/** Une carte de révision, quel que soit le parcours. id = `${track}:${itemId}:${kind}`. */
export interface CardRow {
  id: string;
  track: string;
  kind: string;
  itemId: string;
  due: number;
  srs: SrsState;
  createdAt: number;
}

export interface ReviewLogRow {
  id?: number;
  cardId: string;
  track: string;
  grade: number;
  ts: number;
}

/** Journal unique de tout ce qui est fait : la série, l'XP et les minutes en découlent. */
export interface ActivityRow {
  id?: number;
  day: string;
  ts: number;
  space: SpaceId;
  track?: string;
  type: string;
  ref?: string;
  xp: number;
  minutes: number;
  data?: Record<string, unknown>;
}

export interface LessonProgressRow {
  id: string;
  track: string;
  completedAt: number;
  attempts: number;
  bestScore: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Corrections faites dans l'appli, appliquées par-dessus le contenu JSON (tranche 2 : lingala). */
export interface ContentEditRow {
  id: string;
  track: string;
  patch: Record<string, unknown>;
  status?: 'to-verify' | 'verified';
  updatedAt: number;
}

export interface AudioClipRow {
  id?: number;
  itemId: string;
  blob: Blob;
  mime: string;
  createdAt: number;
  label?: string;
}

/** Une séance de sport enregistrée (programme ou libre). */
export interface WorkoutRow {
  id?: number;
  day: string;
  ts: number;
  sessionId: string;
  title: string;
  entries: { chain: string; stepId: string; metric: 'reps' | 'seconds'; target: number; sets: number[] }[];
  minutes: number;
  feeling?: number;
  note?: string;
}

/** Placard / frigo. `ing` = identifiant du catalogue, ou `free:<nom>` pour un produit hors catalogue. */
export interface PantryRow {
  id?: number;
  ing: string;
  name: string;
  qty: number;
  unit: string;
  expires?: string;
  addedAt: number;
}

export interface UserRecipeRow {
  id: string;
  recipe: import('../content/schemas').Recipe;
  updatedAt: number;
}

export class AppDB extends Dexie {
  cards!: EntityTable<CardRow, 'id'>;
  reviewLogs!: EntityTable<ReviewLogRow, 'id'>;
  activity!: EntityTable<ActivityRow, 'id'>;
  lessonProgress!: EntityTable<LessonProgressRow, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;
  contentEdits!: EntityTable<ContentEditRow, 'id'>;
  audioClips!: EntityTable<AudioClipRow, 'id'>;
  workouts!: EntityTable<WorkoutRow, 'id'>;
  pantry!: EntityTable<PantryRow, 'id'>;
  userRecipes!: EntityTable<UserRecipeRow, 'id'>;

  constructor(name = 'appli-perso') {
    super(name);
    this.version(1).stores({
      cards: 'id, track, due, [track+due]',
      reviewLogs: '++id, cardId, track, ts',
      activity: '++id, day, ts, space, track, type, ref',
      lessonProgress: 'id, track',
      settings: 'key',
      contentEdits: 'id, track',
      audioClips: '++id, itemId',
    });
    // Tranche 4 : sport et cuisine.
    this.version(2).stores({
      workouts: '++id, day, ts, sessionId',
      pantry: '++id, ing, expires',
      userRecipes: 'id',
    });
  }
}

export const db = new AppDB();

export const TABLES = [
  'cards',
  'reviewLogs',
  'activity',
  'lessonProgress',
  'settings',
  'contentEdits',
  'audioClips',
  'workouts',
  'pantry',
  'userRecipes',
] as const;
