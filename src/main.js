import './styles/main.scss';
import '@xterm/xterm/css/xterm.css';
import { router } from './router.js';
import { initTheme } from './utils/theme.js';

initTheme();

window.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  
  setTimeout(() => {
    loading.classList.add('hidden');
    loading.addEventListener('transitionend', () => {
      loading.remove();
    });
    router();
  }, 300);
});
