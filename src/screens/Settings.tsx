import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileUp, Upload, Volume2 } from 'lucide-react';
import { db, TABLES } from '../core/db';
import { downloadBackup, importBackup } from '../core/backup';
import { setSetting, useSettings, type Settings as S } from '../core/settings';
import { hasVoice, speak } from '../core/speech';
import { PageTitle } from '../ui/kit';

export function Settings() {
  const s = useSettings();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [zhVoice, setZhVoice] = useState<boolean | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void hasVoice('zh-CN').then(setZhVoice);
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const onImport = async (f: File) => {
    setPendingImport(null);
    try {
      const { rows } = await importBackup(JSON.parse(await f.text()));
      setMsg(`Sauvegarde importée (${rows} éléments).`);
    } catch (e) {
      setMsg(`Import impossible : ${(e as Error).message}`);
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
      for (const t of TABLES) await db.table(t).clear();
    });
    setMsg('Données effacées.');
  };

  return (
    <div className="stack">
      <PageTitle title="Réglages" />

      <h2 className="section-title">Rythme</h2>
      <div className="card stack">
        <label className="field">
          Objectif quotidien : {s.dailyGoalMinutes} min
          <input type="range" min={5} max={60} step={5} value={s.dailyGoalMinutes} onChange={(e) => void setSetting('dailyGoalMinutes', Number(e.target.value))} />
        </label>
        <label className="field">
          Cartes par session de révision
          <select value={s.reviewBatch} onChange={(e) => void setSetting('reviewBatch', Number(e.target.value))}>
            {[20, 40, 60, 100].map((n) => (
              <option key={n} value={n}>
                {n} cartes (≈ {Math.round((n * 8) / 60)} min)
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="section-title">Affichage</h2>
      <div className="card stack">
        <label className="field">
          Thème
          <select id="theme" value={s.theme === 'light' ? 'light' : 'dark'} onChange={(e) => void setSetting('theme', e.target.value as S['theme'])}>
            <option value="dark">Noir (par défaut)</option>
            <option value="light">Ivoire</option>
          </select>
        </label>
      </div>

      <h2 className="section-title">Voix et micro</h2>
      <div className="card stack">
        <label className="field">
          Vitesse de la voix : {s.speechRate.toFixed(1)}
          <input type="range" min={0.5} max={1.2} step={0.1} value={s.speechRate} onChange={(e) => void setSetting('speechRate', Number(e.target.value))} />
        </label>
        <div className="row">
          <button className="btn" onClick={() => void speak('你好，我是你的中文老师。', 'zh-CN', s.speechRate)}>
            <Volume2 size={18} /> Tester la voix chinoise
          </button>
          <span className="small muted">{zhVoice === null ? '' : zhVoice ? 'Voix chinoise trouvée.' : 'Aucune voix chinoise installée.'}</span>
        </div>
        <label className="switch">
          <span>Exercices oraux (reconnaissance vocale)</span>
          <input type="checkbox" checked={s.speakExercises} onChange={(e) => void setSetting('speakExercises', e.target.checked)} />
        </label>
        {!window.isSecureContext && (
          <p className="small muted">Le micro demande une connexion sécurisée (HTTPS ou localhost) : il est désactivé ici.</p>
        )}
      </div>

      <h2 className="section-title">Contenu</h2>
      <Link to="/content" className="card lesson-row">
        <FileUp size={22} />
        <span>
          <b>Mon contenu</b>
          <br />
          <span className="muted small">Importer du vocabulaire lingala ou chinois (CSV, JSON)</span>
        </span>
      </Link>

      <h2 className="section-title">Mes données</h2>
      <div className="card stack">
        <p className="small muted" style={{ margin: 0 }}>
          Tout est stocké sur cet appareil uniquement.
          {persisted === false && ' Le navigateur peut effacer ces données s’il manque de place : exporte régulièrement une sauvegarde.'}
        </p>
        <div className="row">
          <button className="btn" onClick={() => void downloadBackup()}>
            <Download size={18} /> Exporter une sauvegarde
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload size={18} /> Importer
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPendingImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {pendingImport && (
          <div className="notice stack">
            <span>Importer « {pendingImport.name} » remplacera toutes tes données actuelles.</span>
            <div className="row">
              <button className="btn primary" onClick={() => void onImport(pendingImport)}>
                Remplacer mes données
              </button>
              <button className="btn" onClick={() => setPendingImport(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}
        {msg && (
          <p className="notice" role="status">
            {msg}
          </p>
        )}
        {confirmReset ? (
          <div className="notice stack">
            <span>Effacer progression, cartes, enregistrements et réglages ? Pense à exporter une sauvegarde avant.</span>
            <div className="row">
              <button className="btn danger" onClick={() => void reset()}>
                Oui, tout effacer
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            Tout effacer
          </button>
        )}
      </div>
    </div>
  );
}
