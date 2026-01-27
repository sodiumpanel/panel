const THEMES = ['dark', 'light', 'amoled', 'midnight', 'nord', 'catppuccin'];
const STORAGE_KEY = 'sodium-theme';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'dark';
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'dark';
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme) {
  if (!theme) theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
}

export function getAvailableThemes() {
  return [
    { id: 'dark', name: 'Dark', description: 'Default dark theme' },
    { id: 'light', name: 'Light', description: 'Clean light theme' },
    { id: 'amoled', name: 'AMOLED', description: 'Pure black for OLED screens' },
    { id: 'midnight', name: 'Midnight', description: 'Deep purple dark theme' },
    { id: 'nord', name: 'Nord', description: 'Arctic bluish theme' },
    { id: 'catppuccin', name: 'Catppuccin', description: 'Soothing pastel theme' }
  ];
}

export function initTheme() {
  applyTheme(getTheme());
}
