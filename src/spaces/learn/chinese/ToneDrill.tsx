import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db';
import { logActivity, minutesSince } from '../../../core/activity';
import { XP } from '../../../core/gamification';
import { hasVoice, speak } from '../../../core/speech';
import { useSettings } from '../../../core/settings';
import { AudioButton, ExerciseHeader, Feedback, PageTitle, useKeys } from '../../../ui/kit';
import { hsk1, toneSyllables, TRACK } from './content';
import { TONE_INFO, tonesOf, type Tone } from './pinyin';
import { mergeStats, patternOptions, weightedPick, type ToneStats } from './toneDrill';
import { Hanzi, Pinyin, ToneContour, TonePattern } from './ui';

const BACK = '/learn/zh';
const ROUNDS = 12;
const STATS_KEY = 'zh.toneStats';

type Mode = 'syllable' | 'word';
interface Question {
  hanzi: string;
  syllables: string[];
  tones: Tone[];
  fr?: string;
  options: Tone[][];
}

const multiWords = hsk1.words.filter((w) => w.syllables.length >= 2);

/** Famille d'une syllabe (mā/má/mǎ/mà) pour réécouter les 4 tons côte à côte. */
function family(pinyin: string) {
  const base = pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return toneSyllables.filter((s) => s.pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '') === base);
}

