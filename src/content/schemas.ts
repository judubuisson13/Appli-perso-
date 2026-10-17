import { z } from 'zod';

const hanzi = z.string().regex(/^\p{Script=Han}+$/u, 'uniquement des caractères chinois');

export const zhWord = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    hanzi,
    pinyin: z.string().min(1),
    syllables: z.array(z.string().min(1)).min(1),
    fr: z.string().min(1),
    example: z.object({ hanzi: z.string(), pinyin: z.string(), fr: z.string() }).optional(),
  })
  .refine((w) => w.syllables.join('') === w.pinyin.replace(/'/g, ''), {
    message: 'les syllabes doivent reconstituer le pinyin',
  });

export const zhLesson = z.object({
  id: z.string(),
  title: z.string(),
  words: z.array(z.string()).min(1),
});

export const zhDeck = z
  .object({
    id: z.string(),
    version: z.number().int(),
    level: z.string(),
    lessons: z.array(zhLesson),
    words: z.array(zhWord),
  })
  .superRefine((d, ctx) => {
    const ids = new Set<string>();
    for (const w of d.words) {
      if (ids.has(w.id)) ctx.addIssue({ code: 'custom', message: `id en double : ${w.id}` });
      ids.add(w.id);
    }
    for (const l of d.lessons)
      for (const id of l.words)
        if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: `${l.id} référence un mot inconnu : ${id}` });
  });

export const zhTones = z.object({
  id: z.literal('tones'),
  version: z.number().int(),
  syllables: z.array(z.object({ hanzi, pinyin: z.string() })).min(8),
});

export type ZhWord = z.infer<typeof zhWord>;
export type ZhLesson = z.infer<typeof zhLesson>;
export type ZhDeck = z.infer<typeof zhDeck>;
