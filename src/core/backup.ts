import { db, TABLES } from './db';

const APP_TAG = 'appli-perso';

type EncodedBlob = { __blob: string; type: string };

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function encodeValue(v: unknown): Promise<unknown> {
  if (v instanceof Blob) {
    return { __blob: bytesToBase64(new Uint8Array(await v.arrayBuffer())), type: v.type } satisfies EncodedBlob;
  }
  if (Array.isArray(v)) return Promise.all(v.map(encodeValue));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = await encodeValue(x);
    return out;
  }
  return v;
}

export function decodeValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decodeValue);
  if (v && typeof v === 'object') {
    if ('__blob' in v && typeof (v as EncodedBlob).__blob === 'string') {
      const b = v as EncodedBlob;
      const bin = atob(b.__blob);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: b.type });
    }
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = decodeValue(x);
    return out;
  }
  return v;
}

export interface Backup {
  app: typeof APP_TAG;
  schema: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = (await encodeValue(await db.table(t).toArray())) as unknown[];
  return { app: APP_TAG, schema: db.verno, exportedAt: new Date().toISOString(), tables };
}

/** Remplace toutes les données par celles de la sauvegarde (tout ou rien). */
export async function importBackup(raw: unknown): Promise<{ rows: number }> {
  const b = raw as Partial<Backup>;
  if (!b || b.app !== APP_TAG || typeof b.tables !== 'object' || !b.tables) {
    throw new Error('Ce fichier n’est pas une sauvegarde de l’appli.');
  }
  if ((b.schema ?? 0) > db.verno) throw new Error('Sauvegarde faite avec une version plus récente de l’appli.');
  let rows = 0;
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      const list = (b.tables![t] ?? []) as unknown[];
      await db.table(t).clear();
      await db.table(t).bulkAdd(decodeValue(list) as object[]);
      rows += list.length;
    }
  });
  return { rows };
}

export async function downloadBackup() {
  const data = await exportBackup();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `appli-perso-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
