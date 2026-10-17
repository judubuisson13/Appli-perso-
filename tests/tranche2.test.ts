import { beforeEach, describe, expect, it } from 'vitest';
import { checkAnswer, editDistance, normalizeAnswer, parseCsv } from '../src/core/text';
import { parseChinese, parseLingala } from '../src/content/importers';
import { db } from '../src/core/db';
import { addEntry, deck, lessonEntries, loadDialogues, loadEntries, mergeEntries, resetEntry, saveDialogue, saveEntry } from '../src/spaces/learn/lingala/content';
import { buildLnLesson } from '../src/spaces/learn/lingala/lesson';
import { insertTab, newlineWithIndent, smartBackspace } from '../src/spaces/learn/code/editor';
import { chapters, missions } from '../src/spaces/learn/code/content';
import { seeded } from '../src/core/random';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('réponses tapées', () => {
  it('ignore casse, accents et ponctuation', () => {
    expect(normalizeAnswer('  Sango   nini ? ')).toBe('sango nini');
    expect(normalizeAnswer('Ça va…')).toBe('ca va');
    expect(checkAnswer('mbote na yo', 'Mbote na yo.')).toBe('exact');
  });
  it('tolère une faute de frappe sur une réponse assez longue', () => {
    expect(editDistance('matondo', 'matonod')).toBe(2);
    expect(checkAnswer('matndo', 'Matondo')).toBe('close');
    expect(checkAnswer('ee', 'te')).toBe('wrong');
    expect(checkAnswer('', 'Te')).toBe('wrong');
  });
});

describe('CSV', () => {
  it('détecte le point-virgule (Excel français) et gère les guillemets', () => {
    const rows = parseCsv('lingala;français\n"Mbote; ya solo";"Bonjour, ""vraiment"""\r\nTe;Non\n\n');
    expect(rows).toEqual([
      { lingala: 'Mbote; ya solo', francais: 'Bonjour, "vraiment"' },
      { lingala: 'Te', francais: 'Non' },
    ]);
  });
  it('accepte la virgule et un BOM', () => {
    expect(parseCsv('\uFEFFhanzi,pinyin,fr\n茶,chá,thé')).toEqual([{ hanzi: '茶', pinyin: 'chá', fr: 'thé' }]);
  });
});

describe('import de contenu', () => {
  it('lingala : CSV et JSON, avec erreurs lisibles', () => {
    const csv = parseLingala('lingala;francais;categorie\nNdeko;Frère, sœur;famille\n;sans lingala');
    expect(csv.rows).toEqual([{ ln: 'Ndeko', fr: 'Frère, sœur', category: 'famille', notes: undefined }]);
    expect(csv.errors).toHaveLength(1);
    const json = parseLingala(JSON.stringify({ items: [{ ln: 'Mama', fr: 'Maman' }] }));
    expect(json.rows[0]).toMatchObject({ ln: 'Mama', fr: 'Maman' });
  });
  it('chinois : découpe le pinyin en syllabes et vérifie le nombre de caractères', () => {
    const r = parseChinese('hanzi;pinyin;francais\n电话;diàn huà;téléphone\n朋友;péngyou;ami\nabc;a;b');
    expect(r.rows).toEqual([{ hanzi: '电话', pinyin: 'diànhuà', syllables: ['diàn', 'huà'], fr: 'téléphone' }]);
    expect(r.errors[0]).toMatch(/2 caractère\(s\) mais 1 syllabe/);
    expect(r.errors[1]).toMatch(/caractères chinois/);
  });
  it('un JSON invalide donne une erreur claire', () => {
    expect(() => parseLingala('{"foo": 1}')).toThrow(/JSON attendu/);
  });
});

