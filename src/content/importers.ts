import { parseCsv } from '../core/text';

/** Résultat d'un import : les lignes valides, et une erreur lisible par ligne refusée. */
export interface ImportResult<T> {
  rows: T[];
  errors: string[];
}

export interface LnImportRow {
  ln: string;
  fr: string;
  notes?: string;
  category?: string;
}

export interface ZhImportRow {
  hanzi: string;
  pinyin: string;
  syllables: string[];
  fr: string;
}

function records(text: string): Record<string, unknown>[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[') || t.startsWith('{')) {
    const data = JSON.parse(t) as unknown;
    const list = Array.isArray(data) ? data : ((data as { items?: unknown[]; words?: unknown[] }).items ?? (data as { words?: unknown[] }).words);
    if (!Array.isArray(list)) throw new Error('JSON attendu : une liste d’objets, ou un objet avec « items » ou « words ».');
    return list as Record<string, unknown>[];
  }
  return parseCsv(t);
}

/** Lit la première colonne présente parmi plusieurs noms possibles (fr / français / francais…). */
function pick(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function parseLingala(text: string): ImportResult<LnImportRow> {
  const rows: LnImportRow[] = [];
  const errors: string[] = [];
  records(text).forEach((r, i) => {
    const ln = pick(r, 'ln', 'lingala');
    const fr = pick(r, 'fr', 'francais', 'traduction');
    if (!ln || !fr) {
      errors.push(`Ligne ${i + 1} : il manque le lingala ou le français.`);
      return;
    }
    rows.push({ ln, fr, notes: pick(r, 'notes', 'note') || undefined, category: pick(r, 'category', 'categorie') || undefined });
  });
  return { rows, errors };
}

const HAN = /^\p{Script=Han}+$/u;

export function parseChinese(text: string): ImportResult<ZhImportRow> {
  const rows: ZhImportRow[] = [];
  const errors: string[] = [];
  records(text).forEach((r, i) => {
    const hanzi = pick(r, 'hanzi', 'caracteres', 'chinois');
    const fr = pick(r, 'fr', 'francais', 'traduction');
    const given = Array.isArray(r.syllables) ? (r.syllables as string[]) : null;
    const rawPinyin = pick(r, 'pinyin');
    const syllables = given ?? rawPinyin.split(/\s+/).filter(Boolean);
    const n = i + 1;
    if (!HAN.test(hanzi)) return errors.push(`Ligne ${n} : « ${hanzi || '(vide)'} » n’est pas écrit en caractères chinois.`);
    if (!fr) return errors.push(`Ligne ${n} : traduction manquante.`);
    if (!syllables.length) return errors.push(`Ligne ${n} : pinyin manquant.`);
    if (syllables.length !== [...hanzi].length)
      return errors.push(`Ligne ${n} : ${[...hanzi].length} caractère(s) mais ${syllables.length} syllabe(s). Sépare les syllabes par des espaces (ex. « xiè xie »).`);
    rows.push({ hanzi, fr, syllables, pinyin: given ? rawPinyin || syllables.join('') : syllables.join('') });
  });
  return { rows, errors };
}
