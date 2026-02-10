import './styles/main.scss';
import '@xterm/xterm/css/xterm.css';
import { router } from './router.js';
import { initTheme } from './utils/theme.js';

initTheme();

async function checkSetup() {
  try {
    const res = await fetch('/api/setup/status');
    const data = await res.json();
    return data.installed;
  } catch {
    return true;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  
  const installed = await checkSetup();
  
  if (!installed && window.location.pathname !== '/setup') {
    window.location.href = '/setup';
    return;
  }
  
  setTimeout(() => {
    loading.classList.add('hidden');
    loading.addEventListener('transitionend', () => {
      loading.remove();
    });
    router();
  }, 300);
});
