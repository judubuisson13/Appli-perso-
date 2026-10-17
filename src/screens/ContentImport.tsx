import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { db } from '../core/db';
import { slugify } from '../core/text';
import { parseChinese, parseLingala } from '../content/importers';
import { PageTitle } from '../ui/kit';
import { addEntry, loadEntries } from '../spaces/learn/lingala/content';
import { hydrateUserWords, TRACK as ZH, wordsById } from '../spaces/learn/chinese/content';

type Target = 'ln' | 'zh';

const EXAMPLES: Record<Target, string> = {
  ln: 'lingala;francais;notes;categorie\nNdeko;Frère, sœur;Aussi « ami proche »;famille\nMama;Maman;;famille',
  zh: 'hanzi;pinyin;francais\n朋友;péng you;ami·e\n电话;diàn huà;téléphone',
};

export function ContentImport() {
  const [target, setTarget] = useState<Target>('ln');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return target === 'ln' ? parseLingala(text) : parseChinese(text);
    } catch (e) {
      return { rows: [], errors: [`Fichier illisible : ${(e as Error).message}`] };
    }
  }, [text, target]);

  const doImport = async () => {
    if (!parsed?.rows.length) return;
    let added = 0;
    let skipped = 0;
    if (target === 'ln') {
      const existing = new Set((await loadEntries()).map((e) => e.ln.toLowerCase()));
      for (const r of parseLingala(text).rows) {
        if (existing.has(r.ln.toLowerCase())) {
          skipped++;
          continue;
        }
        existing.add(r.ln.toLowerCase());
        await addEntry(r);
        added++;
      }
    } else {
      const existing = new Set([...wordsById.values()].map((w) => w.hanzi));
      for (const r of parseChinese(text).rows) {
        if (existing.has(r.hanzi)) {
          skipped++;
          continue;
        }
        existing.add(r.hanzi);
        await db.contentEdits.put({ id: `${ZH}:user-${slugify(r.syllables.join('-'))}-${Date.now().toString(36)}${added}`, track: ZH, patch: { ...r }, updatedAt: Date.now() + added });
        added++;
      }
      await hydrateUserWords();
    }
    setMsg(`${added} entrée${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}${skipped ? `, ${skipped} déjà présente${skipped > 1 ? 's' : ''} (ignorée${skipped > 1 ? 's' : ''})` : ''}. ${target === 'ln' ? 'Elles apparaissent dans « Lingala › Mes ajouts », marquées « à vérifier ».' : 'Elles apparaissent dans « Chinois › Mes mots ».'}`);
    setText('');
  };

  return (
    <div className="stack">
      <PageTitle title="Mon contenu" sub="Ajoute du vocabulaire en collant un CSV ou un JSON, ou en choisissant un fichier." back="/settings" />
      <div className="filter-row" role="group" aria-label="Parcours">
        <button className="btn" aria-pressed={target === 'ln'} onClick={() => setTarget('ln')}>
          Lingala
        </button>
        <button className="btn" aria-pressed={target === 'zh'} onClick={() => setTarget('zh')}>
          Chinois
        </button>
      </div>
      <div className="card stack">
        <p className="small muted" style={{ margin: 0 }}>
          {target === 'ln'
            ? 'Colonnes : lingala, francais, notes (facultatif), categorie (facultatif). Séparateur « ; » ou « , ».'
            : 'Colonnes : hanzi, pinyin (syllabes séparées par des espaces, avec les accents), francais.'}
        </p>
        <pre className="console">{EXAMPLES[target]}</pre>
        <label className="field" htmlFor="import-text">
          Contenu à importer
          <textarea id="import-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Colle ici ton CSV ou ton JSON" spellCheck={false} />
        </label>
        <div className="row">
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload size={18} /> Choisir un fichier
          </button>
          <button className="btn ghost" onClick={() => setText(EXAMPLES[target])}>
            Essayer avec l’exemple
          </button>
          <input
            ref={file}
            type="file"
            accept=".csv,.json,.txt,text/csv,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
              e.target.value = '';
            }}
          />
        </div>
        {parsed && (
          <div className="stack" style={{ gap: 6 }}>
            <b>
              {parsed.rows.length} entrée{parsed.rows.length > 1 ? 's' : ''} prête{parsed.rows.length > 1 ? 's' : ''}
              {parsed.errors.length ? `, ${parsed.errors.length} refusée${parsed.errors.length > 1 ? 's' : ''}` : ''}
            </b>
            {parsed.errors.slice(0, 8).map((e) => (
              <span key={e} className="small" style={{ color: 'var(--bad)' }}>
                {e}
              </span>
            ))}
          </div>
        )}
        <button className="btn primary" disabled={!parsed?.rows.length} onClick={() => void doImport()}>
          Importer
        </button>
        {msg && (
          <p className="notice" role="status">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