export function ToneDrill() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [voiceOk, setVoiceOk] = useState<boolean | null>(null);
  const statsRow = useLiveQuery(() => db.settings.get(STATS_KEY), []);
  const stats = (statsRow?.value ?? {}) as ToneStats;

  useEffect(() => {
    void hasVoice('zh-CN').then(setVoiceOk);
  }, []);

  if (mode) return <Drill mode={mode} stats={stats} onExit={() => setMode(null)} />;

  return (
    <div className="stack">
      <PageTitle title="Oreille des tons" sub="Écoute, reconnais le ton. Les tons où tu te trompes reviennent plus souvent." back={BACK} />
      {voiceOk === false && (
        <div className="notice">
          Aucune voix chinoise n’est installée sur cet appareil : l’audio risque d’être muet ou faux. Sur Android, installe « Chinois
          (Chine) » dans Paramètres › Synthèse vocale ; sur ordinateur, Chrome et Edge en fournissent une.
        </div>
      )}
      <button className="card lesson-row" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => setMode('syllable')}>
        <span className="lesson-num">1</span>
        <span>
          <b>Syllabes isolées</b>
          <br />
          <span className="muted small">mā, má, mǎ ou mà ? Choisis parmi les 4 tons.</span>
        </span>
      </button>
      <button className="card lesson-row" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => setMode('word')}>
        <span className="lesson-num">2</span>
        <span>
          <b>Mots de deux syllabes ou plus</b>
          <br />
          <span className="muted small">Retrouve le schéma tonal des mots HSK 1, ton neutre compris.</span>
        </span>
      </button>
      <h2 className="section-title">Tes tons</h2>
      <div className="card stack">
        {([1, 2, 3, 4] as Tone[]).map((t) => {
          const s = stats[t];
          const acc = s && s.seen ? 1 - s.wrong / s.seen : null;
          return (
            <div key={t} className="row" style={{ justifyContent: 'space-between' }}>
              <span className={`row t${t}`} style={{ gap: 6 }}>
                <ToneContour tone={t} /> {TONE_INFO[t].name}
              </span>
              <span className="muted small">{TONE_INFO[t].hint}</span>
              <b>{acc === null ? '—' : `${Math.round(acc * 100)} %`}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function makeQuestions(mode: Mode, stats: ToneStats): Question[] {
  if (mode === 'syllable') {
    return weightedPick(toneSyllables, stats, ROUNDS, Math.random).map((s) => ({
      hanzi: s.hanzi,
      syllables: [s.pinyin],
      tones: [s.tone],
      options: [[1], [2], [3], [4]],
    }));
  }
  const items = multiWords.map((w) => ({ w, tone: tonesOf(w.syllables).find((t) => t !== 5) ?? (1 as Tone) }));
  return weightedPick(items, stats, ROUNDS, Math.random).map(({ w }) => {
    const tones = tonesOf(w.syllables);
    return { hanzi: w.hanzi, syllables: w.syllables, tones, fr: w.fr, options: patternOptions(tones, Math.random) };
  });
}

function Drill({ mode, stats, onExit }: { mode: Mode; stats: ToneStats; onExit: () => void }) {
  const { speechRate } = useSettings();
  const [questions] = useState(() => makeQuestions(mode, stats));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<{ tone: Tone; correct: boolean }[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const start = useRef(Date.now());
  const q = questions[i];
  const key = (p: Tone[]) => p.join('-');
  const correctIdx = q ? q.options.findIndex((o) => key(o) === key(q.tones)) : -1;

  const pick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    const ok = idx === correctIdx;
    // En mode « mot », chaque syllabe tonale compte dans les statistiques.
    const scored = q.tones.filter((t) => t !== 5).map((tone) => ({ tone, correct: ok }));
    setResults((r) => [...r, ...scored]);
    setAnswers((a) => [...a, ok]);
  };

  const next = async () => {
    if (i + 1 < questions.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    const correctCount = answers.filter(Boolean).length;
    await db.settings.put({ key: STATS_KEY, value: mergeStats(stats, results) });
    await logActivity({
      space: 'learn',
      track: TRACK,
      type: 'tones',
      ref: 'zh:tones',
      xp: correctCount * XP.correctAnswer,
      minutes: minutesSince(start.current),
      data: { mode, score: correctCount / questions.length },
    });
    setDone(true);
  };

  useKeys(
    (k) => {
      if (picked === null && ['1', '2', '3', '4'].includes(k)) pick(Number(k) - 1);
      else if (picked !== null && (k === 'Enter' || k === ' ')) void next();
    },
    [picked, i],
  );

  if (done) {
    const score = answers.filter(Boolean).length;
    return (
      <div className="stack">
        <div className="card empty stack">
          <h1>{score} / {questions.length}</h1>
          <p className="muted">
            {score / questions.length >= 0.9 ? 'Excellente oreille !' : 'Les tons manqués reviendront plus souvent la prochaine fois.'}
          </p>
          <p className="chip ok" style={{ alignSelf: 'center' }}>
            +{score} XP
          </p>
        </div>
        <button className="btn primary block" onClick={onExit}>
          Terminer
        </button>
        <Link to={BACK} className="btn ghost block">
          Retour au chinois
        </Link>
      </div>
    );
  }

  return (
    <div className="exercise">
      <ExerciseHeader value={i / questions.length} back={BACK} label="Progression de l’entraînement" />
      <div className="prompt stack" style={{ alignItems: 'center' }}>
        <span className="muted small">{mode === 'syllable' ? 'Quel ton entends-tu ?' : 'Quel schéma tonal entends-tu ?'}</span>
        <AudioButton key={i} text={q.hanzi} autoPlay big />
        {picked !== null && (
          <>
            <Hanzi text={q.hanzi} size="md" />
            <Pinyin syllables={q.syllables} />
            {q.fr && <span>{q.fr}</span>}
          </>
        )}
      </div>
      <div className="choices">
        {q.options.map((o, idx) => {
          const state = picked === null ? '' : idx === correctIdx ? 'right' : idx === picked ? 'wrong' : '';
          return (
            <button key={idx} className={`choice ${state}`} onClick={() => pick(idx)} disabled={picked !== null}>
              <TonePattern tones={o} />
              <span className="small">
                {mode === 'syllable' ? `${TONE_INFO[o[0]].name} · ${TONE_INFO[o[0]].hint}` : o.map((t) => (t === 5 ? '·' : t)).join(' – ')}
              </span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <Feedback ok={picked === correctIdx}>{picked === correctIdx ? 'Exact !' : 'Raté, écoute la différence :'}</Feedback>
          {mode === 'syllable' && (
            <div className="row" style={{ justifyContent: 'center' }}>
              {family(q.syllables[0]).map((s) => (
                <button key={s.hanzi} className={`btn t${s.tone}`} onClick={() => speak(s.hanzi, 'zh-CN', speechRate)}>
                  {s.pinyin}
                </button>
              ))}
            </div>
          )}
          <div className="sticky-actions">
            <button className="btn primary" onClick={() => void next()} autoFocus>
              Continuer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
