const TOKEN_KEY = 'auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  import('./state.js').then(m => m.state.clear());
}

export function isLoggedIn() {
  return !!getToken();
}

export async function api(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(endpoint, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    clearAuth();
    window.location.href = '/auth';
    throw new Error('Session expired');
  }
  
  if (response.status === 503) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.maintenance) {
      showMaintenancePage(data.message);
      throw new Error('Maintenance mode');
    }
  }
  
  return response;
}

export function showMaintenancePage(message) {
  const msg = message || 'The panel is currently under maintenance. Please try again later.';
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg-primary, #0a0a0f);color:var(--text-primary, #e4e4e7);font-family:inherit;text-align:center;padding:2rem;">
      <div>
        <span class="round-icon" style="font-size:4rem;color:var(--accent, #6366f1);margin-bottom:1rem;display:block;">construction</span>
        <h1 style="font-size:1.75rem;margin:0 0 0.75rem;">Under Maintenance</h1>
        <p style="color:var(--text-secondary, #a1a1aa);max-width:28rem;margin:0 auto;line-height:1.6;">${msg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    </div>
  `;
}

export async function apiJson(endpoint, options = {}) {
  const response = await api(endpoint, options);
  return response.json();
}
