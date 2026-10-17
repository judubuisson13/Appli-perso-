import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Volume2 } from 'lucide-react';
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

  const onImport = async (f: File) => {
    if (!confirm('Importer cette sauvegarde remplacera toutes tes données actuelles. Continuer ?')) return;
    try {
      const { rows } = await importBackup(JSON.parse(await f.text()));
      setMsg(`Sauvegarde importée (${rows} éléments).`);
    } catch (e) {
      setMsg(`Import impossible : ${(e as Error).message}`);
    }
  };

  const reset = async () => {
    if (!confirm('Effacer toutes tes données (progression, cartes, réglages) ? Pense à exporter une sauvegarde avant.')) return;
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
          <select value={s.theme} onChange={(e) => void setSetting('theme', e.target.value as S['theme'])}>
            <option value="system">Suivre l’appareil</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
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
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {msg && (
          <p className="notice" role="status">
            {msg}
          </p>
        )}
        <button className="btn danger" onClick={() => void reset()}>
          Tout effacer
        </button>
      </div>
    </div>
  );
}
