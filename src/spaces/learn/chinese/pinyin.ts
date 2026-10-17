export type Tone = 1 | 2 | 3 | 4 | 5;

const MARKS: Record<string, Tone> = {};
for (const [tone, chars] of [
  [1, 'āēīōūǖĀĒĪŌŪǕ'],
  [2, 'áéíóúǘÁÉÍÓÚǗ'],
  [3, 'ǎěǐǒǔǚǍĚǏǑǓǙ'],
  [4, 'àèìòùǜÀÈÌÒÙǛ'],
] as const) {
  for (const c of chars) MARKS[c] = tone;
}

/** Ton d'une syllabe pinyin d'après son diacritique (5 = ton neutre). */
export function toneOf(syllable: string): Tone {
  for (const c of syllable.normalize('NFC')) if (MARKS[c]) return MARKS[c];
  return 5;
}

export function tonesOf(syllables: string[]): Tone[] {
  return syllables.map(toneOf);
}

export const TONE_INFO: Record<Tone, { name: string; mark: string; hint: string }> = {
  1: { name: '1er ton', mark: 'ˉ', hint: 'haut et plat' },
  2: { name: '2e ton', mark: 'ˊ', hint: 'montant' },
  3: { name: '3e ton', mark: 'ˇ', hint: 'descend puis remonte' },
  4: { name: '4e ton', mark: 'ˋ', hint: 'tombe d’un coup' },
  5: { name: 'neutre', mark: '·', hint: 'court et léger' },
};

export function tonePatternLabel(tones: Tone[]): string {
  return tones.map((t) => (t === 5 ? '·' : String(t))).join('-');
}
