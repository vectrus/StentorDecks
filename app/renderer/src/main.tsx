import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import { bootAudio, settingsStore, uiStore } from './stores/root';
import './styles/tokens.css';
import './styles/shell.css';
import './styles/audio.css';

async function boot(): Promise<void> {
  await settingsStore.hydrate();
  await uiStore.hydrate();
  await bootAudio();
  const root = document.getElementById('root');
  if (!root) throw new Error('#root missing');
  createRoot(root).render(
    <React.StrictMode>
      <AppShell />
    </React.StrictMode>,
  );
}

void boot();
