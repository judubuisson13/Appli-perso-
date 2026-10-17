/** Forme simplifiée pour comparer une réponse tapée : minuscules, sans accents ni ponctuation. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[…]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distance d'édition (Levenshtein), pour tolérer une faute de frappe. */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type AnswerVerdict = 'exact' | 'close' | 'wrong';

/** « close » = une faute de frappe sur un mot assez long : acceptée mais signalée. */
export function checkAnswer(given: string, expected: string): AnswerVerdict {
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (!g) return 'wrong';
  if (g === e) return 'exact';
  return e.length >= 5 && editDistance(g, e) <= 1 ? 'close' : 'wrong';
}

/** Analyse un CSV (séparateur « , » ou « ; » détecté sur l'en-tête, guillemets gérés). */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((x) => x.trim()));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map((h) => normalizeAnswer(h).replace(/ /g, '_'));
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export function slugify(s: string): string {
  return normalizeAnswer(s).replace(/ /g, '-').slice(0, 40) || 'entree';
}
