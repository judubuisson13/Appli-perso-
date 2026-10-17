import ch1 from '../../../../content/code/chapter1.json';
import { codeChapter } from '../../../content/schemas';

export const TRACK = 'code';
export const chapters = [codeChapter.parse(ch1)];
export const missions = chapters.flatMap((c) => c.missions.map((m) => ({ ...m, chapterId: c.id })));
export const missionById = new Map(missions.map((m) => [m.id, m]));
export const conceptById = new Map(missions.flatMap((m) => m.cards.map((c) => [c.id, { ...c, missionId: m.id }])));

export const missionRef = (id: string) => `mission:${id}`;
export const draftKey = (id: string) => `code.draft.${id}`;
