import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db';
import { logActivity } from '../../../core/activity';
import { XP } from '../../../core/gamification';
import { AudioButton, PageTitle } from '../../../ui/kit';
import { hsk1, hsk1Chars as allChars, TRACK } from './content';
import { HanziTrace } from './HanziTrace';
import { Pinyin } from './ui';


export function TracePage() {
  const { char } = useParams();
  const navigate = useNavigate();
  const traced = useLiveQuery(async () => {
    const rows = await db.activity.where('type').equals('trace').toArray();
    return new Set(rows.map((r) => r.data?.char as string));
  }, []);

  if (char) {
    const word = hsk1.words.find((w) => w.hanzi.includes(char));
    const idx = allChars.indexOf(char);
    const next = allChars[(idx + 1) % allChars.length];
    return (
      <div className="stack">
        <PageTitle title={`Tracer ${char}`} back="/learn/zh/trace" />
        {word && (
          <div className="row" style={{ justifyContent: 'center' }}>
            <span lang="zh-CN" style={{ fontSize: '1.4rem' }}>
              {word.hanzi}
            </span>
            <Pinyin syllables={word.syllables} />
            <span>{word.fr}</span>
            <AudioButton text={word.hanzi} />
          </div>
        )}
        <HanziTrace
          key={char}
          char={char}
          onComplete={(mistakes) =>
            void logActivity({ space: 'learn', track: TRACK, type: 'trace', ref: 'zh:trace', xp: XP.traceChar, minutes: 0.5, data: { char, mistakes } })
          }
        />
        <button className="btn primary block" onClick={() => navigate(`/learn/zh/trace/${encodeURIComponent(next)}`)}>
          Caractère suivant : <span lang="zh-CN">{next}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageTitle title="Tracer les caractères" sub="Choisis un caractère. Bordure verte : déjà tracé." back="/learn/zh" />
      <div className="char-grid" lang="zh-CN">
        {allChars.map((c) => (
          <Link key={c} to={`/learn/zh/trace/${encodeURIComponent(c)}`} className={traced?.has(c) ? 'traced' : ''}>
            {c}
          </Link>
        ))}
      </div>
    </div>
  );
}
