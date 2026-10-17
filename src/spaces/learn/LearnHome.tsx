import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { dueCountByTrack } from '../../core/cards';
import { PageTitle } from '../../ui/kit';
import { TRACKS } from '../registry';

export function LearnHome() {
  const due = useLiveQuery(() => dueCountByTrack(), [], {} as Record<string, number>);
  return (
    <div className="stack">
      <PageTitle title="Apprendre" sub="Quatre parcours, une seule file de révision." />
      {TRACKS.map((t) => {
        const body = (
          <>
            <span className="track-glyph">{t.glyph}</span>
            <span style={{ flex: 1 }}>
              <b>{t.label}</b>
              <br />
              <span className="muted small">{t.pitch}</span>
            </span>
            {t.ready ? (
              due[t.id] ? <span className="chip">{due[t.id]} à revoir</span> : null
            ) : (
              <span className="chip">{t.comingIn}</span>
            )}
          </>
        );
        const style = { '--c': t.color } as React.CSSProperties;
        return t.ready ? (
          <Link key={t.id} to={t.path} className="card track-card" style={style}>
            {body}
          </Link>
        ) : (
          <div key={t.id} className="card track-card" style={{ ...style, opacity: 0.7 }} aria-disabled="true">
            {body}
          </div>
        );
      })}
    </div>
  );
}
