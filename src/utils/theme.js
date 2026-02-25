import { api, getToken } from './api.js';
import { state } from './state.js';

const THEMES = ['dark', 'light', 'amoled'];

let _currentTheme = 'dark';

export function getTheme() {
  return _currentTheme;
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'dark';
  _currentTheme = theme;
  applyTheme(theme);
}

export async function saveTheme(theme) {
  setTheme(theme);
  if (!getToken()) return;
  try {
    await api('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: { theme } })
    });
  } catch {}
}

export async function loadUserTheme() {
  if (!getToken()) return;
  try {
    await state.load();
    const theme = state.user?.settings?.theme;
    if (theme && THEMES.includes(theme)) {
      setTheme(theme);
    }
  } catch {}
}

export function applyTheme(theme) {
  if (!theme) theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
}

export function getAvailableThemes() {
  return [
    { id: 'dark', name: 'Dark' },
    { id: 'light', name: 'Light' },
    { id: 'amoled', name: 'AMOLED' }
  ];
}

export function initTheme() {
  applyTheme(_currentTheme);
}
