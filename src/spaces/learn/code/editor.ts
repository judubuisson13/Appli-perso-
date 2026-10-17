/** Petites aides d'édition pour le textarea de code (pures, testables). */
export interface Edit {
  value: string;
  cursor: number;
}

const INDENT = '    ';

export function insertTab(value: string, start: number, end: number): Edit {
  return { value: value.slice(0, start) + INDENT + value.slice(end), cursor: start + INDENT.length };
}

/** Retour à la ligne qui garde l'indentation, et l'augmente après « : ». */
export function newlineWithIndent(value: string, start: number, end: number): Edit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const line = value.slice(lineStart, start);
  let indent = line.match(/^[ \t]*/)![0];
  if (line.trimEnd().endsWith(':')) indent += INDENT;
  const insert = `\n${indent}`;
  return { value: value.slice(0, start) + insert + value.slice(end), cursor: start + insert.length };
}

/** Retour arrière dans une indentation : supprime jusqu'au palier de 4 espaces précédent. */
export function smartBackspace(value: string, start: number, end: number): Edit | null {
  if (start !== end) return null;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const before = value.slice(lineStart, start);
  if (!before.length || /[^ ]/.test(before)) return null;
  const remove = before.length % 4 || 4;
  return { value: value.slice(0, start - remove) + value.slice(start), cursor: start - remove };
}
