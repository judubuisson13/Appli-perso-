import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/core/db';
import { dueCards, dueCountByTrack, ensureCard, gradeCard, spreadSiblings } from '../src/core/cards';
import { logActivity, toggleManualCheck } from '../src/core/activity';
import { decodeValue, encodeValue, exportBackup, importBackup } from '../src/core/backup';
import { resolveToday, reviewItem } from '../src/core/today';
import { dayKey } from '../src/core/dates';
import type { TodayItem } from '../src/core/modules';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('cartes', () => {
  it('ensureCard est idempotent et une carte neuve est due', async () => {
    const a = await ensureCard('zh', 'hsk1-wo', 'recog');
    const b = await ensureCard('zh', 'hsk1-wo', 'recog');
    expect(a.id).toBe(b.id);
    expect(await db.cards.count()).toBe(1);
    expect(await dueCountByTrack()).toEqual({ zh: 1 });
  });
  it('noter une carte la reprogramme et journalise la révision', async () => {
    const c = await ensureCard('zh', 'hsk1-wo', 'recog');
    const next = await gradeCard(c, 4);
    expect(next.due).toBeGreaterThan(Date.now());
    expect(await dueCards()).toHaveLength(0);
    expect(await db.reviewLogs.count()).toBe(1);
  });
  it('sépare les deux cartes d’un même mot', () => {
    const ids = spreadSiblings(['a', 'a', 'b', 'b', 'c', 'c'].map((itemId) => ({ itemId }))).map((c) => c.itemId);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    expect(ids.sort()).toEqual(['a', 'a', 'b', 'b', 'c', 'c']);
  });
  it('filtre les cartes dues par parcours', async () => {
    await ensureCard('zh', 'a', 'recog');
    await ensureCard('ln', 'b', 'recog');
    expect((await dueCards(Date.now(), ['ln'])).map((c) => c.itemId)).toEqual(['b']);
  });
});

describe('Aujourd’hui', () => {
  const items: TodayItem[] = [
    { id: 'l', space: 'learn', title: 'Leçon', minutes: 8, to: '/', ref: 'lesson:1' },
    { id: 't', space: 'learn', title: 'Tons', minutes: 3, to: '/', ref: 'zh:tones' },
  ];
  it('marque fait ce qui a une activité du jour et calcule le temps restant', async () => {
    await logActivity({ space: 'learn', type: 'tones', ref: 'zh:tones', xp: 10, minutes: 3.2 });
    const r = resolveToday(items, await db.activity.where('day').equals(dayKey()).toArray());
    expect(r.items.map((i) => i.done)).toEqual([false, true]);
    expect(r).toMatchObject({ remaining: 8, total: 11, minutesDone: 3.2, xpToday: 10 });
  });
  it('une coche manuelle compte puis s’annule', async () => {
    await toggleManualCheck('off:sport', 'sport', 20, 5);
    let acts = await db.activity.toArray();
    expect(acts).toHaveLength(1);
    expect(resolveToday([], acts).minutesDone).toBe(20);
    await toggleManualCheck('off:sport', 'sport', 20, 5);
    acts = await db.activity.toArray();
    expect(acts).toHaveLength(0);
  });
  it('l’élément révisions estime 8 s par carte', () => {
    expect(reviewItem(0, false)).toBeNull();
    expect(reviewItem(30, false)).toMatchObject({ minutes: 4, done: false });
    expect(reviewItem(0, true)).toMatchObject({ done: true });
  });
});

describe('sauvegarde', () => {
  it('export puis import restaure exactement les données', async () => {
    const c = await ensureCard('zh', 'hsk1-ni', 'produce');
    await gradeCard(c, 3);
    await logActivity({ space: 'learn', type: 'lesson', ref: 'lesson:x', xp: 12, minutes: 6 });
    await db.settings.put({ key: 'dailyGoalMinutes', value: 20 });
    const backup = JSON.parse(JSON.stringify(await exportBackup()));

    await db.cards.clear();
    await db.activity.clear();
    await db.settings.put({ key: 'other', value: 1 });

    const { rows } = await importBackup(backup);
    expect(rows).toBe(4);
    expect(await db.cards.get(c.id)).toMatchObject({ itemId: 'hsk1-ni', srs: { reps: 1 } });
    expect(await db.settings.get('other')).toBeUndefined();
    expect(await db.activity.count()).toBe(1);
  });
  it('refuse un fichier étranger sans rien effacer', async () => {
    await ensureCard('zh', 'a', 'recog');
    await expect(importBackup({ hello: 1 })).rejects.toThrow();
    expect(await db.cards.count()).toBe(1);
  });
  it('encode et décode les fichiers audio', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'audio/webm' });
    const enc = (await encodeValue({ clip: blob })) as { clip: { __blob: string } };
    expect(typeof enc.clip.__blob).toBe('string');
    const dec = decodeValue(JSON.parse(JSON.stringify(enc))) as { clip: Blob };
    expect(dec.clip.type).toBe('audio/webm');
    expect([...new Uint8Array(await dec.clip.arrayBuffer())]).toEqual([1, 2, 3, 250]);
  });
});
