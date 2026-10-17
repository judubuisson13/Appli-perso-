import type { ComponentType } from 'react';
import type { CardRow, SpaceId } from './db';

/** Un élément de l'écran Aujourd'hui. `ref` relie l'élément aux activités qui le marquent comme fait. */
export interface TodayItem {
  id: string;
  space: SpaceId;
  track?: string;
  title: string;
  detail?: string;
  minutes: number;
  to: string;
  ref: string;
  /** Fait automatiquement (ex. leçon terminée aujourd'hui). */
  done?: boolean;
  /** Coché à la main (seul ce cas peut être décoché). */
  checked?: boolean;
}

export interface TodayContext {
  now: number;
  today: string;
  dueByTrack: Record<string, number>;
}

export interface CardView {
  front: ComponentType<{ card: CardRow }>;
  back: ComponentType<{ card: CardRow }>;
}

/** Contrat d'un parcours d'apprentissage. */
export interface TrackModule {
  id: string;
  label: string;
  short: string;
  glyph: string;
  color: string;
  path: string;
  ready: boolean;
  /** Tranche où le parcours arrive, s'il n'est pas prêt. */
  comingIn?: string;
  pitch: string;
  getTodayItems?(ctx: TodayContext): Promise<TodayItem[]>;
  /** Rendu des cartes de révision, par `kind`. */
  cards?: Record<string, CardView>;
}

/** Contrat d'un espace (Apprendre, Sport, Cuisine, Cerveau). */
export interface SpaceModule {
  id: SpaceId;
  label: string;
  path: string;
  ready: boolean;
  getTodayItems?(ctx: TodayContext): Promise<TodayItem[]>;
}
