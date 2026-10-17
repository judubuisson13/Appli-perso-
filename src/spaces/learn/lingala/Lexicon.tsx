import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { Recorder } from '../../../ui/Recorder';
import { PageTitle } from '../../../ui/kit';
import type { VerifyStatus } from '../../../content/schemas';
import { addEntry, lineAudioId, loadDialogues, loadEntries, resetEntry, saveDialogue, saveEntry, TRACK, type LnDialogueView } from './content';
import { StatusBadge } from './ui';

type Filter = 'all' | 'to-verify' | 'verified' | 'no-audio';

export function Lexicon() {
  const entries = useLiveQuery(loadEntries, []);
  const [filter, setFilter] = useState<Filter>('to-verify');
  const [query, setQuery] = useState('');
  if (!entries) return null;
  const toVerify = entries.filter((e) => e.status === 'to-verify').length;
  const list = entries
    .filter((e) => (filter === 'all' ? true : filter === 'no-audio' ? e.audioCount === 0 : e.status === filter))
    .filter((e) => !query || `${e.ln} ${e.fr}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="stack">
      <PageTitle
        title="Lexique lingala"
        sub={`${entries.length} entrées · ${toVerify} à vérifier. Corrige, valide et enregistre la prononciation.`}
        back="/learn/ln"
      />
      <div className="filter-row" role="group" aria-label="Filtrer">
        {(
          [
            ['to-verify', 'À vérifier'],
            ['verified', 'Vérifiées'],
            ['no-audio', 'Sans audio'],
            ['all', 'Toutes'],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button key={f} className="btn" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>
      <input id="lex-search" placeholder="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher dans le lexique" />
      <Link to="/learn/ln/item/new" className="btn">
        <Plus size={18} /> Ajouter une expression
      </Link>
      <div className="stack">
        {list.length === 0 && <p className="muted empty">Rien dans ce filtre.</p>}
        {list.map((e) => (
          <Link key={e.id} to={`/learn/ln/item/${e.id}`} className="card lesson-row">
            <span style={{ flex: 1, minWidth: 0 }}>
              <b lang="ln">{e.ln}</b>
              <br />
              <span className="muted small">{e.fr}</span>
            </span>
            <span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
              <StatusBadge status={e.status} />
              <span className="small muted">
                {e.audioCount ? `${e.audioCount} audio` : 'sans audio'}
                {e.edited ? ' · corrigé' : ''}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ItemEditor() {
  const { itemId = 'new' } = useParams();
  const navigate = useNavigate();
  const entries = useLiveQuery(loadEntries, []);
  const entry = entries?.find((e) => e.id === itemId);
  const [form, setForm] = useState({ ln: '', fr: '', notes: '', category: '' });
  const [saved, setSaved] = useState(false);
  const isNew = itemId === 'new';

  useEffect(() => {
    if (entry) setForm({ ln: entry.ln, fr: entry.fr, notes: entry.notes ?? '', category: entry.category });
    // On ne réinitialise le formulaire qu'au changement d'entrée, pas à chaque enregistrement audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  if (!entries) return null;
  if (!isNew && !entry) return <p>Entrée introuvable.</p>;

  const save = async (status?: VerifyStatus) => {
    if (!form.ln.trim() || !form.fr.trim()) return;
    const patch = { ln: form.ln.trim(), fr: form.fr.trim(), notes: form.notes.trim() || undefined, category: form.category.trim() || 'mes ajouts' };
    if (isNew) {
      const id = await addEntry({ ...patch, status: status ?? 'to-verify' });
      navigate(`/learn/ln/item/${id}`, { replace: true });
    } else await saveEntry(itemId, patch, status);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const field = (key: keyof typeof form, label: string, multiline = false) => (
    <label className="field" htmlFor={`f-${key}`}>
      {label}
      {multiline ? (
        <textarea id={`f-${key}`} rows={2} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ) : (
        <input id={`f-${key}`} value={form[key]} lang={key === 'ln' ? 'ln' : 'fr'} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      )}
    </label>
  );

  return (
    <div className="stack">
      <PageTitle title={isNew ? 'Nouvelle expression' : 'Corriger l’expression'} back="/learn/ln/lexicon" />
      {entry && (
        <div className="row">
          <StatusBadge status={entry.status} />
          {entry.edited && !entry.userCreated && <span className="chip">corrigée par toi</span>}
        </div>
      )}
      <div className="card stack">
        {field('ln', 'Lingala')}
        {field('fr', 'Français')}
        {field('notes', 'Notes (sens littéral, usage…)', true)}
        {field('category', 'Catégorie')}
        <div className="row">
          <button className="btn" onClick={() => void save()} disabled={!form.ln.trim() || !form.fr.trim()}>
            Enregistrer
          </button>
          {entry?.status === 'verified' ? (
            <button className="btn" onClick={() => void save('to-verify')}>
              Repasser « à vérifier »
            </button>
          ) : (
            <button className="btn primary" onClick={() => void save('verified')} disabled={!form.ln.trim() || !form.fr.trim()}>
              Enregistrer et marquer vérifié
            </button>
          )}
          {saved && <span className="chip ok">Enregistré</span>}
        </div>
      </div>
      {!isNew && (
        <>
          <h2 className="section-title">Prononciation</h2>
          <div className="card stack">
            <p className="small muted" style={{ margin: 0 }}>
              Enregistre-toi ou fais enregistrer un locuteur natif. Le dernier enregistrement sert dans les exercices d’écoute.
            </p>
            <Recorder itemId={`${TRACK}:${itemId}`} />
          </div>
          {entry?.edited && (
            <button
              className="btn danger"
              onClick={async () => {
                await resetEntry(itemId);
                if (entry.userCreated) navigate('/learn/ln/lexicon');
              }}
            >
              {entry.userCreated ? 'Supprimer cette expression' : 'Annuler mes corrections'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function DialogueEditor() {
  const { dialogueId = '' } = useParams();
  const [d, setD] = useState<LnDialogueView | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void loadDialogues().then((all) => setD(all.find((x) => x.id === dialogueId) ?? null));
  }, [dialogueId]);
  if (!d) return null;

  const setLine = (i: number, key: 'ln' | 'fr', v: string) => setD({ ...d, lines: d.lines.map((l, k) => (k === i ? { ...l, [key]: v } : l)) });
  const save = async (status: VerifyStatus) => {
    await saveDialogue(d.id, d.lines, status);
    setD({ ...d, status });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="stack">
      <PageTitle title={`Corriger : ${d.title}`} back={`/learn/ln/dialogue/${d.id}`} />
      <StatusBadge status={d.status} />
      {d.lines.map((l, i) => (
        <div key={i} className="card stack">
          <b>Réplique {i + 1} · {l.speaker}</b>
          <input id={`dl-ln-${i}`} lang="ln" value={l.ln} onChange={(e) => setLine(i, 'ln', e.target.value)} aria-label={`Réplique ${i + 1} en lingala`} />
          <input id={`dl-fr-${i}`} value={l.fr} onChange={(e) => setLine(i, 'fr', e.target.value)} aria-label={`Réplique ${i + 1} en français`} />
          <Recorder itemId={lineAudioId(d.id, i)} />
        </div>
      ))}
      <div className="row">
        <button className="btn" onClick={() => void save(d.status)}>
          Enregistrer
        </button>
        <button className="btn primary" onClick={() => void save('verified')}>
          Enregistrer et marquer vérifié
        </button>
        {saved && <span className="chip ok">Enregistré</span>}
      </div>
    </div>
  );
}