describe('lingala : contenu vérifiable', () => {
  it('tout le contenu livré est « à vérifier » et chaque leçon référence des entrées existantes', () => {
    expect(deck.items.every((i) => i.status === 'to-verify')).toBe(true);
    expect(deck.dialogues.every((d) => d.status === 'to-verify')).toBe(true);
    const ids = new Set(deck.items.map((i) => i.id));
    for (const l of deck.lessons) for (const id of l.items) expect(ids.has(id)).toBe(true);
  });
  it('une correction s’applique par-dessus l’origine, puis s’annule', async () => {
    await saveEntry('ln-mbote', { fr: 'Salut' }, 'verified');
    let e = (await loadEntries()).find((x) => x.id === 'ln-mbote')!;
    expect(e).toMatchObject({ ln: 'Mbote', fr: 'Salut', status: 'verified', edited: true });
    await resetEntry('ln-mbote');
    e = (await loadEntries()).find((x) => x.id === 'ln-mbote')!;
    expect(e).toMatchObject({ fr: 'Bonjour, salut', status: 'to-verify', edited: false });
  });
  it('valider sans rien changer ne marque pas l’entrée comme corrigée', async () => {
    await saveEntry('ln-te', { ln: 'Te', fr: 'Non' }, 'verified');
    const e = (await loadEntries()).find((x) => x.id === 'ln-te')!;
    expect(e).toMatchObject({ status: 'verified', edited: false });
  });
  it('mes ajouts forment la leçon « Mes ajouts » et comptent leurs enregistrements', async () => {
    const id = await addEntry({ ln: 'Ndeko', fr: 'Frère, sœur' });
    await db.audioClips.add({ itemId: `ln:${id}`, blob: new Blob(['x']), mime: 'audio/webm', createdAt: 1 });
    const all = await loadEntries();
    const mine = lessonEntries('ln-user', all);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ ln: 'Ndeko', userCreated: true, status: 'to-verify', audioCount: 1 });
  });
  it('un dialogue corrigé garde ses répliques et son statut, sans polluer le lexique', async () => {
    const [d] = await loadDialogues();
    await saveDialogue(d.id, d.lines.map((l, i) => (i === 0 ? { ...l, ln: 'Mbote!!' } : l)), 'verified');
    const [after] = await loadDialogues();
    expect(after).toMatchObject({ status: 'verified', edited: true });
    expect(after.lines[0].ln).toBe('Mbote!!');
    expect((await loadEntries()).length).toBe(deck.items.length);
  });
  it('mergeEntries est pur et ignore les ajouts incomplets', () => {
    const out = mergeEntries(deck.items.slice(0, 1), [{ id: 'ln:ln-user-x', track: 'ln', patch: { ln: 'seul' }, updatedAt: 0 }]);
    expect(out).toHaveLength(1);
  });
});

describe('lingala : leçon', () => {
  const entries = deck.items.map((i) => ({ ...i, audioCount: i.id === 'ln-mbote' ? 1 : 0 }));
  const lesson = buildLnLesson(entries.slice(0, 8), entries, seeded(4));
  it('découverte avant les questions, une traduction à écrire par groupe', () => {
    for (const id of entries.slice(0, 8).map((e) => e.id)) expect(lesson.find((x) => x.itemId === id)!.type).toBe('discover');
    expect(lesson.filter((x) => x.type === 'write')).toHaveLength(2);
  });
  it('n’interroge à l’écoute que les entrées enregistrées', () => {
    expect(lesson.filter((x) => x.type === 'listen').map((x) => x.itemId)).toEqual(['ln-mbote']);
  });
  it('4 propositions distinctes dont la bonne', () => {
    for (const ex of lesson.filter((x) => x.options)) {
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options).toContain(ex.itemId);
    }
  });
});

describe('code : éditeur', () => {
  it('Tab insère 4 espaces', () => {
    expect(insertTab('ab', 1, 1)).toEqual({ value: 'a    b', cursor: 5 });
  });
  it('Entrée garde l’indentation et l’augmente après « : »', () => {
    const src = 'def f(x):';
    expect(newlineWithIndent(src, src.length, src.length)).toEqual({ value: 'def f(x):\n    ', cursor: 14 });
    const body = 'def f(x):\n    y = 1';
    expect(newlineWithIndent(body, body.length, body.length).value).toBe('def f(x):\n    y = 1\n    ');
  });
  it('Retour arrière dans l’indentation recule d’un palier', () => {
    const src = 'if x:\n        ';
    expect(smartBackspace(src, src.length, src.length)).toEqual({ value: 'if x:\n    ', cursor: 10 });
    expect(smartBackspace('ab', 2, 2)).toBeNull();
  });
});

describe('code : contenu', () => {
  it('chapitre 1 : 7 missions avec tests, indices et notions', () => {
    expect(chapters[0].missions).toHaveLength(7);
    for (const m of missions) {
      expect(m.tests.length).toBeGreaterThan(0);
      expect(m.hints.length).toBeGreaterThan(1);
      expect(m.cards.length).toBeGreaterThan(0);
    }
  });
});
