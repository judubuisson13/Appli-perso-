import type { SpaceModule, TrackModule } from '../core/modules';
import { chineseModule } from './learn/chinese/module';

/** Parcours d'apprentissage. Ajouter un parcours = l'ajouter ici. */
export const TRACKS: TrackModule[] = [
  chineseModule,
  {
    id: 'ln',
    label: 'Lingala',
    short: 'Lingala',
    glyph: 'Ln',
    color: 'var(--sport)',
    path: '/learn/ln',
    ready: false,
    comingIn: 'tranche 2',
    pitch: 'Salutations, famille, nombres. Contenu vérifiable et audio enregistré par toi.',
  },
  {
    id: 'code',
    label: 'Code : la mission',
    short: 'Code',
    glyph: '</>',
    color: 'var(--learn)',
    path: '/learn/code',
    ready: false,
    comingIn: 'tranche 2',
    pitch: 'Sauve un système en panne, chapitre par chapitre, en Python dans le navigateur.',
  },
  {
    id: 'it',
    label: 'Informatique « DSI »',
    short: 'Info',
    glyph: '⛨',
    color: 'var(--brain)',
    path: '/learn/it',
    ready: false,
    comingIn: 'tranche 3',
    pitch: 'Cybersécurité d’abord : repère le phishing, quiz, flashcards.',
  },
];

export const trackById = new Map(TRACKS.map((t) => [t.id, t]));

/** Espaces de l'appli. Chaque espace est branché sur le noyau via `getTodayItems`. */
export const SPACES: SpaceModule[] = [
  {
    id: 'learn',
    label: 'Apprendre',
    path: '/learn',
    ready: true,
    async getTodayItems(ctx) {
      const lists = await Promise.all(TRACKS.filter((t) => t.ready && t.getTodayItems).map((t) => t.getTodayItems!(ctx)));
      return lists.flat();
    },
  },
  { id: 'sport', label: 'Sport', path: '/sport', ready: false },
  { id: 'kitchen', label: 'Cuisine', path: '/kitchen', ready: false },
  { id: 'brain', label: 'Cerveau', path: '/brain', ready: false },
];
