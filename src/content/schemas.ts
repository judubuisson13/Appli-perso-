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

/* ---------- Lingala ---------- */

export const verifyStatus = z.enum(['to-verify', 'verified']);
export type VerifyStatus = z.infer<typeof verifyStatus>;

export const lnItem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  ln: z.string().min(1),
  fr: z.string().min(1),
  notes: z.string().optional(),
  category: z.string().default('divers'),
  status: verifyStatus.default('to-verify'),
});

export const lnDialogue = z.object({
  id: z.string(),
  title: z.string(),
  status: verifyStatus.default('to-verify'),
  lines: z.array(z.object({ speaker: z.string(), ln: z.string(), fr: z.string() })).min(2),
});

export const lnDeck = z
  .object({
    id: z.string(),
    version: z.number().int(),
    title: z.string(),
    items: z.array(lnItem),
    lessons: z.array(z.object({ id: z.string(), title: z.string(), items: z.array(z.string()).min(1) })),
    dialogues: z.array(lnDialogue).default([]),
  })
  .superRefine((d, ctx) => {
    const ids = new Set<string>();
    for (const w of d.items) {
      if (ids.has(w.id)) ctx.addIssue({ code: 'custom', message: `id en double : ${w.id}` });
      ids.add(w.id);
    }
    for (const l of d.lessons)
      for (const id of l.items)
        if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: `${l.id} référence une entrée inconnue : ${id}` });
  });

export type LnItem = z.infer<typeof lnItem>;
export type LnDialogue = z.infer<typeof lnDialogue>;

/* ---------- Code ---------- */

export const codeMission = z.object({
  id: z.string(),
  title: z.string(),
  skill: z.string(),
  story: z.string(),
  task: z.string(),
  starter: z.string(),
  tests: z.array(z.object({ name: z.string(), code: z.string() })).min(1),
  hints: z.array(z.string()).min(1),
  solution: z.string(),
  cards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string() })).default([]),
});

export const codeChapter = z.object({
  id: z.string(),
  version: z.number().int(),
  title: z.string(),
  language: z.literal('python'),
  intro: z.string(),
  outro: z.string(),
  missions: z.array(codeMission).min(1),
});

export type CodeMission = z.infer<typeof codeMission>;
export type CodeChapter = z.infer<typeof codeChapter>;

/* ---------- Informatique (DSI) ---------- */

export const itModule = z.object({
  id: z.string(),
  version: z.number().int(),
  title: z.string(),
  sheet: z.array(z.object({ title: z.string(), body: z.array(z.string()).min(1) })).min(1),
  quiz: z
    .array(z.object({ id: z.string(), q: z.string(), options: z.array(z.string()).min(2), answer: z.number().int(), explain: z.string() }))
    .min(1)
    .refine((qs) => qs.every((q) => q.answer >= 0 && q.answer < q.options.length), { message: 'réponse hors des options' }),
  cards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string() })),
  phishing: z.array(
    z.object({
      id: z.string(),
      verdict: z.enum(['phishing', 'legit']),
      fromName: z.string(),
      fromEmail: z.string(),
      subject: z.string(),
      body: z.array(z.string()),
      link: z.object({ text: z.string(), href: z.string() }).nullable(),
      clues: z.array(z.string()).min(1),
    }),
  ),
});

export type ItModule = z.infer<typeof itModule>;
export type PhishingMail = ItModule['phishing'][number];

/* ---------- Sport ---------- */

export const exerciseStep = z.object({
  id: z.string(),
  name: z.string(),
  metric: z.enum(['reps', 'seconds']),
  sets: z.number().int().min(1),
  target: z.number().int().min(1),
  cues: z.array(z.string()).min(1),
  mistakes: z.array(z.string()),
});

export const sportContent = z
  .object({
    id: z.string(),
    version: z.number().int(),
    chains: z.array(z.object({ id: z.string(), name: z.string(), muscles: z.string(), steps: z.array(exerciseStep).min(2) })),
    program: z.object({
      id: z.string(),
      title: z.string(),
      sessionsPerWeek: z.number().int(),
      validationsToProgress: z.number().int().min(1),
      sessions: z.array(z.object({ id: z.string(), title: z.string(), blocks: z.array(z.object({ chain: z.string(), rest: z.number().int() })).min(1) })),
    }),
  })
  .superRefine((d, ctx) => {
    const chains = new Set(d.chains.map((c) => c.id));
    for (const s of d.program.sessions)
      for (const b of s.blocks) if (!chains.has(b.chain)) ctx.addIssue({ code: 'custom', message: `${s.id} : chaîne inconnue ${b.chain}` });
  });

export type ExerciseStep = z.infer<typeof exerciseStep>;
export type SportContent = z.infer<typeof sportContent>;

/* ---------- Cuisine ---------- */

export const ingredient = z.object({ id: z.string(), name: z.string(), aisle: z.string(), unit: z.string(), staple: z.boolean().optional() });

export const recipe = z.object({
  id: z.string(),
  title: z.string(),
  servings: z.number().positive(),
  minutes: z.number().int().positive(),
  kidFriendly: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.object({ ing: z.string(), qty: z.number().positive(), unit: z.string().optional(), name: z.string().optional() })).min(1),
  steps: z.array(z.string()).min(1),
});

export const kitchenContent = z
  .object({
    id: z.string(),
    version: z.number().int(),
    catalog: z.array(ingredient),
    recipes: z.array(recipe),
    tips: z.object({ basics: z.array(z.string()), antiWaste: z.array(z.string()), season: z.record(z.string(), z.array(z.string())) }),
  })
  .superRefine((d, ctx) => {
    const ids = new Set(d.catalog.map((c) => c.id));
    for (const r of d.recipes)
      for (const i of r.ingredients) if (!ids.has(i.ing)) ctx.addIssue({ code: 'custom', message: `${r.id} : ingrédient inconnu ${i.ing}` });
  });

export type Ingredient = z.infer<typeof ingredient>;
export type Recipe = z.infer<typeof recipe>;
