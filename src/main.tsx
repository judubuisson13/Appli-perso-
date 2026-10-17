import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { applyTheme, getSettings } from './core/settings';
import { hydrateUserWords } from './spaces/learn/chinese/content';
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/manrope';
import './styles.css';

registerSW({ immediate: true });
void getSettings().then((s) => applyTheme(s.theme));
// Demande au navigateur de ne pas effacer IndexedDB en cas de manque de place.
void navigator.storage?.persist?.();

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Mes mots chinois importés doivent être connus avant le premier affichage.
hydrateUserWords().then(render, render);
