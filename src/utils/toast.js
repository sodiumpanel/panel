import { escapeHtml } from './security.js';
import { icons } from './icons.js';

let container = null;

function ensureContainer() {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info', duration = 3000) {
  const cont = ensureContainer();
  
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  
  const toastIcons = {
    success: icons.check_circle,
    error: icons.error,
    warning: icons.warning,
    info: icons.info
  };
  
  el.innerHTML = `
    <span class="icon">${toastIcons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close">
      <span class="icon">${icons.close}</span>
    </button>
  `;
  
  cont.appendChild(el);
  
  requestAnimationFrame(() => el.classList.add('show'));
  
  const close = () => {
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove());
  };
  
  el.querySelector('.toast-close').onclick = close;
  
  if (duration > 0) {
    setTimeout(close, duration);
  }
  
  return close;
}

export function success(message, duration) {
  return toast(message, 'success', duration);
}

export function error(message, duration) {
  return toast(message, 'error', duration);
}

export function warning(message, duration) {
  return toast(message, 'warning', duration);
}

export function info(message, duration) {
  return toast(message, 'info', duration);
}
