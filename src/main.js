import './styles/main.scss';
import '@xterm/xterm/css/xterm.css';
import { router } from './router.js';
import { initTheme, loadUserTheme } from './utils/theme.js';
import { isLoggedIn, showMaintenancePage } from './utils/api.js';
import { loadPluginData } from './utils/plugins.js';
import { loadBranding } from './utils/branding.js';

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
  
  const [installed] = await Promise.all([checkSetup(), loadBranding()]);
  
  if (!installed && window.location.pathname !== '/setup') {
    window.location.href = '/setup';
    return;
  }
  
  if (isLoggedIn()) {
    await Promise.all([loadUserTheme(), loadPluginData()]);
    
    try {
      const mRes = await fetch('/api/maintenance');
      if (mRes.status === 503) {
        const mData = await mRes.json().catch(() => ({}));
        if (mData.maintenance) {
          loading.classList.add('hidden');
          showMaintenancePage(mData.message);
          return;
        }
      }
    } catch {}
  }

  setTimeout(() => {
    loading.classList.add('hidden');
    loading.addEventListener('transitionend', () => {
      loading.remove();
    });
    router();
  }, 300);
});
