import raw from '../../../../content/lingala/greetings.json';
import { lnDeck, type LnItem, type VerifyStatus } from '../../../content/schemas';
import { db, type ContentEditRow } from '../../../core/db';

export const TRACK = 'ln';
export const deck = lnDeck.parse(raw);
const baseById = new Map(deck.items.map((i) => [i.id, i]));

export interface LnEntry extends LnItem {
  /** Corrigée ou ajoutée par moi. */
  edited: boolean;
  userCreated: boolean;
  audioCount: number;
}

export const editId = (itemId: string) => `${TRACK}:${itemId}`;

/** Fusionne le contenu d'origine, mes corrections et mes ajouts (pure, testable). */
export function mergeEntries(base: LnItem[], edits: ContentEditRow[], audioByItem: Map<string, number> = new Map()): LnEntry[] {
  const byItem = new Map(
    edits.filter((e) => e.track === TRACK && !e.id.startsWith(`${TRACK}:dlg:`)).map((e) => [e.id.slice(TRACK.length + 1), e]),
  );
  const out: LnEntry[] = base.map((b) => {
    const e = byItem.get(b.id);
    return {
      ...b,
      ...(e?.patch as Partial<LnItem>),
      id: b.id,
      status: e?.status ?? b.status,
      edited: !!e && Object.keys(e.patch).length > 0,
      userCreated: false,
      audioCount: audioByItem.get(b.id) ?? 0,
    };
  });
  const baseIds = new Set(base.map((b) => b.id));
  for (const [itemId, e] of byItem) {
    if (baseIds.has(itemId) || !e.patch.ln || !e.patch.fr) continue;
    out.push({
      id: itemId,
      ln: String(e.patch.ln),
      fr: String(e.patch.fr),
      notes: e.patch.notes ? String(e.patch.notes) : undefined,
      category: String(e.patch.category ?? 'mes ajouts'),
      status: e.status ?? 'to-verify',
      edited: true,
      userCreated: true,
      audioCount: audioByItem.get(itemId) ?? 0,
    });
  }
  return out;
}

export async function loadEntries(): Promise<LnEntry[]> {
  const [edits, clips] = await Promise.all([
    db.contentEdits.where('track').equals(TRACK).toArray(),
    db.audioClips.toArray(),
  ]);
  const audio = new Map<string, number>();
  for (const c of clips) {
    if (!c.itemId.startsWith(`${TRACK}:`)) continue;
    const id = c.itemId.slice(TRACK.length + 1);
    audio.set(id, (audio.get(id) ?? 0) + 1);
  }
  return mergeEntries(deck.items, edits, audio);
}

export async function saveEntry(itemId: string, patch: Partial<LnItem>, status?: VerifyStatus) {
  const prev = await db.contentEdits.get(editId(itemId));
  const base = baseById.get(itemId);
  // On ne garde dans le patch que ce qui diffère du contenu d'origine.
  const merged: Record<string, unknown> = { ...(prev?.patch ?? {}), ...patch };
  if (base) for (const k of Object.keys(merged)) if ((base as Record<string, unknown>)[k] === merged[k]) delete merged[k];
  await db.contentEdits.put({
    id: editId(itemId),
    track: TRACK,
    patch: merged,
    status: status ?? prev?.status ?? base?.status ?? 'to-verify',
    updatedAt: Date.now(),
  });
}

export async function addEntry(item: Pick<LnItem, 'ln' | 'fr'> & Partial<LnItem>): Promise<string> {
  const id = `ln-user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  await db.contentEdits.put({
    id: editId(id),
    track: TRACK,
    patch: { ln: item.ln, fr: item.fr, notes: item.notes, category: item.category ?? 'mes ajouts' },
    status: item.status ?? 'to-verify',
    updatedAt: Date.now(),
  });
  return id;
}

/** Remet une entrée d'origine telle que livrée (ou supprime un ajout). */
export async function resetEntry(itemId: string) {
  await db.contentEdits.delete(editId(itemId));
}

export function lessonEntries(lessonId: string, entries: LnEntry[]): LnEntry[] {
  if (lessonId === 'ln-user') return entries.filter((e) => e.userCreated);
  const ids = deck.lessons.find((l) => l.id === lessonId)?.items ?? [];
  const byId = new Map(entries.map((e) => [e.id, e]));
  return ids.map((id) => byId.get(id)).filter((e): e is LnEntry => !!e);
}

/* ---------- Dialogues ---------- */

export interface LnDialogueView {
  id: string;
  title: string;
  status: VerifyStatus;
  lines: { speaker: string; ln: string; fr: string }[];
  edited: boolean;
}

const dlgEditId = (id: string) => `${TRACK}:dlg:${id}`;
export const lineAudioId = (dialogueId: string, index: number) => `${TRACK}:${dialogueId}#${index}`;

export async function loadDialogues(): Promise<LnDialogueView[]> {
  const edits = await db.contentEdits.where('track').equals(TRACK).toArray();
  const byId = new Map(edits.map((e) => [e.id, e]));
  return deck.dialogues.map((d) => {
    const e = byId.get(dlgEditId(d.id));
    const lines = (e?.patch.lines as LnDialogueView['lines'] | undefined) ?? d.lines;
    return { id: d.id, title: d.title, status: e?.status ?? d.status, lines, edited: !!e?.patch.lines };
  });
}

export async function saveDialogue(id: string, lines: LnDialogueView['lines'] | null, status: VerifyStatus) {
  const prev = await db.contentEdits.get(dlgEditId(id));
  const patch: Record<string, unknown> = { ...(prev?.patch ?? {}) };
  if (lines) patch.lines = lines;
  await db.contentEdits.put({ id: dlgEditId(id), track: TRACK, patch, status, updatedAt: Date.now() });
}
