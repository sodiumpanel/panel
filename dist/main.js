(function (xterm, addonFit, addonWebLinks, codemirror, state$3, themeOneDark, langJavascript, langJson, langHtml, langCss, langPython, langJava, langPhp, langXml, langYaml, langMarkdown, view) {
'use strict';

var undefined$2 = undefined;

var undefined$1 = undefined;

const TOKEN_KEY = 'auth_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  Promise.resolve().then(function () { return state$2; }).then(m => m.state.clear());
}

function isLoggedIn() {
  return !!getToken();
}

async function api(endpoint, options = {}) {
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

function showMaintenancePage(message) {
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

async function apiJson(endpoint, options = {}) {
  const response = await api(endpoint, options);
  return response.json();
}

let brandingCache = null;

const DEFAULTS = {
  name: 'Sodium',
  logo: null,
  favicon: null,
  accentColor: '#d97339',
  accentHover: '#e88a4d',
  accentMuted: 'rgba(217, 115, 57, 0.1)',
  ogTitle: '',
  ogDescription: '',
  ogImage: null
};

async function loadBranding() {
  try {
    const cached = localStorage.getItem('branding');
    if (cached) {
      brandingCache = JSON.parse(cached);
      applyBranding(brandingCache);
    }

    const res = await fetch('/api/branding');
    if (res.ok) {
      brandingCache = await res.json();
      localStorage.setItem('branding', JSON.stringify(brandingCache));
      applyBranding(brandingCache);
    }
  } catch {
    if (!brandingCache) brandingCache = DEFAULTS;
  }
  return brandingCache;
}

function getBranding() {
  if (brandingCache) return brandingCache;

  try {
    const cached = localStorage.getItem('branding');
    if (cached) {
      brandingCache = JSON.parse(cached);
      return brandingCache;
    }
  } catch {}

  return DEFAULTS;
}

function applyBranding(branding) {
  const isDefault = branding.accentColor === '#d97339' && !branding.accentHover && !branding.accentMuted;

  if (!isDefault && branding.accentColor) {
    document.documentElement.style.setProperty('--accent', branding.accentColor);
    document.documentElement.style.setProperty('--accent-hover', branding.accentHover || branding.accentColor);
    document.documentElement.style.setProperty('--accent-muted', branding.accentMuted || branding.accentColor + '1a');
  } else {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-hover');
    document.documentElement.style.removeProperty('--accent-muted');
  }

  if (branding.favicon) {
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = branding.favicon;
  }
}

function clearBrandingCache() {
  brandingCache = null;
  localStorage.removeItem('branding');
}

const OAUTH_ICONS = {
  discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
  google: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  gitlab: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/></svg>',
  microsoft: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>',
  twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>',
  slack: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
  reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
  bitbucket: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/></svg>'
};

function renderAuth() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();
  
  app.innerHTML = `
    <div class="auth-container" id="auth-container">
      <div class="auth-card" id="auth-card">
        <div class="auth-header" id="auth-header">
          <div class="logo">
            <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="28" height="28">
            <span class="logo-text">${branding.name}</span>
          </div>
          <p class="auth-subtitle">Welcome back</p>
        </div>
        
        <div class="auth-tabs" id="auth-tabs">
          <button class="tab-btn active" data-tab="login">Sign In</button>
          <button class="tab-btn" data-tab="register">Sign Up</button>
        </div>
        
        <form id="login-form" class="auth-form active">
          <div class="form-group">
            <label for="login-username">Username</label>
            <div class="input-wrapper">
              <span class="round-icon">person</span>
              <input type="text" id="login-username" name="username" placeholder="Enter your username" required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="login-password">Password</label>
            <div class="input-wrapper">
              <span class="round-icon">lock</span>
              <input type="password" id="login-password" name="password" placeholder="Enter your password" required>
            </div>
          </div>
          
          <div class="error-message" id="login-error"></div>
          
          <button type="submit" class="btn btn-primary btn-full" id="login-submit-btn">
            <span>Sign In</span>
            <span class="round-icon">arrow_forward</span>
          </button>
          
          <div class="auth-links">
            <button type="button" class="link-btn" id="forgot-password-btn">Forgot password?</button>
          </div>
          
          <div class="oauth-section" id="oauth-section" style="display: none;">
            <div class="oauth-divider">
              <span>or continue with</span>
            </div>
            <div class="oauth-buttons" id="oauth-buttons"></div>
          </div>
        </form>
        
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label for="register-username">Username</label>
            <div class="input-wrapper">
              <span class="round-icon">person</span>
              <input type="text" id="register-username" name="username" placeholder="Choose a username" required minlength="3" maxlength="20">
            </div>
            <small class="form-hint">3-20 characters</small>
          </div>
          
          <div class="form-group" id="email-field-group" style="display: none;">
            <label for="register-email">Email</label>
            <div class="input-wrapper">
              <span class="round-icon">email</span>
              <input type="email" id="register-email" name="email" placeholder="Enter your email">
            </div>
            <small class="form-hint">Required for email verification</small>
          </div>
          
          <div class="form-group">
            <label for="register-password">Password</label>
            <div class="input-wrapper">
              <span class="round-icon">lock</span>
              <input type="password" id="register-password" name="password" placeholder="Create a password" required minlength="6">
            </div>
            <small class="form-hint">Minimum 6 characters</small>
          </div>
          
          <div class="form-group">
            <label for="register-confirm">Confirm Password</label>
            <div class="input-wrapper">
              <span class="round-icon">lock</span>
              <input type="password" id="register-confirm" name="confirm" placeholder="Confirm your password" required>
            </div>
          </div>
          
          <div id="captcha-container" style="display: none; margin-bottom: 16px;"></div>
          
          <div class="error-message" id="register-error"></div>
          
          <button type="submit" class="btn btn-primary btn-full" id="register-submit-btn">
            <span>Create Account</span>
            <span class="round-icon">arrow_forward</span>
          </button>
        </form>
      </div>
    </div>
  `;
  
  const tabs = app.querySelectorAll('.tab-btn');
  const loginForm = app.querySelector('#login-form');
  const registerForm = app.querySelector('#register-form');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.dataset.tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
      } else {
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
      }
    });
  });
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginForm.querySelector('#login-username').value;
    const password = loginForm.querySelector('#login-password').value;
    const errorEl = loginForm.querySelector('#login-error');
    const btn = loginForm.querySelector('button[type="submit"]');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Sign In</span><span class="round-icon">arrow_forward</span>';
        return;
      }
      
      if (data.requires2FA) {
        render2FAScreen(username, password);
        return;
      }
      
      setToken(data.token);
      
      window.router.navigateTo('/dashboard');
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span>Sign In</span><span class="round-icon">arrow_forward</span>';
    }
  });
  
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = registerForm.querySelector('#register-username').value;
    const email = registerForm.querySelector('#register-email').value;
    const password = registerForm.querySelector('#register-password').value;
    const confirm = registerForm.querySelector('#register-confirm').value;
    const errorEl = registerForm.querySelector('#register-error');
    const btn = registerForm.querySelector('button[type="submit"]');
    
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.style.display = 'block';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const captchaToken = window.turnstile ? window.turnstile.getResponse(turnstileWidgetId) : null;
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, captchaToken })
      });
      
      const data = await res.json();
      
      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Create Account</span><span class="round-icon">arrow_forward</span>';
        if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
        return;
      }
      
      setToken(data.token);
      
      window.router.navigateTo('/dashboard');
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span>Create Account</span><span class="round-icon">arrow_forward</span>';
      if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    }
  });
  
  loadOAuthProviders$1();
  checkEmailVerificationRequired();
  
  document.getElementById('forgot-password-btn').addEventListener('click', () => {
    renderForgotPassword();
  });
}

async function checkEmailVerificationRequired() {
  try {
    const res = await fetch('/api/auth/config');
    const data = await res.json();
    if (data.registration?.emailVerification) {
      const emailGroup = document.getElementById('email-field-group');
      const emailInput = document.getElementById('register-email');
      if (emailGroup) {
        emailGroup.style.display = 'block';
        emailInput.required = true;
      }
    }
    if (data.registration?.captcha && data.registration?.captchaSiteKey) {
      loadCaptchaWidget(data.registration.captchaSiteKey);
    }
  } catch (e) {
    // Ignore - email field will be optional
  }
}

let turnstileWidgetId = null;

function loadCaptchaWidget(siteKey) {
  const container = document.getElementById('captcha-container');
  if (!container) return;
  container.style.display = 'block';
  
  if (window.turnstile) {
    turnstileWidgetId = window.turnstile.render(container, { sitekey: siteKey, theme: 'dark' });
    return;
  }
  
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
  script.async = true;
  window.onTurnstileLoad = () => {
    turnstileWidgetId = window.turnstile.render(container, { sitekey: siteKey, theme: 'dark' });
  };
  document.head.appendChild(script);
}

async function loadOAuthProviders$1() {
  try {
    const res = await fetch('/api/auth/oauth/providers');
    const data = await res.json();
    
    if (data.providers && data.providers.length > 0) {
      const section = document.getElementById('oauth-section');
      const container = document.getElementById('oauth-buttons');
      
      if (section && container) {
        section.style.display = 'block';
        container.innerHTML = data.providers.map(p => `
          <button type="button" class="oauth-btn oauth-${p.type}" data-provider="${p.id}">
            ${OAUTH_ICONS[p.type] || '<span class="round-icon">login</span>'}
            <span>${p.name}</span>
          </button>
        `).join('');
        
        container.querySelectorAll('.oauth-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            window.location.href = `/api/auth/oauth/${btn.dataset.provider}`;
          });
        });
      }
    }
  } catch (e) {
    console.error('Failed to load OAuth providers:', e);
  }
}

function renderAuthCallback() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error');
  
  if (error) {
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
            <h2>Authentication Failed</h2>
            <p class="auth-subtitle">${getErrorMessage(error)}</p>
          </div>
          <a href="/auth" class="btn btn-primary btn-full">
            <span>Try Again</span>
          </a>
        </div>
      </div>
    `;
    return;
  }
  
  if (token) {
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <span class="round-icon spinning" style="font-size: 48px;">sync</span>
            <h2>Signing in...</h2>
          </div>
        </div>
      </div>
    `;
    
    setToken(token);
    
    fetch('/api/servers', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(() => {
      window.router.navigateTo('/dashboard');
    }).catch(() => {
      window.router.navigateTo('/auth?error=token_failed');
    });
  } else {
    window.router.navigateTo('/auth');
  }
}

function getErrorMessage(error) {
  const messages = {
    oauth_failed: 'OAuth authentication failed. Please try again.',
    invalid_state: 'Invalid security state. Please try again.',
    provider_not_found: 'OAuth provider not found or disabled.',
    token_failed: 'Failed to obtain access token.',
    userinfo_failed: 'Failed to get user information.'
  };
  return messages[error] || 'An unknown error occurred.';
}

function render2FAScreen(username, password) {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();
  
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">
            <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="28" height="28">
            <span class="logo-text">${branding.name}</span>
          </div>
          <p class="auth-subtitle">Two-Factor Authentication</p>
        </div>
        
        <form id="2fa-form" class="auth-form active">
          <p class="form-info">
            <span class="round-icon">email</span>
            A verification code has been sent to your email.
          </p>
          
          <div class="form-group">
            <label for="2fa-code">Verification Code</label>
            <div class="input-wrapper">
              <span class="round-icon">pin</span>
              <input type="text" id="2fa-code" name="code" placeholder="Enter 6-digit code" 
                     required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code">
            </div>
          </div>
          
          <div class="error-message" id="2fa-error"></div>
          
          <button type="submit" class="btn btn-primary btn-full" id="2fa-submit-btn">
            <span>Verify</span>
            <span class="round-icon">check</span>
          </button>
          
          <div class="auth-links">
            <button type="button" class="link-btn" id="resend-code-btn">Resend Code</button>
            <span class="divider">•</span>
            <button type="button" class="link-btn" id="back-to-login-btn">Back to Login</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  const form = document.getElementById('2fa-form');
  const errorEl = document.getElementById('2fa-error');
  const codeInput = document.getElementById('2fa-code');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    const btn = document.getElementById('2fa-submit-btn');
    
    if (!/^\d{6}$/.test(code)) {
      errorEl.textContent = 'Please enter a valid 6-digit code';
      errorEl.style.display = 'block';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, twoFactorCode: code })
      });
      
      const data = await res.json();
      
      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Verify</span><span class="round-icon">check</span>';
        
        if (data.codeExpired) {
          codeInput.value = '';
        }
        return;
      }
      
      setToken(data.token);
      
      window.router.navigateTo('/dashboard');
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span>Verify</span><span class="round-icon">check</span>';
    }
  });
  
  document.getElementById('resend-code-btn').addEventListener('click', async () => {
    const btn = document.getElementById('resend-code-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    try {
      const res = await fetch('/api/auth/2fa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.style.display = 'block';
      } else {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        codeInput.value = '';
        codeInput.focus();
        
        const info = document.querySelector('.form-info');
        if (info) {
          info.innerHTML = '<span class="round-icon">check_circle</span> New code sent to your email.';
          info.classList.add('success');
        }
      }
    } catch (err) {
      errorEl.textContent = 'Failed to resend code';
      errorEl.style.display = 'block';
    }
    
    btn.disabled = false;
    btn.textContent = 'Resend Code';
  });
  
  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    renderAuth();
  });
  
  codeInput.focus();
}

async function renderVerifyEmail() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  
  if (!token) {
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
            <h2>Invalid Link</h2>
            <p class="auth-subtitle">No verification token provided.</p>
          </div>
          <a href="/auth" class="btn btn-primary btn-full">
            <span>Go to Login</span>
          </a>
        </div>
      </div>
    `;
    return;
  }
  
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <span class="round-icon spinning" style="font-size: 48px;">sync</span>
          <h2>Verifying email...</h2>
        </div>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    
    if (data.success) {
      app.innerHTML = `
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <span class="round-icon" style="font-size: 48px; color: var(--success);">check_circle</span>
              <h2>Email Verified!</h2>
              <p class="auth-subtitle">${data.message || 'Your email has been verified successfully.'}</p>
            </div>
            <a href="/dashboard" class="btn btn-primary btn-full">
              <span>Go to Dashboard</span>
            </a>
          </div>
        </div>
      `;
    } else {
      app.innerHTML = `
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
              <h2>Verification Failed</h2>
              <p class="auth-subtitle">${data.error || 'Unable to verify your email.'}</p>
            </div>
            <a href="/dashboard" class="btn btn-primary btn-full">
              <span>Go to Dashboard</span>
            </a>
          </div>
        </div>
      `;
    }
  } catch (e) {
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
            <h2>Connection Error</h2>
            <p class="auth-subtitle">Unable to reach the server. Please try again.</p>
          </div>
          <a href="${window.location.href}" class="btn btn-primary btn-full">
            <span>Try Again</span>
          </a>
        </div>
      </div>
    `;
  }
}

function renderForgotPassword() {
  const branding = getBranding();
  const app = document.getElementById('app');
  app.className = 'auth-page';
  
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">
            <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="28" height="28">
            <span class="logo-text">${branding.name}</span>
          </div>
          <p class="auth-subtitle">Reset your password</p>
        </div>
        
        <form id="forgot-form" class="auth-form active">
          <p class="form-info">
            <span class="round-icon">info</span>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          <div class="form-group">
            <label for="forgot-email">Email</label>
            <div class="input-wrapper">
              <span class="round-icon">email</span>
              <input type="email" id="forgot-email" name="email" placeholder="Enter your email" required>
            </div>
          </div>
          
          <div class="error-message" id="forgot-error"></div>
          <div class="success-message" id="forgot-success" style="display: none;"></div>
          
          <button type="submit" class="btn btn-primary btn-full" id="forgot-submit-btn">
            <span>Send Reset Link</span>
            <span class="round-icon">send</span>
          </button>
          
          <div class="auth-links">
            <button type="button" class="link-btn" id="back-to-login-btn">Back to Login</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  const form = document.getElementById('forgot-form');
  const errorEl = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = document.getElementById('forgot-submit-btn');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.style.display = 'block';
      } else {
        successEl.textContent = data.message;
        successEl.style.display = 'block';
        form.querySelector('input').disabled = true;
      }
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
    }
    
    btn.disabled = false;
    btn.innerHTML = '<span>Send Reset Link</span><span class="round-icon">send</span>';
  });
  
  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    renderAuth();
  });
}

async function renderResetPassword() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  
  if (!token) {
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
            <h2>Invalid Link</h2>
            <p class="auth-subtitle">No reset token provided.</p>
          </div>
          <a href="/auth" class="btn btn-primary btn-full">
            <span>Go to Login</span>
          </a>
        </div>
      </div>
    `;
    return;
  }
  
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <span class="round-icon spinning" style="font-size: 48px;">sync</span>
          <h2>Validating...</h2>
        </div>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    
    if (!data.valid) {
      app.innerHTML = `
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
              <h2>Invalid Link</h2>
              <p class="auth-subtitle">${data.error || 'This reset link is invalid or has expired.'}</p>
            </div>
            <a href="/auth" class="btn btn-primary btn-full">
              <span>Go to Login</span>
            </a>
          </div>
        </div>
      `;
      return;
    }
    
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div class="logo">
              <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="28" height="28">
              <span class="logo-text">${branding.name}</span>
            </div>
            <p class="auth-subtitle">Reset password for <strong>${data.username}</strong></p>
          </div>
          
          <form id="reset-form" class="auth-form active">
            <div class="form-group">
              <label for="new-password">New Password</label>
              <div class="input-wrapper">
                <span class="round-icon">lock</span>
                <input type="password" id="new-password" name="password" placeholder="Enter new password" required minlength="6">
              </div>
              <small class="form-hint">Minimum 6 characters</small>
            </div>
            
            <div class="form-group">
              <label for="confirm-password">Confirm Password</label>
              <div class="input-wrapper">
                <span class="round-icon">lock</span>
                <input type="password" id="confirm-password" name="confirm" placeholder="Confirm new password" required>
              </div>
            </div>
            
            <div class="error-message" id="reset-error"></div>
            
            <button type="submit" class="btn btn-primary btn-full" id="reset-submit-btn">
              <span>Reset Password</span>
              <span class="round-icon">check</span>
            </button>
          </form>
        </div>
      </div>
    `;
    
    const form = document.getElementById('reset-form');
    const errorEl = document.getElementById('reset-error');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('new-password').value;
      const confirm = document.getElementById('confirm-password').value;
      const btn = document.getElementById('reset-submit-btn');
      
      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
      }
      
      btn.disabled = true;
      btn.innerHTML = '<span class="round-icon spinning">sync</span>';
      errorEl.style.display = 'none';
      
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });
        
        const data = await res.json();
        
        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = 'block';
          btn.disabled = false;
          btn.innerHTML = '<span>Reset Password</span><span class="round-icon">check</span>';
        } else {
          app.innerHTML = `
            <div class="auth-container">
              <div class="auth-card">
                <div class="auth-header">
                  <span class="round-icon" style="font-size: 48px; color: var(--success);">check_circle</span>
                  <h2>Password Reset!</h2>
                  <p class="auth-subtitle">Your password has been reset successfully.</p>
                </div>
                <a href="/auth" class="btn btn-primary btn-full">
                  <span>Sign In</span>
                </a>
              </div>
            </div>
          `;
        }
      } catch (err) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Reset Password</span><span class="round-icon">check</span>';
      }
    });
    
  } catch (e) {
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <span class="round-icon" style="font-size: 48px; color: var(--danger);">error</span>
            <h2>Connection Error</h2>
            <p class="auth-subtitle">Unable to reach the server. Please try again.</p>
          </div>
          <a href="${window.location.href}" class="btn btn-primary btn-full">
            <span>Try Again</span>
          </a>
        </div>
      </div>
    `;
  }
}

class State {
  constructor() {
    this._user = null;
    this._loaded = false;
  }

  get user() {
    if (this._user) return this._user;
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.id, username: payload.username, isAdmin: payload.isAdmin };
    } catch {
      return null;
    }
  }

  get username() {
    return this.user?.username || '';
  }

  get isAdmin() {
    return this.user?.isAdmin || false;
  }

  get isLoggedIn() {
    return !!getToken();
  }

  async load() {
    if (this._loaded || !getToken()) return;
    const username = this.username;
    if (!username) return;
    try {
      const res = await api(`/api/user/profile?username=${encodeURIComponent(username)}&viewer=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.user) {
        this._user = data.user;
        this._loaded = true;
      }
    } catch {}
  }

  clear() {
    this._user = null;
    this._loaded = false;
  }

  update(fields) {
    if (this._user) {
      Object.assign(this._user, fields);
    }
  }
}

const state$1 = new State();

var state$2 = /*#__PURE__*/Object.freeze({
__proto__: null,
state: state$1
});

function escapeHtml$1(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#96;');
}

function escapeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    // Invalid URL format
    return '';
  }
}

function sanitizeText(text, maxLength = 1000) {
  if (typeof text !== 'string') return '';
  return escapeHtml$1(text.slice(0, maxLength).trim());
}

function isValidUrl(url) {
  if (!url || typeof url !== 'string') return true;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:';
  } catch {
    // Invalid URL format
    return false;
  }
}

function createSafeElement(tag, attributes = {}, textContent = '') {
  const el = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'href' || key === 'src') {
      const safeUrl = escapeUrl(value);
      if (safeUrl) el.setAttribute(key, safeUrl);
    } else if (key === 'class') {
      el.className = value;
    } else if (key.startsWith('data-')) {
      el.setAttribute(key, escapeHtml$1(value));
    } else {
      el.setAttribute(key, escapeHtml$1(value));
    }
  }
  
  if (textContent) {
    el.textContent = textContent;
  }
  
  return el;
}

function safeInnerHTML(element, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  
  const scripts = template.content.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  const elements = template.content.querySelectorAll('*');
  elements.forEach(el => {
    const attrs = Array.from(el.attributes);
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || 
          attr.value.includes('javascript:') ||
          attr.value.includes('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  element.innerHTML = '';
  element.appendChild(template.content);
}

let pollInterval$2 = null;
let statusSockets$1 = new Map();

function renderDashboard() {
  const app = document.getElementById('app');
  app.className = 'dashboard-page';
  
  const displayName = state$1.user?.displayName || state$1.username;
  
  app.innerHTML = `
    <div class="dashboard-container">
      <div id="node-alerts-container"></div>
      <div id="email-verification-banner"></div>
      <div id="announcements-container"></div>
      
      <header class="dashboard-header">
        <div class="greeting">
          <div class="greeting-icon">
            <span class="round-icon">home</span>
          </div>
          <div class="greeting-text">
            <h1>Welcome, <span class="highlight">${escapeHtml$1(displayName)}!</span></h1>
            <p>Manage your servers and resources with ease.</p>
          </div>
        </div>
      </header>
      
      <div class="dashboard-grid">
        <div class="dashboard-section resources-section">
          <span class="round-icon corner-icon">data_usage</span>
          <div class="section-header">
            <span class="round-icon">data_usage</span>
            <h2>Resource Usage</h2>
          </div>
          <div class="limits-grid" id="limits-display">
            <div class="loading-spinner"></div>
          </div>
        </div>
        
        <div class="dashboard-section servers-section">
          <span class="round-icon corner-icon">dns</span>
          <div class="section-header">
            <span class="round-icon">dns</span>
            <h2>Servers</h2>
            <a href="/servers" class="muted">View All</a>
          </div>
          <div class="servers-list" id="servers-list">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadLimits();
  loadServers$1();
  loadAnnouncements();
  checkEmailVerification();
  
  pollInterval$2 = setInterval(() => {
    loadServers$1();
    loadLimits();
    loadQuickStats();
  }, 10000);
}

async function checkEmailVerification() {
  const banner = document.getElementById('email-verification-banner');
  if (!banner) return;
  
  try {
    const res = await api('/api/auth/verification-status');
    const data = await res.json();
    
    if (data.emailVerificationRequired && !data.emailVerified) {
      banner.innerHTML = `
        <div class="verification-banner">
          <div class="verification-content">
            <span class="round-icon">mail</span>
            <div class="verification-text">
              <strong>Email Verification Required</strong>
              <p>Please verify your email address (${data.email || 'not set'}) to unlock all features.</p>
            </div>
          </div>
          <button class="btn btn-sm" id="resend-verification-btn">Resend Email</button>
        </div>
      `;
      
      document.getElementById('resend-verification-btn')?.addEventListener('click', async (e) => {
        const btn = e.target;
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
          const resendRes = await api('/api/auth/resend-verification', { method: 'POST' });
          const resendData = await resendRes.json();
          if (resendData.success) {
            btn.textContent = 'Email Sent!';
            btn.classList.add('btn-success');
          } else {
            btn.textContent = resendData.error || 'Failed';
            btn.disabled = false;
          }
        } catch (err) {
          btn.textContent = 'Failed';
          btn.disabled = false;
        }
      });
    }
  } catch (e) {
    // Ignore verification check errors
  }
}

async function loadLimits() {
  const username = state$1.username;
  const container = document.getElementById('limits-display');
  if (!container) return;
  
  try {
    const res = await api(`/api/user/limits?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    
    const calcPercent = (used, limit) => limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    
    container.innerHTML = `
      <div class="limit-item">
        <div class="limit-header">
          <span class="label">Servers</span>
          <span class="value">${data.used.servers} / ${data.limits.servers}</span>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${calcPercent(data.used.servers, data.limits.servers)}%"></div>
        </div>
      </div>
      <div class="limit-item">
        <div class="limit-header">
          <span class="label">Memory</span>
          <span class="value">${data.used.memory} / ${data.limits.memory} MB</span>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${calcPercent(data.used.memory, data.limits.memory)}%"></div>
        </div>
      </div>
      <div class="limit-item">
        <div class="limit-header">
          <span class="label">Disk</span>
          <span class="value">${data.used.disk} / ${data.limits.disk} MB</span>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${calcPercent(data.used.disk, data.limits.disk)}%"></div>
        </div>
      </div>
      <div class="limit-item">
        <div class="limit-header">
          <span class="label">CPU</span>
          <span class="value">${data.used.cpu} / ${data.limits.cpu}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${calcPercent(data.used.cpu, data.limits.cpu)}%"></div>
        </div>
      </div>
      <div class="limit-item">
        <div class="limit-header">
          <span class="label">Allocations</span>
          <span class="value">${data.used.allocations || 0} / ${data.limits.allocations || 5}</span>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${calcPercent(data.used.allocations || 0, data.limits.allocations || 5)}%"></div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Failed to load limits:', e);
    container.innerHTML = `<div class="error-state">Failed to load resources</div>`;
  }
}

async function loadServers$1() {
  const container = document.getElementById('servers-list');
  if (!container) return;
  
  try {
    const res = await api('/api/servers');
    const data = await res.json();
    
    if (data.servers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="round-icon">dns</span>
          <p>No servers yet</p>
        </div>
      `;
      return;
    }
    
    // Show node down alerts
    const downNodes = [...new Set(data.servers.filter(s => s.node_online === false).map(s => s.node_name || 'Unknown'))];
    const alertsContainer = document.getElementById('node-alerts-container');
    if (alertsContainer) {
      alertsContainer.innerHTML = downNodes.length > 0 ? downNodes.map(name => `
        <div class="node-alert-banner">
          <span class="round-icon">warning</span>
          <div>
            <strong>Node "${escapeHtml$1(name)}" is offline</strong>
            <p>Servers on this node may be unreachable. <a href="/status">View status</a></p>
          </div>
        </div>
      `).join('') : '';
    }
    
    container.innerHTML = data.servers.map(server => `
      <a href="/server/${server.id}" class="server-item ${server.node_online === false ? 'node-down' : ''}">
        <div class="server-info">
          <span class="server-name">${escapeHtml$1(server.name)}</span>
          <span class="server-address">${server.node_address || `${server.allocation?.ip}:${server.allocation?.port}`}</span>
        </div>
        <div class="server-meta">
          ${server.node_online === false ? '<span class="node-down-badge"><span class="round-icon">cloud_off</span>Node Down</span>' : ''}
          <span class="server-status" data-status-id="${server.id}"></span>
          <span class="round-icon">chevron_right</span>
        </div>
      </a>
    `).join('');
    
    connectStatusSockets$1(data.servers);
  } catch (e) {
    console.error('Failed to load servers:', e);
    container.innerHTML = `<div class="error-state">Failed to load servers</div>`;
  }
}

function connectStatusSockets$1(servers) {
  const token = getToken();
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  servers.forEach(server => {
    if (statusSockets$1.has(server.id)) return;
    
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/console?server=${server.id}&token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'auth success') {
          socket.send(JSON.stringify({ event: 'send stats', args: [null] }));
        } else if (message.event === 'status' && message.args?.[0]) {
          updateServerStatus$2(server.id, message.args[0]);
        }
      } catch (e) {}
    };
    
    socket.onclose = () => statusSockets$1.delete(server.id);
    statusSockets$1.set(server.id, socket);
  });
}

function updateServerStatus$2(serverId, status) {
  const el = document.querySelector(`[data-status-id="${serverId}"]`);
  if (!el) return;
  el.className = `server-status status-${status}`;
  el.textContent = status;
  updateQuickStats();
}

function updateQuickStats() {
  const container = document.getElementById('quick-stats');
  if (!container) return;
  
  const badges = document.querySelectorAll('[data-status-id]');
  let online = 0, starting = 0, stopping = 0, offline = 0;
  
  badges.forEach(el => {
    const s = el.textContent.trim();
    if (s === 'running') online++;
    else if (s === 'starting') starting++;
    else if (s === 'stopping') stopping++;
    else if (s === 'offline' || s === '--') offline++;
  });
  
  container.innerHTML = `
    <div class="stat-chip online">
      <span class="round-icon">check_circle</span>
      <span>${online} online</span>
    </div>
    <div class="stat-chip starting">
      <span class="round-icon">hourglass_top</span>
      <span>${starting} starting</span>
    </div>
    <div class="stat-chip stopping">
      <span class="round-icon">pending</span>
      <span>${stopping} stopping</span>
    </div>
    <div class="stat-chip offline">
      <span class="round-icon">cancel</span>
      <span>${offline} offline</span>
    </div>
  `;
}

async function loadAnnouncements() {
  const container = document.getElementById('announcements-container');
  if (!container) return;
  
  try {
    const res = await api('/api/announcements/active');
    const data = await res.json();
    
    if (data.announcements.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    let dismissed = [];
    try {
      dismissed = state$1.user?.settings?.dismissedAnnouncements || [];
    } catch {}
    const activeAnnouncements = data.announcements.filter(a => !dismissed.includes(a.id));
    
    if (activeAnnouncements.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    container.innerHTML = activeAnnouncements.map(a => `
      <div class="announcement-banner type-${a.type}" data-id="${a.id}">
        <div class="announcement-icon">
          <span class="round-icon">campaign</span>
        </div>
        <div class="announcement-content">
          <div class="announcement-title">${escapeHtml$1(a.title)}</div>
          <div class="announcement-text">${escapeHtml$1(a.content)}</div>
        </div>
        <button class="announcement-close" onclick="dismissAnnouncement('${a.id}')">
          <span class="round-icon">close</span>
        </button>
      </div>
    `).join('');
    
    window.dismissAnnouncement = async (id) => {
      const banner = document.querySelector(`.announcement-banner[data-id="${id}"]`);
      if (banner) banner.remove();
      try {
        const current = state$1.user?.settings?.dismissedAnnouncements || [];
        current.push(id);
        await api('/api/user/settings', {
          method: 'PUT',
          body: JSON.stringify({ settings: { dismissedAnnouncements: current } })
        });
        state$1.update({ settings: { ...state$1.user?.settings, dismissedAnnouncements: current } });
      } catch {}
    };
  } catch (e) {
    console.error('Failed to load announcements:', e);
    container.innerHTML = '';
  }
}

function cleanupDashboard() {
  if (pollInterval$2) {
    clearInterval(pollInterval$2);
    pollInterval$2 = null;
  }
  statusSockets$1.forEach(socket => socket.close());
  statusSockets$1.clear();
}

function renderProfile() {
  const app = document.getElementById('app');
  app.className = 'profile-page';
  
  const username = state$1.username;
  const displayName = state$1.user?.displayName || username;
  
  app.innerHTML = `
    <div class="profile-container">
      <div class="profile-content">
        <div class="profile-card">
          <div class="avatar-section">
            <div class="avatar" id="avatar-preview">
              <img src="/default-avatar.png" alt="Avatar">
            </div>
            <div class="avatar-info">
              <h3 id="profile-display-name">${escapeHtml$1(displayName)}</h3>
              <span class="username">@${escapeHtml$1(username)}</span>
            </div>
          </div>
        </div>
        
        <form id="profile-form" class="profile-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <div class="form-group">
              <label for="avatar-url">Profile Picture URL</label>
              <div class="input-wrapper">
                <span class="round-icon">image</span>
                <input type="url" id="avatar-url" name="avatar" placeholder="https://example.com/avatar.png">
              </div>
              <small class="form-hint">Use a direct image URL (https only)</small>
            </div>
            
            <div class="form-group">
              <label for="display-name">Display Name</label>
              <div class="input-wrapper">
                <span class="round-icon">badge</span>
                <input type="text" id="display-name" name="displayName" value="${escapeHtml$1(displayName)}" maxlength="50" placeholder="Your display name">
              </div>
              <small class="form-hint">This is how others will see you</small>
            </div>
            
            <div class="form-group">
              <label for="bio">Bio</label>
              <div class="textarea-wrapper">
                <textarea id="bio" name="bio" maxlength="500" placeholder="Tell us about yourself..." rows="4"></textarea>
              </div>
              <small class="form-hint"><span id="bio-count">0</span>/500 characters</small>
            </div>
          </div>
          
          <div class="form-actions">
            <div class="message" id="profile-message"></div>
            <button type="submit" class="btn btn-primary">
              <span class="round-icon">save</span>
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  loadProfile();
  
  const avatarInput = app.querySelector('#avatar-url');
  const avatarPreview = app.querySelector('#avatar-preview');
  
  avatarInput.addEventListener('input', () => {
    updateAvatarPreview(avatarInput.value, avatarPreview);
  });
  
  const bioInput = app.querySelector('#bio');
  const bioCount = app.querySelector('#bio-count');
  
  bioInput.addEventListener('input', () => {
    bioCount.textContent = bioInput.value.length;
  });
  
  const form = app.querySelector('#profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const displayName = form.querySelector('#display-name').value.trim();
    const bio = form.querySelector('#bio').value.trim();
    const avatar = form.querySelector('#avatar-url').value.trim();
    
    const messageEl = form.querySelector('#profile-message');
    const btn = form.querySelector('button[type="submit"]');
    
    if (!validateUrls([avatar])) {
      messageEl.textContent = 'Invalid URL detected. Only https:// URLs are allowed.';
      messageEl.className = 'message error';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await api('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName,
          bio,
          avatar
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        messageEl.textContent = escapeHtml$1(data.error);
        messageEl.className = 'message error';
      } else {
        messageEl.textContent = 'Profile updated successfully!';
        messageEl.className = 'message success';
        const profileDisplayName = document.getElementById('profile-display-name');
        if (profileDisplayName) profileDisplayName.textContent = escapeHtml$1(displayName);
        
        const navDisplayName = document.querySelector('.user-display-name');
        if (navDisplayName) navDisplayName.textContent = escapeHtml$1(displayName);
        
        const navAvatar = document.querySelector('#navbar .user-avatar img');
        if (navAvatar) navAvatar.src = avatar || '/default-avatar.png';
      }
    } catch (err) {
      messageEl.textContent = 'Connection error. Please try again.';
      messageEl.className = 'message error';
    }
    
    btn.disabled = false;
    btn.innerHTML = '<span class="round-icon">save</span><span>Save Changes</span>';
    
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'message';
    }, 3000);
  });
}

function validateUrls(urls) {
  for (const url of urls) {
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
    } catch {
      // Invalid URL format
      return false;
    }
  }
  return true;
}

function updateAvatarPreview(url, container) {
  if (!url || !validateUrls([url])) {
    container.innerHTML = '<img src="/default-avatar.png" alt="Avatar">';
    return;
  }
  
  const img = new Image();
  img.onload = () => {
    container.innerHTML = '';
    container.appendChild(img);
  };
  img.onerror = () => {
    container.innerHTML = '<img src="/default-avatar.png" alt="Avatar">';
  };
  img.src = url;
  img.alt = 'Avatar';
}

async function loadProfile() {
  try {
    const username = state$1.username;
    const res = await fetch(`/api/user/profile?username=${encodeURIComponent(username)}&viewer=${encodeURIComponent(username)}`);
    const data = await res.json();
    
    if (data.user) {
      const bioInput = document.getElementById('bio');
      const bioCount = document.getElementById('bio-count');
      const displayNameInput = document.getElementById('display-name');
      const avatarInput = document.getElementById('avatar-url');
      const avatarPreview = document.getElementById('avatar-preview');
      
      if (bioInput && data.user.bio) {
        bioInput.value = data.user.bio;
        bioCount.textContent = data.user.bio.length;
      }
      
      if (displayNameInput && data.user.displayName) {
        displayNameInput.value = data.user.displayName;
      }
      
      if (avatarInput && data.user.avatar) {
        avatarInput.value = data.user.avatar;
        updateAvatarPreview(data.user.avatar, avatarPreview);
      }
      
      if (data.user.links) {
        const links = data.user.links;
        if (links.website) document.getElementById('link-website').value = links.website;
        if (links.twitter) document.getElementById('link-twitter').value = links.twitter;
        if (links.github) document.getElementById('link-github').value = links.github;
        if (links.discord) document.getElementById('link-discord').value = links.discord;
        if (links.instagram) document.getElementById('link-instagram').value = links.instagram;
      }
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

const THEMES = ['dark', 'light'];

let _currentTheme = 'dark';

function getTheme() {
  return _currentTheme;
}

function setTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'dark';
  _currentTheme = theme;
  applyTheme(theme);
}

async function saveTheme(theme) {
  setTheme(theme);
  if (!getToken()) return;
  try {
    await api('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: { theme } })
    });
  } catch {}
}

async function loadUserTheme() {
  if (!getToken()) return;
  try {
    await state$1.load();
    const theme = state$1.user?.settings?.theme;
    if (theme && THEMES.includes(theme)) {
      setTheme(theme);
    }
  } catch {}
}

function applyTheme(theme) {
  if (!theme) theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
}

function getAvailableThemes() {
  return [
    { id: 'dark', name: 'Dark' },
    { id: 'light', name: 'Light' }
  ];
}

function initTheme() {
  applyTheme(_currentTheme);
}

function confirm(options = {}) {
  return new Promise((resolve) => {
    const { title = 'Confirm', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm = null } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${escapeHtml$1(title)}</h3>
        </div>
        <div class="modal-body">
          <p>${escapeHtml$1(message)}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
    
    const close = (result) => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 150);
      resolve(result);
    };
    
    modal.querySelector('#modal-cancel').onclick = () => close(false);
    modal.querySelector('#modal-confirm').onclick = async () => {
      if (onConfirm) {
        await onConfirm();
      }
      close(true);
    };
    modal.querySelector('.modal-backdrop').onclick = () => close(false);
    
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        close(false);
        document.removeEventListener('keydown', handleKey);
      }
    };
    document.addEventListener('keydown', handleKey);
    
    modal.querySelector('#modal-confirm').focus();
  });
}

function prompt(message, options = {}) {
  return new Promise((resolve) => {
    const { title = 'Input', placeholder = '', defaultValue = '', confirmText = 'OK', cancelText = 'Cancel' } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${escapeHtml$1(title)}</h3>
        </div>
        <div class="modal-body">
          <p>${escapeHtml$1(message)}</p>
          <input type="text" class="input" id="modal-input" placeholder="${escapeHtml$1(placeholder)}" value="${escapeHtml$1(defaultValue)}">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
          <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
    
    const input = modal.querySelector('#modal-input');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
    
    const close = (result) => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 150);
      resolve(result);
    };
    
    modal.querySelector('#modal-cancel').onclick = () => close(null);
    modal.querySelector('#modal-confirm').onclick = () => close(input.value);
    modal.querySelector('.modal-backdrop').onclick = () => close(null);
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        close(input.value);
      } else if (e.key === 'Escape') {
        close(null);
      }
    });
  });
}

function show(options = {}) {
  return new Promise((resolve) => {
    const { 
      title = 'Modal', 
      content = '', 
      confirmText = 'Confirm', 
      cancelText = 'Cancel',
      danger = false,
      onConfirm = null 
    } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${escapeHtml$1(title)}</h3>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
    
    const close = (result) => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 150);
      resolve(result);
    };
    
    modal.querySelector('#modal-cancel').onclick = () => close(false);
    modal.querySelector('#modal-confirm').onclick = async () => {
      if (onConfirm) {
        await onConfirm();
      }
      close(true);
    };
    modal.querySelector('.modal-backdrop').onclick = () => close(false);
    
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        close(false);
        document.removeEventListener('keydown', handleKey);
      }
    };
    document.addEventListener('keydown', handleKey);
  });
}

function alert(message, options = {}) {
  return new Promise((resolve) => {
    const { title = 'Alert', confirmText = 'OK' } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${escapeHtml$1(title)}</h3>
        </div>
        <div class="modal-body">
          <p>${escapeHtml$1(message)}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
    
    const close = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 150);
      resolve();
    };
    
    modal.querySelector('#modal-confirm').onclick = close;
    modal.querySelector('.modal-backdrop').onclick = close;
    
    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        close();
        document.removeEventListener('keydown', handleKey);
      }
    };
    document.addEventListener('keydown', handleKey);
    
    modal.querySelector('#modal-confirm').focus();
  });
}

function renderSettings() {
  const app = document.getElementById('app');
  app.className = 'settings-page';
  
  const username = state$1.username;
  
  app.innerHTML = `
    <div class="settings-container">
      <div class="settings-header">
        <h1>Settings</h1>
        <p>Manage your account preferences</p>
      </div>
      
      <div class="settings-content">
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">palette</span>
            <h3>Appearance</h3>
          </div>
          
          <div class="theme-grid" id="theme-grid">
            ${getAvailableThemes().map(t => `
              <button class="theme-card ${getTheme() === t.id ? 'active' : ''}" data-theme="${t.id}">
                <div class="theme-preview" data-preview="${t.id}">
                  <div class="preview-sidebar"></div>
                  <div class="preview-content">
                    <div class="preview-header"></div>
                    <div class="preview-cards">
                      <div class="preview-card"></div>
                      <div class="preview-card"></div>
                    </div>
                  </div>
                </div>
                <span class="theme-name">${t.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
        
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">notifications</span>
            <h3>Notifications</h3>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Push Notifications</span>
              <span class="setting-description">Receive notifications about activity</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" id="notifications-toggle" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">security</span>
            <h3>Security</h3>
          </div>
          
          <div class="setting-item" id="2fa-setting">
            <div class="setting-info">
              <span class="setting-title">Two-Factor Authentication</span>
              <span class="setting-description" id="2fa-description">Require email verification code on login</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" id="2fa-toggle" disabled>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div class="setting-item clickable" id="change-password-btn">
            <div class="setting-info">
              <span class="setting-title">Change Password</span>
              <span class="setting-description">Update your account password</span>
            </div>
            <span class="round-icon">chevron_right</span>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">devices</span>
            <h3>Active Sessions</h3>
          </div>
          
          <div class="sessions-container">
            <div class="sessions-header">
              <p class="setting-description">Devices and browsers where you're currently logged in</p>
              <button class="btn btn-danger btn-sm" id="revoke-all-sessions-btn">
                <span class="round-icon">logout</span>
                <span>Revoke All Others</span>
              </button>
            </div>
            <div class="sessions-list" id="sessions-list">
              <div class="loading-spinner"></div>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">key</span>
            <h3>SSH Keys</h3>
          </div>
          
          <div class="api-keys-container">
            <div class="api-keys-header">
              <p class="setting-description">SSH keys for SFTP authentication</p>
              <button class="btn btn-primary btn-sm" id="add-ssh-key-btn">
                <span class="round-icon">add</span>
                <span>Add Key</span>
              </button>
            </div>
            <div class="api-keys-list" id="ssh-keys-list">
              <div class="loading-spinner"></div>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">vpn_key</span>
            <h3>API Keys</h3>
          </div>
          
          <div class="api-keys-container">
            <div class="api-keys-header">
              <p class="setting-description">Manage API keys to access the Sodium API programmatically</p>
              <button class="btn btn-primary btn-sm" id="create-api-key-btn">
                <span class="round-icon">add</span>
                <span>Create Key</span>
              </button>
            </div>
            <div class="api-keys-list" id="api-keys-list">
              <div class="loading-spinner"></div>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">webhook</span>
            <h3>Webhooks</h3>
          </div>
          
          <div class="webhooks-container">
            <div class="webhooks-header">
              <p class="setting-description">Send notifications to Discord, Slack, or custom URLs when events occur</p>
              <button class="btn btn-primary btn-sm" id="create-webhook-btn">
                <span class="round-icon">add</span>
                <span>Add Webhook</span>
              </button>
            </div>
            <div class="webhooks-list" id="webhooks-list">
              <div class="loading-spinner"></div>
            </div>
          </div>
        </div>
        
        <div class="settings-section danger-section">
          <div class="section-header">
            <span class="round-icon">warning</span>
            <h3>Danger Zone</h3>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Sign Out</span>
              <span class="setting-description">Sign out of your account on this device</span>
            </div>
            <button class="btn btn-danger" id="logout-btn">
              <span class="round-icon">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal" id="api-key-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create API Key</h3>
          <button class="modal-close" id="close-api-key-modal">
            <span class="round-icon">close</span>
          </button>
        </div>
        <form id="api-key-form">
          <div class="form-group">
            <label for="api-key-name">Key Name</label>
            <div class="input-wrapper">
              <span class="round-icon">label</span>
              <input type="text" id="api-key-name" required maxlength="50" placeholder="My API Key">
            </div>
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <div class="permissions-grid" id="permissions-grid"></div>
          </div>
          <div class="message" id="api-key-message"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-api-key-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Key</button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="modal" id="api-key-created-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>API Key Created</h3>
          <button class="modal-close" id="close-api-key-created-modal">
            <span class="round-icon">close</span>
          </button>
        </div>
        <div class="api-key-created-content">
          <div class="warning-box">
            <span class="round-icon">warning</span>
            <p>Make sure to copy your API key now. You won't be able to see it again!</p>
          </div>
          <div class="api-key-display">
            <code id="created-api-key-token"></code>
            <button type="button" class="btn btn-icon" id="copy-api-key-btn">
              <span class="round-icon">content_copy</span>
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" id="done-api-key-btn">Done</button>
        </div>
      </div>
    </div>
    
    <div class="modal" id="password-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Change Password</h3>
          <button class="modal-close" id="close-modal">
            <span class="round-icon">close</span>
          </button>
        </div>
        <form id="password-form">
          <div class="form-group">
            <label for="current-password">Current Password</label>
            <div class="input-wrapper">
              <span class="round-icon">lock</span>
              <input type="password" id="current-password" required>
            </div>
          </div>
          <div class="form-group">
            <label for="new-password">New Password</label>
            <div class="input-wrapper">
              <span class="round-icon">lock</span>
              <input type="password" id="new-password" required minlength="6">
            </div>
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirm New Password</label>
            <div class="input-wrapper">
              <span class="round-icon">lock</span>
              <input type="password" id="confirm-password" required>
            </div>
          </div>
          <div class="message" id="password-message"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Password</button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="modal" id="webhook-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Webhook</h3>
          <button class="modal-close" id="close-webhook-modal">
            <span class="round-icon">close</span>
          </button>
        </div>
        <form id="webhook-form">
          <div class="form-group">
            <label for="webhook-name">Name</label>
            <div class="input-wrapper">
              <span class="round-icon">label</span>
              <input type="text" id="webhook-name" required maxlength="50" placeholder="My Webhook">
            </div>
          </div>
          <div class="form-group">
            <label for="webhook-url">Webhook URL</label>
            <div class="input-wrapper">
              <span class="round-icon">link</span>
              <input type="url" id="webhook-url" required placeholder="https://discord.com/api/webhooks/...">
            </div>
          </div>
          <div class="form-group">
            <label for="webhook-type">Type</label>
            <select id="webhook-type" class="select-input">
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
              <option value="generic">Generic (JSON)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Events</label>
            <div class="webhook-events-grid" id="webhook-events-grid"></div>
          </div>
          <div class="message" id="webhook-message"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-webhook-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Webhook</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  loadSettings();
  load2FAStatus();
  loadUserSessions();
  setupSessionsHandlers();
  loadSshKeys();
  setupSshKeysHandlers();
  loadApiKeys();
  setupApiKeysHandlers();
  loadWebhooks();
  setupWebhooksHandlers();
  
  const logoutBtn = app.querySelector('#logout-btn');
  logoutBtn.addEventListener('click', () => {
    clearAuth();
    window.router.navigateTo('/auth');
  });
  
  const themeGrid = app.querySelector('#theme-grid');
  themeGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.theme-card');
    if (!card) return;
    const theme = card.dataset.theme;
    saveTheme(theme);
    themeGrid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
  });
  
  const notificationsToggle = app.querySelector('#notifications-toggle');
  notificationsToggle.addEventListener('change', () => {
    saveSettings$1({ notifications: notificationsToggle.checked });
  });
  
  const modal = app.querySelector('#password-modal');
  const changePasswordBtn = app.querySelector('#change-password-btn');
  const closeModal = app.querySelector('#close-modal');
  const cancelModal = app.querySelector('#cancel-modal');
  const backdrop = modal.querySelector('.modal-backdrop');
  
  changePasswordBtn.addEventListener('click', () => {
    modal.classList.add('active');
  });
  
  const closeModalFn = () => {
    modal.classList.remove('active');
    modal.querySelector('form').reset();
    modal.querySelector('#password-message').textContent = '';
  };
  
  closeModal.addEventListener('click', closeModalFn);
  cancelModal.addEventListener('click', closeModalFn);
  backdrop.addEventListener('click', closeModalFn);
  
  const passwordForm = app.querySelector('#password-form');
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = passwordForm.querySelector('#current-password').value;
    const newPassword = passwordForm.querySelector('#new-password').value;
    const confirmPassword = passwordForm.querySelector('#confirm-password').value;
    const messageEl = passwordForm.querySelector('#password-message');
    const btn = passwordForm.querySelector('button[type="submit"]');
    
    if (newPassword !== confirmPassword) {
      messageEl.textContent = 'Passwords do not match';
      messageEl.className = 'message error';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await api('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        messageEl.textContent = data.error;
        messageEl.className = 'message error';
      } else {
        messageEl.textContent = 'Password updated successfully!';
        messageEl.className = 'message success';
        
        setTimeout(() => {
          closeModalFn();
        }, 1500);
      }
    } catch (err) {
      messageEl.textContent = 'Connection error. Please try again.';
      messageEl.className = 'message error';
    }
    
    btn.disabled = false;
    btn.innerHTML = 'Update Password';
  });
}

async function loadSettings() {
  try {
    const res = await fetch(`/api/user/profile?username=${encodeURIComponent(state$1.username)}`);
    const data = await res.json();
    
    if (data.user?.settings) {
      const { theme, notifications } = data.user.settings;
      
      const notificationsToggle = document.getElementById('notifications-toggle');
      
      if (theme) {
        setTheme(theme);
        const themeGrid = document.getElementById('theme-grid');
        if (themeGrid) {
          themeGrid.querySelectorAll('.theme-card').forEach(c => {
            c.classList.toggle('active', c.dataset.theme === theme);
          });
        }
      }
      if (notificationsToggle) notificationsToggle.checked = notifications !== false;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveSettings$1(settings) {
  try {
    await api('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

// ==================== 2FA ====================

async function load2FAStatus() {
  const toggle = document.getElementById('2fa-toggle');
  const description = document.getElementById('2fa-description');
  if (!toggle) return;
  
  try {
    const res = await api('/api/user/2fa');
    const data = await res.json();
    
    if (!data.mailConfigured) {
      toggle.disabled = true;
      description.textContent = 'Mail not configured by administrator';
      return;
    }
    
    if (!data.hasEmail) {
      toggle.disabled = true;
      description.textContent = 'Add an email address to enable 2FA';
      return;
    }
    
    if (!data.emailVerified) {
      toggle.disabled = true;
      description.textContent = 'Verify your email address to enable 2FA';
      return;
    }
    
    if (data.required) {
      toggle.checked = true;
      toggle.disabled = true;
      description.textContent = 'Required by administrator';
      return;
    }
    
    toggle.disabled = false;
    toggle.checked = data.enabled;
    description.textContent = 'Require email verification code on login';
    
    toggle.addEventListener('change', async () => {
      toggle.disabled = true;
      try {
        const res = await api('/api/user/2fa', {
          method: 'PUT',
          body: JSON.stringify({ enabled: toggle.checked })
        });
        const result = await res.json();
        if (result.error) {
          toggle.checked = !toggle.checked;
          description.textContent = result.error;
        }
      } catch (e) {
        toggle.checked = !toggle.checked;
      }
      toggle.disabled = false;
    });
  } catch (err) {
    console.error('Failed to load 2FA status:', err);
    toggle.disabled = true;
    description.textContent = 'Failed to load 2FA status';
  }
}

// ==================== SESSIONS ====================

async function loadUserSessions() {
  const container = document.getElementById('sessions-list');
  if (!container) return;
  
  try {
    const res = await api('/api/user/sessions');
    const data = await res.json();
    
    if (!data.sessions || data.sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state small">
          <span class="round-icon">devices</span>
          <p>No active sessions</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.sessions.map(session => `
      <div class="list-item session-item" data-id="${session.id}">
        <div class="item-header">
          <div class="item-icon">
            <span class="round-icon">${getDeviceIcon(session.userAgent)}</span>
          </div>
          <div class="item-info">
            <span class="item-name">${session.current ? 'Current Session' : escapeHtml(parseUserAgent(session.userAgent))}</span>
            <span class="item-meta">${escapeHtml(session.ip)} • ${formatSessionDate(session.createdAt)}</span>
          </div>
        </div>
        <div class="item-actions">
          ${session.current 
            ? '<span class="badge badge-success">Current</span>' 
            : `<button class="btn btn-icon btn-sm btn-danger revoke-session-btn" title="Revoke">
                <span class="round-icon">close</span>
              </button>`
          }
        </div>
      </div>
    `).join('');
    
    container.querySelectorAll('.revoke-session-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const item = e.target.closest('.session-item');
        const id = item.dataset.id;
        
        const confirmed = await confirm({ title: 'Revoke Session', message: 'This will sign out the device. Continue?', danger: true });
        if (!confirmed) return;
        
        btn.disabled = true;
        try {
          await api(`/api/user/sessions/${id}`, { method: 'DELETE' });
          loadUserSessions();
        } catch (err) {
          btn.disabled = false;
        }
      });
    });
    
  } catch (err) {
    container.innerHTML = '<div class="error">Failed to load sessions</div>';
  }
}

function setupSessionsHandlers() {
  const revokeAllBtn = document.getElementById('revoke-all-sessions-btn');
  if (!revokeAllBtn) return;
  
  revokeAllBtn.addEventListener('click', async () => {
    const confirmed = await confirm({ 
      title: 'Revoke All Sessions', 
      message: 'This will sign out all other devices. Your current session will remain active.', 
      danger: true 
    });
    if (!confirmed) return;
    
    revokeAllBtn.disabled = true;
    try {
      const res = await api('/api/user/sessions', { method: 'DELETE' });
      const data = await res.json();
      loadUserSessions();
    } catch (err) {
      console.error('Failed to revoke sessions:', err);
    }
    revokeAllBtn.disabled = false;
  });
}

function getDeviceIcon(ua) {
  if (!ua) return 'devices';
  const lower = ua.toLowerCase();
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return 'smartphone';
  if (lower.includes('tablet') || lower.includes('ipad')) return 'tablet';
  return 'computer';
}

function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') return 'Unknown Device';
  
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';
  
  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return os ? `${browser} on ${os}` : browser;
}

function formatSessionDate(isoStr) {
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

// ==================== SSH KEYS ====================

async function loadSshKeys() {
  const list = document.getElementById('ssh-keys-list');
  if (!list) return;
  
  try {
    const res = await api('/api/user/ssh-keys');
    const data = await res.json();
    const keys = data.keys || [];
    
    if (keys.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="round-icon">key</span>
          <p>No SSH keys added</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = keys.map(key => `
      <div class="api-key-item" data-id="${key.id}">
        <div class="api-key-info">
          <span class="api-key-name">${key.name}</span>
          <span class="api-key-meta">
            ${key.fingerprint}
            • Added ${new Date(key.created_at).toLocaleDateString()}
            ${key.last_used ? `• Last used ${new Date(key.last_used).toLocaleDateString()}` : ''}
          </span>
        </div>
        <button class="btn btn-icon btn-danger delete-ssh-key-btn" data-id="${key.id}">
          <span class="round-icon">delete</span>
        </button>
      </div>
    `).join('');
    
    list.querySelectorAll('.delete-ssh-key-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const confirmed = await confirm({ title: 'Delete SSH Key', message: 'Delete this SSH key?', danger: true });
        if (!confirmed) return;
        try {
          await api(`/api/user/ssh-keys/${btn.dataset.id}`, { method: 'DELETE' });
          loadSshKeys();
        } catch (e) {
          console.error('Failed to delete SSH key:', e);
        }
      };
    });
  } catch (e) {
    list.innerHTML = `
      <div class="empty-state error">
        <span class="round-icon">error</span>
        <p>Failed to load SSH keys</p>
      </div>
    `;
  }
}

function setupSshKeysHandlers() {
  const addBtn = document.getElementById('add-ssh-key-btn');
  if (!addBtn) return;
  
  addBtn.onclick = () => {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'ssh-key-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add SSH Key</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">
            <span class="round-icon">close</span>
          </button>
        </div>
        <form id="ssh-key-form">
          <div class="form-group">
            <label for="ssh-key-name-input">Key Name</label>
            <div class="input-wrapper">
              <span class="round-icon">label</span>
              <input type="text" id="ssh-key-name-input" name="name" required placeholder="My Laptop" maxlength="50">
            </div>
          </div>
          <div class="form-group">
            <label for="ssh-key-public-input">Public Key</label>
            <textarea id="ssh-key-public-input" name="public_key" required rows="5" placeholder="ssh-ed25519 AAAA... user@host"></textarea>
            <small class="form-hint">Paste your public key (id_ed25519.pub, id_rsa.pub, etc.)</small>
          </div>
          <div class="message" id="ssh-key-message"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Key</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#ssh-key-form').onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const messageEl = modal.querySelector('#ssh-key-message');
      const btn = e.target.querySelector('button[type="submit"]');
      
      btn.disabled = true;
      btn.innerHTML = '<span class="round-icon spinning">sync</span>';
      
      try {
        const res = await api('/api/user/ssh-keys', {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            public_key: form.get('public_key')
          })
        });
        
        const data = await res.json();
        
        if (data.error) {
          messageEl.textContent = data.error;
          messageEl.className = 'message error';
          btn.disabled = false;
          btn.textContent = 'Add Key';
        } else {
          modal.remove();
          loadSshKeys();
        }
      } catch (e) {
        messageEl.textContent = 'Failed to add key';
        messageEl.className = 'message error';
        btn.disabled = false;
        btn.textContent = 'Add Key';
      }
    };
  };
}

let availablePermissions = [];

async function loadApiKeys() {
  const list = document.getElementById('api-keys-list');
  
  try {
    const [keysRes, permsRes] = await Promise.all([
      api('/api/api-keys'),
      api('/api/api-keys/permissions')
    ]);
    
    const keysData = await keysRes.json();
    const permsData = await permsRes.json();
    
    availablePermissions = permsData.user || [];
    
    if (!keysData.keys || keysData.keys.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="round-icon">vpn_key</span>
          <p>No API keys yet</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = keysData.keys.map(key => `
      <div class="api-key-item" data-id="${key.id}">
        <div class="api-key-info">
          <span class="api-key-name">${key.name}</span>
          <span class="api-key-meta">
            Created ${new Date(key.createdAt).toLocaleDateString()}
            ${key.lastUsedAt ? `• Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : '• Never used'}
          </span>
        </div>
        <div class="api-key-permissions">
          ${key.permissions.slice(0, 3).map(p => `<span class="permission-tag">${p}</span>`).join('')}
          ${key.permissions.length > 3 ? `<span class="permission-tag">+${key.permissions.length - 3}</span>` : ''}
        </div>
        <button class="btn btn-icon btn-danger delete-api-key-btn" data-id="${key.id}">
          <span class="round-icon">delete</span>
        </button>
      </div>
    `).join('');
    
    list.querySelectorAll('.delete-api-key-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const confirmed = await confirm({ title: 'Delete API Key', message: 'Are you sure you want to delete this API key?', danger: true });
        if (!confirmed) return;
        
        try {
          await api(`/api/api-keys/${id}`, { method: 'DELETE' });
          loadApiKeys();
        } catch (err) {
          console.error('Failed to delete API key:', err);
        }
      });
    });
  } catch (err) {
    console.error('Failed to load API keys:', err);
    list.innerHTML = `
      <div class="empty-state error">
        <span class="round-icon">error</span>
        <p>Failed to load API keys</p>
      </div>
    `;
  }
}

function setupApiKeysHandlers() {
  const createBtn = document.getElementById('create-api-key-btn');
  const modal = document.getElementById('api-key-modal');
  const createdModal = document.getElementById('api-key-created-modal');
  const form = document.getElementById('api-key-form');
  const permissionsGrid = document.getElementById('permissions-grid');
  
  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
    document.getElementById('api-key-message').textContent = '';
  };
  
  const closeCreatedModal = () => {
    createdModal.classList.remove('active');
    loadApiKeys();
  };
  
  createBtn.addEventListener('click', () => {
    permissionsGrid.innerHTML = availablePermissions.map(p => `
      <label class="permission-checkbox">
        <input type="checkbox" name="permissions" value="${p}">
        <span>${p}</span>
      </label>
    `).join('');
    modal.classList.add('active');
  });
  
  modal.querySelector('#close-api-key-modal').addEventListener('click', closeModal);
  modal.querySelector('#cancel-api-key-modal').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  
  createdModal.querySelector('#close-api-key-created-modal').addEventListener('click', closeCreatedModal);
  createdModal.querySelector('#done-api-key-btn').addEventListener('click', closeCreatedModal);
  createdModal.querySelector('.modal-backdrop').addEventListener('click', closeCreatedModal);
  
  createdModal.querySelector('#copy-api-key-btn').addEventListener('click', () => {
    const token = document.getElementById('created-api-key-token').textContent;
    navigator.clipboard.writeText(token);
    const btn = createdModal.querySelector('#copy-api-key-btn');
    btn.innerHTML = '<span class="round-icon">check</span>';
    setTimeout(() => {
      btn.innerHTML = '<span class="round-icon">content_copy</span>';
    }, 2000);
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('api-key-name').value.trim();
    const checkboxes = form.querySelectorAll('input[name="permissions"]:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);
    const messageEl = document.getElementById('api-key-message');
    const btn = form.querySelector('button[type="submit"]');
    
    if (permissions.length === 0) {
      messageEl.textContent = 'Select at least one permission';
      messageEl.className = 'message error';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await api('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name, permissions })
      });
      
      const data = await res.json();
      
      if (data.error) {
        messageEl.textContent = data.error;
        messageEl.className = 'message error';
      } else {
        closeModal();
        document.getElementById('created-api-key-token').textContent = data.token;
        createdModal.classList.add('active');
      }
    } catch (err) {
      messageEl.textContent = 'Failed to create API key';
      messageEl.className = 'message error';
    }
    
    btn.disabled = false;
    btn.innerHTML = 'Create Key';
  });
}

// ==================== WEBHOOKS ====================

const WEBHOOK_EVENTS = [
  { id: 'server.created', label: 'Server Created' },
  { id: 'server.deleted', label: 'Server Deleted' },
  { id: 'server.started', label: 'Server Started' },
  { id: 'server.stopped', label: 'Server Stopped' },
  { id: 'server.crashed', label: 'Server Crashed' },
  { id: 'server.suspended', label: 'Server Suspended' },
  { id: 'server.backup.created', label: 'Backup Created' }
];

async function loadWebhooks() {
  const container = document.getElementById('webhooks-list');
  if (!container) return;
  
  try {
    const res = await api('/api/webhooks');
    const data = await res.json();
    
    if (!data.webhooks || data.webhooks.length === 0) {
      container.innerHTML = `
        <div class="empty-state small">
          <span class="round-icon">webhook</span>
          <p>No webhooks configured</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.webhooks.map(webhook => `
      <div class="list-item webhook-item" data-id="${webhook.id}">
        <div class="item-icon">
          <span class="round-icon">${getWebhookIcon(webhook.type)}</span>
        </div>
        <div class="item-info">
          <span class="item-name">${escapeHtml(webhook.name)}</span>
          <span class="item-meta">${webhook.type} • ${webhook.events.length} events</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-icon btn-sm test-webhook-btn" title="Test">
            <span class="round-icon">send</span>
          </button>
          <label class="toggle small">
            <input type="checkbox" class="toggle-webhook-btn" ${webhook.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <button class="btn btn-icon btn-sm btn-danger delete-webhook-btn" title="Delete">
            <span class="round-icon">delete</span>
          </button>
        </div>
      </div>
    `).join('');
    
    container.querySelectorAll('.delete-webhook-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const item = e.target.closest('.webhook-item');
        const id = item.dataset.id;
        const confirmed = await confirm({ title: 'Delete Webhook', message: 'Delete this webhook?', danger: true });
        if (!confirmed) return;
        
        try {
          await api(`/api/webhooks/${id}`, { method: 'DELETE' });
          loadWebhooks();
        } catch (err) {
          console.error('Failed to delete webhook:', err);
        }
      });
    });
    
    container.querySelectorAll('.test-webhook-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const item = e.target.closest('.webhook-item');
        const id = item.dataset.id;
        btn.disabled = true;
        btn.innerHTML = '<span class="round-icon spinning">sync</span>';
        
        try {
          const res = await api(`/api/webhooks/${id}/test`, { method: 'POST' });
          const data = await res.json();
          btn.innerHTML = '<span class="round-icon">check</span>';
          setTimeout(() => {
            btn.innerHTML = '<span class="round-icon">send</span>';
            btn.disabled = false;
          }, 2000);
        } catch (err) {
          btn.innerHTML = '<span class="round-icon">error</span>';
          setTimeout(() => {
            btn.innerHTML = '<span class="round-icon">send</span>';
            btn.disabled = false;
          }, 2000);
        }
      });
    });
    
    container.querySelectorAll('.toggle-webhook-btn').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const item = e.target.closest('.webhook-item');
        const id = item.dataset.id;
        
        try {
          await api(`/api/webhooks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ enabled: e.target.checked })
          });
        } catch (err) {
          e.target.checked = !e.target.checked;
        }
      });
    });
    
  } catch (err) {
    container.innerHTML = '<div class="error">Failed to load webhooks</div>';
  }
}

function getWebhookIcon(type) {
  switch (type) {
    case 'discord': return 'chat';
    case 'slack': return 'tag';
    default: return 'webhook';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupWebhooksHandlers() {
  const modal = document.getElementById('webhook-modal');
  const createBtn = document.getElementById('create-webhook-btn');
  const form = document.getElementById('webhook-form');
  const eventsGrid = document.getElementById('webhook-events-grid');
  
  if (!modal || !createBtn) return;
  
  // Populate events grid
  eventsGrid.innerHTML = WEBHOOK_EVENTS.map(event => `
    <label class="checkbox-item">
      <input type="checkbox" name="webhook-events" value="${event.id}">
      <span>${event.label}</span>
    </label>
  `).join('');
  
  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
    document.getElementById('webhook-message').textContent = '';
  };
  
  createBtn.addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('close-webhook-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-webhook-modal').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('webhook-name').value.trim();
    const url = document.getElementById('webhook-url').value.trim();
    const type = document.getElementById('webhook-type').value;
    const checkboxes = form.querySelectorAll('input[name="webhook-events"]:checked');
    const events = Array.from(checkboxes).map(cb => cb.value);
    const messageEl = document.getElementById('webhook-message');
    const btn = form.querySelector('button[type="submit"]');
    
    if (events.length === 0) {
      messageEl.textContent = 'Select at least one event';
      messageEl.className = 'message error';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await api('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({ name, url, type, events })
      });
      
      const data = await res.json();
      
      if (data.error) {
        messageEl.textContent = data.error;
        messageEl.className = 'message error';
      } else {
        closeModal();
        loadWebhooks();
      }
    } catch (err) {
      messageEl.textContent = 'Failed to create webhook';
      messageEl.className = 'message error';
    }
    
    btn.disabled = false;
    btn.innerHTML = 'Create Webhook';
  });
}

function renderNotFound() {
  const app = document.getElementById('app');
  app.className = 'notfound-page';
  
  app.innerHTML = `
    <div class="notfound-container">
      <div class="notfound-content">
        <span class="notfound-code">404</span>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/dashboard" class="btn btn-primary">
          <span class="round-icon">home</span>
          <span>Back to Dashboard</span>
        </a>
      </div>
    </div>
  `;
}

function renderUser(targetUsername) {
  const app = document.getElementById('app');
  app.className = 'user-page';
  
  app.innerHTML = `
    <div class="user-container">
      <div class="loading-state">
        <span class="round-icon spinning">sync</span>
        <span>Loading profile...</span>
      </div>
    </div>
  `;
  
  loadUserProfile(targetUsername);
}

async function loadUserProfile(targetUsername) {
  const container = document.querySelector('.user-container');
  const viewer = state$1.username;
  
  try {
    const res = await fetch(`/api/user/profile?username=${encodeURIComponent(targetUsername)}&viewer=${encodeURIComponent(viewer)}`);
    const data = await res.json();
    
    if (data.error) {
      container.innerHTML = `
        <div class="error-state">
          <span class="round-icon">error</span>
          <p>User not found</p>
          <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
        </div>
      `;
      return;
    }
    
    const user = data.user;
    const isPrivate = user.isPrivate;
    
    const avatarHtml = user.avatar ? 
      `<img src="${escapeUrl(user.avatar)}" alt="Avatar" onerror="this.src='/default-avatar.png'">` :
      `<img src="/default-avatar.png" alt="Avatar">`;
    
    container.innerHTML = `
      <div class="user-profile-card">
        <div class="user-header">
          <div class="user-avatar">
            ${avatarHtml}
          </div>
          <div class="user-info">
            <h1>${escapeHtml$1(user.displayName || user.username)}</h1>
            <span class="user-username">@${escapeHtml$1(user.username)}</span>
            ${isPrivate ? '<span class="private-badge"><span class="round-icon">lock</span> Private Profile</span>' : ''}
          </div>
        </div>
        
        ${!isPrivate && user.bio ? `
          <div class="user-bio">
            <h3>About</h3>
            <p>${escapeHtml$1(user.bio)}</p>
          </div>
        ` : ''}
        
        ${isPrivate ? `
          <div class="private-notice">
            <span class="round-icon">visibility_off</span>
            <p>This profile is private</p>
          </div>
        ` : ''}
        
        ${!isPrivate && user.createdAt ? `
          <div class="user-meta">
            <span class="round-icon">calendar_today</span>
            <span>Joined ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <span class="round-icon">wifi_off</span>
        <p>Connection error. Please try again.</p>
        <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
      </div>
    `;
  }
}

let container = null;

function ensureContainer() {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function toast(message, type = 'info', duration = 3000) {
  const cont = ensureContainer();
  
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  
  el.innerHTML = `
    <span class="round-icon">${icons[type] || 'info'}</span>
    <span class="toast-message">${escapeHtml$1(message)}</span>
    <button class="toast-close">
      <span class="round-icon">close</span>
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

function success(message, duration) {
  return toast(message, 'success', duration);
}

function error(message, duration) {
  return toast(message, 'error', duration);
}

function warning(message, duration) {
  return toast(message, 'warning', duration);
}

function info(message, duration) {
  return toast(message, 'info', duration);
}

let pollInterval$1 = null;
let statusSockets = new Map();

async function renderServers() {
  const app = document.getElementById('app');
  let canCreate = true;
  try {
    const limitsRes = await api(`/api/user/limits?username=${encodeURIComponent(state$1.username)}`);
    const limitsData = await limitsRes.json();
    canCreate = limitsData.canCreateServers !== false;
  } catch {}
  
  app.innerHTML = `
    <div class="servers-page">
      <div class="page-header">
        <div class="page-header-text">
          <h1>My Servers</h1>
          <p class="page-subtitle">Manage and monitor your game servers</p>
        </div>
        ${canCreate ? `
          <a href="/servers/create" class="btn btn-primary" id="create-server-btn">
            <span class="round-icon">add</span>
            Create Server
          </a>
        ` : ''}
      </div>
      
      <div class="servers-grid" id="servers-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  
  loadServers();
  
  pollInterval$1 = setInterval(loadServers, 10000);
}

async function loadServers() {
  const container = document.getElementById('servers-list');
  if (!container) return;
  
  try {
    const res = await api('/api/servers');
    const data = await res.json();
    
    if (data.servers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No servers yet</h3>
          <p>Create your first server to get started</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.servers.map(server => `
      <div class="server-card" data-id="${server.id}">
        <div class="server-card-header">
          <div class="server-card-title">
            <div class="server-icon">
              <span class="round-icon">dns</span>
            </div>
            <div class="server-name-wrap">
              <h3>${escapeHtml$1(server.name)}</h3>
              <span class="server-address">${server.node_address || `${server.allocation?.ip}:${server.allocation?.port}`}</span>
            </div>
          </div>
          <span class="status-badge status-loading" data-status-id="${server.id}">loading...</span>
        </div>
        <div class="server-card-body">
          <div class="server-resources">
            <div class="resource-chip">
              <span class="round-icon">memory</span>
              <span>${server.limits?.memory || 0} MB</span>
            </div>
            <div class="resource-chip">
              <span class="round-icon">storage</span>
              <span>${server.limits?.disk || 0} MB</span>
            </div>
            <div class="resource-chip">
              <span class="round-icon">speed</span>
              <span>${server.limits?.cpu || 0}%</span>
            </div>
          </div>
        </div>
        <div class="server-card-footer">
          <div class="power-actions">
            <button class="power-btn start" onclick="serverPower('${server.id}', 'start')" title="Start">
              <span class="round-icon">play_arrow</span>
            </button>
            <button class="power-btn restart" onclick="serverPower('${server.id}', 'restart')" title="Restart">
              <span class="round-icon">refresh</span>
            </button>
            <button class="power-btn stop" onclick="serverPower('${server.id}', 'stop')" title="Stop">
              <span class="round-icon">stop</span>
            </button>
          </div>
          <a href="/server/${server.id}" class="btn btn-primary btn-sm">
            <span class="round-icon">terminal</span>
            Console
          </a>
        </div>
      </div>
    `).join('');
    
    connectStatusSockets(data.servers);
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load servers</div>`;
  }
}

function connectStatusSockets(servers) {
  const token = getToken();
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  servers.forEach(server => {
    if (statusSockets.has(server.id)) return;
    
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/console?server=${server.id}&token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'auth success') {
          socket.send(JSON.stringify({ event: 'send stats', args: [null] }));
        } else if (message.event === 'status' && message.args?.[0]) {
          updateServerStatus$1(server.id, message.args[0]);
        }
      } catch (e) {}
    };
    
    socket.onclose = () => statusSockets.delete(server.id);
    statusSockets.set(server.id, socket);
  });
}

function updateServerStatus$1(serverId, status) {
  const el = document.querySelector(`[data-status-id="${serverId}"]`);
  if (!el) return;
  el.className = `status-badge status-${status}`;
  el.textContent = status;
}

window.serverPower = async function(serverId, action) {
  try {
    await api(`/api/servers/${serverId}/power`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    loadServers();
  } catch (e) {
    error('Failed to execute power action');
  }
};

function cleanupServers() {
  if (pollInterval$1) {
    clearInterval(pollInterval$1);
    pollInterval$1 = null;
  }
  statusSockets.forEach(socket => socket.close());
  statusSockets.clear();
}

let selectedNest = null;
let selectedEgg = null;
let nestsData$1 = null;
let limitsData = null;
let nodesData = null;
let selectedNode = null;
let currentResources = { memory: 512, disk: 1024 };

async function renderCreateServer() {
  const app = document.getElementById('app');
  const user = state$1.user;
  
  app.innerHTML = `
    <div class="create-server-page">
      <div class="page-header">
        <a href="/servers" class="back-link">
          <span class="round-icon">arrow_back</span>
          <span>Back to Servers</span>
        </a>
        <h1>Create Server</h1>
      </div>
      <div class="create-server-content">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  
  try {
    const [nestsRes, limitsRes, nodesRes] = await Promise.all([
      api('/api/servers/nests'),
      api(`/api/user/limits?username=${encodeURIComponent(user.username)}`),
      api('/api/servers/available-nodes')
    ]);
    
    nestsData$1 = await nestsRes.json();
    limitsData = await limitsRes.json();
    nodesData = await nodesRes.json();
    
    if (limitsData.canCreateServers === false) {
      document.querySelector('.create-server-content').innerHTML = `
        <div class="empty-state">
          <span class="round-icon">block</span>
          <p>Server creation is disabled</p>
          <p class="hint">Contact an administrator to create servers for you.</p>
          <a href="/servers" class="btn btn-primary">Go Back</a>
        </div>
      `;
      return;
    }
    
    if (!nestsData$1.nests || nestsData$1.nests.length === 0) {
      document.querySelector('.create-server-content').innerHTML = `
        <div class="empty-state">
          <span class="round-icon">egg_alt</span>
          <p>No eggs configured. Contact an administrator.</p>
          <a href="/servers" class="btn btn-primary">Go Back</a>
        </div>
      `;
      return;
    }
    
    if (!nodesData.nodes || nodesData.nodes.length === 0) {
      document.querySelector('.create-server-content').innerHTML = `
        <div class="empty-state">
          <span class="round-icon">dns</span>
          <p>No nodes available. Contact an administrator.</p>
          <a href="/servers" class="btn btn-primary">Go Back</a>
        </div>
      `;
      return;
    }
    
    const remaining = {
      servers: limitsData.limits.servers - limitsData.used.servers,
      memory: limitsData.limits.memory - limitsData.used.memory,
      disk: limitsData.limits.disk - limitsData.used.disk,
      cpu: limitsData.limits.cpu - limitsData.used.cpu,
      allocations: (limitsData.limits.allocations || 5) - (limitsData.used.allocations || 0)
    };
    
    if (remaining.servers <= 0) {
      document.querySelector('.create-server-content').innerHTML = `
        <div class="empty-state">
          <span class="round-icon">block</span>
          <p>Server limit reached (${limitsData.limits.servers} max)</p>
          <a href="/servers" class="btn btn-primary">Go Back</a>
        </div>
      `;
      return;
    }
    
    selectedNest = nestsData$1.nests[0];
    selectedEgg = selectedNest.eggs[0];
    selectedNode = nodesData.nodes[0];
    currentResources = { memory: Math.min(512, remaining.memory), disk: Math.min(1024, remaining.disk) };
    
    renderCreateForm(remaining);
    
  } catch (e) {
    console.error('Failed to load data:', e);
    document.querySelector('.create-server-content').innerHTML = `
      <div class="error">Failed to load data. Please try again.</div>
    `;
  }
}

function renderCreateForm(remaining) {
  const content = document.querySelector('.create-server-content');
  
  content.innerHTML = `
    <div class="create-server-layout">
      <div class="create-server-main">
        <div class="step-card">
          <div class="step-header">
            <span class="step-number">1</span>
            <h3>Select Egg</h3>
          </div>
          
          <div class="nest-tabs" id="nest-tabs">
            ${nestsData$1.nests.map((nest, idx) => `
              <button class="nest-tab ${idx === 0 ? 'active' : ''}" data-nest-id="${nest.id}">
                ${escapeHtml$1(nest.name)}
              </button>
            `).join('')}
          </div>
          
          <div class="eggs-grid" id="eggs-grid">
            ${renderEggsGrid(selectedNest)}
          </div>
        </div>
        
        <div class="step-card">
          <div class="step-header">
            <span class="step-number">2</span>
            <h3>Server Details</h3>
          </div>
          
          <form id="create-server-form">
            <div class="form-group">
              <label>Server Name</label>
              <input type="text" name="name" required placeholder="My Awesome Server" maxlength="50" />
            </div>
            
            <div class="form-group">
              <label>Description (optional)</label>
              <textarea name="description" rows="2" placeholder="What is this server for?"></textarea>
            </div>
            
            <div class="form-group">
              <label>Node</label>
              <input type="hidden" name="node_id" id="node-id-input" value="${nodesData.nodes[0]?.id || ''}" />
              <div class="nodes-grid" id="nodes-grid">
                ${renderNodesGrid(512, 1024)}
              </div>
            </div>
            
            <div class="form-section">
              <h4>Resources</h4>
              <div class="resources-grid">
                <div class="resource-input">
                  <label>
                    <span class="round-icon">memory</span>
                    Memory (MB)
                  </label>
                  <input type="number" name="memory" value="${Math.min(512, remaining.memory)}" min="${Math.min(8, remaining.memory)}" max="${remaining.memory}" required />
                  <span class="resource-hint">Max: ${remaining.memory} MB</span>
                </div>
                <div class="resource-input">
                  <label>
                    <span class="round-icon">storage</span>
                    Disk (MB)
                  </label>
                  <input type="number" name="disk" value="${Math.min(1024, remaining.disk)}" min="${Math.min(8, remaining.disk)}" max="${remaining.disk}" required />
                  <span class="resource-hint">Max: ${remaining.disk} MB</span>
                </div>
                <div class="resource-input">
                  <label>
                    <span class="round-icon">speed</span>
                    CPU (%)
                  </label>
                  <input type="number" name="cpu" value="${Math.min(100, remaining.cpu)}" min="${Math.min(5, remaining.cpu)}" max="${remaining.cpu}" required />
                  <span class="resource-hint">Max: ${remaining.cpu}%</span>
                </div>
                <div class="resource-input">
                  <label>
                    <span class="round-icon">lan</span>
                    Allocations
                  </label>
                  <input type="number" name="allocations" value="${Math.min(1, remaining.allocations)}" min="1" max="${remaining.allocations}" required />
                  <span class="resource-hint">Max: ${remaining.allocations}</span>
                </div>
              </div>
            </div>
            
            <div class="form-section" id="docker-image-section" style="display: none;">
              <h4>Docker Image</h4>
              <div class="form-group">
                <select name="docker_image" id="docker-image-select"></select>
              </div>
            </div>
            
            <div id="create-server-error" class="error-message" style="display: none;"></div>
            
            <div class="form-actions">
              <a href="/servers" class="btn btn-ghost">Cancel</a>
              <button type="submit" class="btn btn-primary btn-large" id="submit-btn">
                <span class="round-icon">add</span>
                Create Server
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div class="create-server-sidebar">
        <div class="sidebar-card">
          <h4>Selected Egg</h4>
          <div id="selected-egg-preview">
            ${renderEggPreview(selectedEgg)}
          </div>
        </div>
        
        <div class="sidebar-card">
          <h4>Available Resources</h4>
          <div class="limits-list">
            <div class="limit-row">
              <span>Servers</span>
              <span class="limit-value">${remaining.servers} remaining</span>
            </div>
            <div class="limit-row">
              <span>Memory</span>
              <span class="limit-value">${remaining.memory} MB</span>
            </div>
            <div class="limit-row">
              <span>Disk</span>
              <span class="limit-value">${remaining.disk} MB</span>
            </div>
            <div class="limit-row">
              <span>CPU</span>
              <span class="limit-value">${remaining.cpu}%</span>
            </div>
            <div class="limit-row">
              <span>Allocations</span>
              <span class="limit-value">${remaining.allocations}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  setupEventListeners(remaining);
  updateDockerImages();
}

function renderEggsGrid(nest) {
  if (!nest.eggs || nest.eggs.length === 0) {
    return '<div class="empty-eggs">No eggs in this category</div>';
  }
  
  return nest.eggs.map(egg => `
    <div class="egg-select-card ${egg.id === selectedEgg?.id ? 'selected' : ''}" data-egg-id="${egg.id}">
      <div class="egg-select-icon">
        ${renderEggIcon(egg)}
      </div>
      <div class="egg-select-info">
        <h4>${escapeHtml$1(egg.name)}</h4>
        <p>${escapeHtml$1(egg.description || 'No description')}</p>
      </div>
      <span class="egg-select-check round-icon">check_circle</span>
    </div>
  `).join('');
}

function renderEggIcon(egg) {
  if (!egg.icon) {
    return '<span class="round-icon">egg_alt</span>';
  }
  
  // Check if it's a Material Icon name
  if (!egg.icon.includes('/') && !egg.icon.includes('.')) {
    return `<span class="round-icon">${escapeHtml$1(egg.icon)}</span>`;
  }
  
  // Check if it's a URL (image)
  if (egg.icon.startsWith('http') || egg.icon.startsWith('/') || egg.icon.includes('.')) {
    return `<img src="${escapeHtml$1(egg.icon)}" alt="${escapeHtml$1(egg.name)}" onerror="this.outerHTML='<span class=\\'round-icon\\'>egg_alt</span>'" />`;
  }
  
  return '<span class="round-icon">egg_alt</span>';
}

function renderEggPreview(egg) {
  if (!egg) return '<p class="no-selection">No egg selected</p>';
  
  return `
    <div class="egg-preview">
      <div class="egg-preview-icon">
        ${renderEggIcon(egg)}
      </div>
      <div class="egg-preview-info">
        <h5>${escapeHtml$1(egg.name)}</h5>
        <p>${escapeHtml$1(egg.description || 'No description')}</p>
      </div>
    </div>
  `;
}

function renderNodesGrid(requestedMemory, requestedDisk) {
  if (!nodesData?.nodes || nodesData.nodes.length === 0) {
    return '<div class="empty-nodes">No nodes available</div>';
  }
  
  return nodesData.nodes.map(node => {
    const hasEnoughMemory = node.available_memory >= requestedMemory;
    const hasEnoughDisk = node.available_disk >= requestedDisk;
    const canFit = hasEnoughMemory && hasEnoughDisk;
    const isSelected = node.id === selectedNode?.id;
    
    const memoryPercent = Math.min(100, Math.round((requestedMemory / node.available_memory) * 100));
    const diskPercent = Math.min(100, Math.round((requestedDisk / node.available_disk) * 100));
    
    return `
      <div class="node-select-card ${isSelected ? 'selected' : ''} ${!canFit ? 'insufficient' : ''}" 
           data-node-id="${node.id}" 
           ${!canFit ? 'title="Insufficient resources"' : ''}>
        <div class="node-select-icon">
          <span class="round-icon">${canFit ? 'dns' : 'block'}</span>
        </div>
        <div class="node-select-info">
          <h4>${escapeHtml$1(node.name)}</h4>
          <div class="node-resources">
            <div class="node-resource ${!hasEnoughMemory ? 'exceeded' : ''}">
              <span class="resource-label">RAM</span>
              <div class="resource-bar">
                <div class="resource-fill" style="width: ${memoryPercent}%"></div>
              </div>
              <span class="resource-values">${requestedMemory} / ${node.available_memory} MB</span>
            </div>
            <div class="node-resource ${!hasEnoughDisk ? 'exceeded' : ''}">
              <span class="resource-label">Disk</span>
              <div class="resource-bar">
                <div class="resource-fill" style="width: ${diskPercent}%"></div>
              </div>
              <span class="resource-values">${requestedDisk} / ${node.available_disk} MB</span>
            </div>
          </div>
        </div>
        <span class="node-select-check round-icon">check_circle</span>
      </div>
    `;
  }).join('');
}

function updateNodesGrid() {
  const nodesGrid = document.getElementById('nodes-grid');
  if (nodesGrid) {
    nodesGrid.innerHTML = renderNodesGrid(currentResources.memory, currentResources.disk);
    setupNodeCardListeners();
  }
}

function setupEventListeners(remaining) {
  // Nest tabs
  document.querySelectorAll('.nest-tab').forEach(tab => {
    tab.onclick = () => {
      const nestId = tab.dataset.nestId;
      selectedNest = nestsData$1.nests.find(n => n.id === nestId);
      
      document.querySelectorAll('.nest-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      selectedEgg = selectedNest.eggs[0];
      
      document.getElementById('eggs-grid').innerHTML = renderEggsGrid(selectedNest);
      document.getElementById('selected-egg-preview').innerHTML = renderEggPreview(selectedEgg);
      
      setupEggCardListeners();
      updateDockerImages();
    };
  });
  
  setupEggCardListeners();
  setupNodeCardListeners();
  
  // Resource input listeners to update nodes grid
  const memoryInput = document.querySelector('input[name="memory"]');
  const diskInput = document.querySelector('input[name="disk"]');
  
  if (memoryInput) {
    memoryInput.addEventListener('input', () => {
      currentResources.memory = parseInt(memoryInput.value) || 0;
      updateNodesGrid();
    });
  }
  
  if (diskInput) {
    diskInput.addEventListener('input', () => {
      currentResources.disk = parseInt(diskInput.value) || 0;
      updateNodesGrid();
    });
  }
  
  // Form submit
  document.getElementById('create-server-form').onsubmit = async (e) => {
    e.preventDefault();
    await submitCreateServer(remaining);
  };
}

function setupNodeCardListeners() {
  document.querySelectorAll('.node-select-card:not(.insufficient)').forEach(card => {
    card.onclick = () => {
      const nodeId = card.dataset.nodeId;
      selectedNode = nodesData.nodes.find(n => n.id === nodeId);
      
      document.querySelectorAll('.node-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      document.getElementById('node-id-input').value = nodeId;
    };
  });
}

function setupEggCardListeners() {
  document.querySelectorAll('.egg-select-card').forEach(card => {
    card.onclick = () => {
      const eggId = card.dataset.eggId;
      selectedEgg = selectedNest.eggs.find(e => e.id === eggId);
      
      document.querySelectorAll('.egg-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      document.getElementById('selected-egg-preview').innerHTML = renderEggPreview(selectedEgg);
      updateDockerImages();
    };
  });
}

function updateDockerImages() {
  const section = document.getElementById('docker-image-section');
  const select = document.getElementById('docker-image-select');
  
  if (!selectedEgg?.docker_images || Object.keys(selectedEgg.docker_images).length <= 1) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  select.innerHTML = Object.entries(selectedEgg.docker_images).map(([label, image]) => 
    `<option value="${escapeHtml$1(image)}">${escapeHtml$1(label)}</option>`
  ).join('');
}

async function submitCreateServer(remaining) {
  const form = document.getElementById('create-server-form');
  const formData = new FormData(form);
  const errorEl = document.getElementById('create-server-error');
  const submitBtn = document.getElementById('submit-btn');
  
  // Validation
  const memory = parseInt(formData.get('memory'));
  const disk = parseInt(formData.get('disk'));
  const cpu = parseInt(formData.get('cpu'));
  const allocations = parseInt(formData.get('allocations')) || 1;
  
  if (memory > remaining.memory) {
    errorEl.textContent = `Memory exceeds limit (max: ${remaining.memory} MB)`;
    errorEl.style.display = 'block';
    return;
  }
  if (disk > remaining.disk) {
    errorEl.textContent = `Disk exceeds limit (max: ${remaining.disk} MB)`;
    errorEl.style.display = 'block';
    return;
  }
  if (cpu > remaining.cpu) {
    errorEl.textContent = `CPU exceeds limit (max: ${remaining.cpu}%)`;
    errorEl.style.display = 'block';
    return;
  }
  if (allocations > remaining.allocations) {
    errorEl.textContent = `Allocations exceeds limit (max: ${remaining.allocations})`;
    errorEl.style.display = 'block';
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="round-icon spinning">sync</span> Creating...';
  errorEl.style.display = 'none';
  
  try {
    const res = await api('/api/servers', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        description: formData.get('description'),
        node_id: formData.get('node_id'),
        egg_id: selectedEgg.id,
        docker_image: formData.get('docker_image') || null,
        memory,
        disk,
        cpu,
        allocations
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      success('Server created successfully');
      window.router.navigateTo('/servers');
    } else {
      errorEl.textContent = data.error || 'Failed to create server';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="round-icon">add</span> Create Server';
    }
  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="round-icon">add</span> Create Server';
  }
}

function cleanupCreateServer() {
  selectedNest = null;
  selectedEgg = null;
  nestsData$1 = null;
  limitsData = null;
  nodesData = null;
  selectedNode = null;
  currentResources = { memory: 512, disk: 1024 };
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatDate$4(dateString) {
  if (!dateString) return '--';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

let consoleSocket = null;
let terminal = null;
let fitAddon = null;
let resizeObserver = null;
let statusCallback = null;
let resourcesCallback = null;
let serverIdGetter = null;
let resizeTimeout = null;
let currentServerId$8 = null;

function setConsoleCallbacks(onStatus, onResources, getServerId) {
  statusCallback = onStatus;
  resourcesCallback = onResources;
  serverIdGetter = getServerId;
}

function renderConsoleTab() {
  return `
    <div class="console-tab">
      <div class="card console-card">
        <div class="console-terminal" id="console-terminal"></div>
        <div class="console-input">
          <input type="text" id="command-input" placeholder="> Type a command..." />
        </div>
      </div>
    </div>
  `;
}

function initConsoleTab(serverId) {
  if (currentServerId$8 === serverId && consoleSocket && consoleSocket.readyState === WebSocket.OPEN) {
    return;
  }
  
  cleanupConsoleTab();
  currentServerId$8 = serverId;
  
  initTerminal();
  connectWebSocket(serverId);
  
  document.getElementById('command-input').onkeypress = (e) => {
    if (e.key === 'Enter') sendCommand(serverId);
  };
}

function initTerminal() {
  const container = document.getElementById('console-terminal');
  if (!container) return;
  
  terminal = new xterm.Terminal({
    theme: {
      background: '#0a0a0c',
      foreground: '#c9d1d9',
      cursor: '#58a6ff',
      cursorAccent: '#0a0a0c',
      selectionBackground: '#264f78',
      black: '#484f58',
      red: '#ff7b72',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#b1bac4',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc'
    },
    fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Menlo", monospace',
    fontSize: 13,
    lineHeight: 1.4,
    cursorBlink: true,
    cursorStyle: 'bar',
    scrollback: 5000,
    convertEol: true,
    disableStdin: true,
    scrollOnUserInput: true,
    smoothScrollDuration: 100,
    overviewRuler: {
      showTopBorder: false
    }
  });
  
  terminal.attachCustomWheelEventHandler(() => false);
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    container.style.touchAction = 'pan-y';
    container.style.overscrollBehavior = 'contain';
    
    let touchStartY = 0;
    let scrolling = false;
    
    container.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      scrolling = true;
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
      if (!scrolling || !terminal) return;
      const touchY = e.touches[0].clientY;
      const delta = touchStartY - touchY;
      const lines = Math.round(delta / 20);
      
      if (lines !== 0) {
        terminal.scrollLines(lines);
        touchStartY = touchY;
      }
    }, { passive: true });
    
    container.addEventListener('touchend', () => {
      scrolling = false;
    }, { passive: true });
  }
  
  fitAddon = new addonFit.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new addonWebLinks.WebLinksAddon());
  
  terminal.open(container);
  
  requestAnimationFrame(() => {
    safeFit();
  });
  
  resizeObserver = new ResizeObserver(() => {
    debouncedFit();
  });
  resizeObserver.observe(container);
  
  window.addEventListener('resize', debouncedFit);
}

function safeFit() {
  if (!fitAddon || !terminal) return;
  
  const container = document.getElementById('console-terminal');
  if (!container) return;
  
  const dims = fitAddon.proposeDimensions();
  if (!dims || dims.cols <= 0 || dims.rows <= 0) return;
  if (dims.cols === terminal.cols && dims.rows === terminal.rows) return;
  
  terminal.resize(dims.cols, dims.rows);
}

function debouncedFit() {
  safeFit();
}

async function connectWebSocket(serverId) {
  const token = getToken();
  
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/console?server=${serverId}&token=${encodeURIComponent(token)}`;
  
  const ws = new WebSocket(wsUrl);
  consoleSocket = ws;
  
  ws.onopen = () => {
    // Connection established, auth handled by server
  };
  
  ws.onmessage = (event) => {
    if (consoleSocket !== ws) return;
    try {
      const message = JSON.parse(event.data);
      handleSocketMessage(message);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };
  
  ws.onclose = () => {
    if (consoleSocket !== ws) return;
    if (serverIdGetter && serverIdGetter() === serverId) {
      setTimeout(() => connectWebSocket(serverId), 5000);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (consoleSocket === ws) {
      writeError('Connection to the node failed. The node may be offline or unreachable.');
    }
  };
}

function handleSocketMessage(message) {
  const { event, args } = message;
  
  switch (event) {
    case 'auth success':
      if (terminal) terminal.clear();
      consoleSocket.send(JSON.stringify({ event: 'send logs', args: [null] }));
      consoleSocket.send(JSON.stringify({ event: 'send stats', args: [null] }));
      break;
      
    case 'console output':
      if (args && args[0] && terminal) {
        terminal.writeln(args[0]);
      }
      break;
      
    case 'status':
      if (args && args[0]) {
        writeStatus(args[0]);
        if (statusCallback) statusCallback(args[0]);
      }
      break;
      
    case 'stats':
      if (args && args[0] && resourcesCallback) {
        const stats = typeof args[0] === 'string' ? JSON.parse(args[0]) : args[0];
        resourcesCallback(stats);
      }
      break;
      
    case 'install output':
      if (args && args[0] && terminal) {
        terminal.writeln(`\x1b[33m${args[0]}\x1b[0m`);
      }
      break;
      
    case 'install started':
      writeInfo('installation started...');
      break;
      
    case 'install completed':
      writeInfo('installation completed');
      break;
      
    case 'daemon error':
      if (args && args[0]) {
        writeError(args[0]);
      }
      break;
      
    case 'daemon message':
      if (args && args[0]) {
        writeInfo(args[0]);
      }
      break;
      
    default:
      console.log('Unhandled WebSocket event:', event, args);
  }
}

function writeInfo(text) {
  if (terminal) {
    terminal.writeln(`\x1b[90m${text}\x1b[0m`);
  }
}

function writeStatus(status) {
  if (terminal) {
    const statusMessages = {
      'starting': 'server marked as starting',
      'running': 'server is now running',
      'stopping': 'server marked as stopping',
      'offline': 'server is now offline',
      'killing': 'server marked as killing'
    };
    const msg = statusMessages[status] || `server status: ${status}`;
    terminal.writeln(`\x1b[90m${msg}\x1b[0m`);
  }
}

function writeError(text) {
  if (terminal) {
    terminal.writeln(`\x1b[31m${text}\x1b[0m`);
  }
}

async function sendCommand(serverId) {
  const input = document.getElementById('command-input');
  const command = input.value.trim();
  if (!command) return;
  
  input.value = '';
  
  if (consoleSocket && consoleSocket.readyState === WebSocket.OPEN) {
    consoleSocket.send(JSON.stringify({
      event: 'send command',
      args: [command]
    }));
  } else {
    try {
      const res = await api(`/api/servers/${serverId}/command`, {
        method: 'POST',
        
        body: JSON.stringify({ command })
      });
      
      if (!res.ok) {
        const data = await res.json();
        writeError(data.error);
      }
    } catch (e) {
      writeError('Failed to send command');
    }
  }
}

function cleanupConsoleTab() {
  window.removeEventListener('resize', debouncedFit);
  
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
    resizeTimeout = null;
  }
  
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  if (terminal) {
    terminal.dispose();
    terminal = null;
  }
  
  if (fitAddon) {
    fitAddon = null;
  }
  
  if (consoleSocket) {
    consoleSocket.close();
    consoleSocket = null;
  }
  
  currentServerId$8 = null;
}

const languageMap = {
  'js': langJavascript.javascript,
  'jsx': () => langJavascript.javascript({ jsx: true }),
  'ts': () => langJavascript.javascript({ typescript: true }),
  'tsx': () => langJavascript.javascript({ jsx: true, typescript: true }),
  'mjs': langJavascript.javascript,
  'cjs': langJavascript.javascript,
  'json': langJson.json,
  'html': langHtml.html,
  'htm': langHtml.html,
  'css': langCss.css,
  'scss': langCss.css,
  'less': langCss.css,
  'py': langPython.python,
  'python': langPython.python,
  'java': langJava.java,
  'php': langPhp.php,
  'xml': langXml.xml,
  'svg': langXml.xml,
  'yaml': langYaml.yaml,
  'yml': langYaml.yaml,
  'md': langMarkdown.markdown,
  'markdown': langMarkdown.markdown
};

function getLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langFn = languageMap[ext];
  if (langFn) {
    return langFn();
  }
  return [];
}

function createEditor(container, content, filename, onSave) {
  const saveKeymap = view.keymap.of([{
    key: 'Mod-s',
    run: () => {
      if (onSave) onSave();
      return true;
    }
  }]);

  const state = state$3.EditorState.create({
    doc: content || '',
    extensions: [
      codemirror.basicSetup,
      themeOneDark.oneDark,
      saveKeymap,
      getLanguage(filename),
      codemirror.EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '13px'
        },
        '.cm-scroller': {
          fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", monospace',
          lineHeight: '1.5'
        },
        '.cm-gutters': {
          backgroundColor: '#0d1117',
          borderRight: '1px solid #21262d'
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#161b22'
        },
        '.cm-activeLine': {
          backgroundColor: '#161b2280'
        }
      }),
      codemirror.EditorView.lineWrapping
    ]
  });

  const view$1 = new codemirror.EditorView({
    state,
    parent: container
  });

  return {
    getValue: () => view$1.state.doc.toString(),
    setValue: (value) => {
      view$1.dispatch({
        changes: { from: 0, to: view$1.state.doc.length, insert: value }
      });
    },
    destroy: () => view$1.destroy(),
    focus: () => view$1.focus()
  };
}

let currentPath = '/';
let currentServerId$7 = null;
let progressSocket = null;
let activeProgressIndicators = new Map();
let isEditing = false;
let editingPath = null;
let selectedFiles = new Set();
let editorInstance = null;
let viewMode = 'list';
let sortBy = 'name';
let sortOrder = 'asc';
let searchQuery = '';
let searchTimeout$1 = null;

const clipboard = {
  files: [],
  operation: null,
  sourceDir: null,
  serverId: null
};

const EDITABLE_MIMETYPES = [
  'text/', 'application/json', 'application/xml', 'application/javascript',
  'application/x-yaml', 'application/toml', 'application/x-sh',
  'application/x-httpd-php', 'application/sql', 'application/x-lua',
  'inode/x-empty'
];

const ARCHIVE_MIMETYPES = [
  'application/zip', 'application/x-tar', 'application/gzip', 
  'application/x-gzip', 'application/x-rar', 'application/x-7z-compressed',
  'application/x-compressed-tar', 'application/x-bzip2'
];

const PREVIEW_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3'],
  pdf: ['application/pdf']
};

function connectProgressSocket(serverId) {
  if (progressSocket && progressSocket.readyState === WebSocket.OPEN) {
    return;
  }
  
  const token = getToken();
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/console?server=${serverId}&token=${encodeURIComponent(token)}`;
  
  progressSocket = new WebSocket(wsUrl);
  
  progressSocket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleProgressEvent(message);
    } catch (e) {}
  };
  
  progressSocket.onerror = () => {};
}

function handleProgressEvent(message) {
  const { event, args } = message;
  
  if (!args || !args[0]) return;
  const data = args[0];
  
  switch (event) {
    case 'compress progress': {
      const indicator = activeProgressIndicators.get('compress');
      if (indicator) {
        indicator.update(data.percent, `${data.processed_files}/${data.total_files} files`);
        indicator.hasProgress = true;
      }
      break;
    }
    
    case 'compress completed': {
      const indicator = activeProgressIndicators.get('compress');
      if (indicator) {
        indicator.complete(data.success, data.error);
        activeProgressIndicators.delete('compress');
      }
      break;
    }
    
    case 'decompress progress': {
      const indicator = activeProgressIndicators.get('decompress');
      if (indicator) {
        indicator.update(data.percent, data.current_file ? data.current_file.split('/').pop() : '');
        indicator.hasProgress = true;
      }
      break;
    }
    
    case 'decompress completed': {
      const indicator = activeProgressIndicators.get('decompress');
      if (indicator) {
        indicator.complete(data.success, data.error);
        activeProgressIndicators.delete('decompress');
      }
      break;
    }
  }
}

function showCompressIndicator() {
  const filesList = document.getElementById('files-list');
  
  const el = document.createElement('div');
  el.className = 'file-item compress-indicator';
  el.innerHTML = `
    <div class="file-select"></div>
    <div class="file-icon">
      <span class="round-icon rotating">archive</span>
    </div>
    <div class="file-info">
      <span class="file-name">Compressing files...</span>
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: 0%"></div>
      </div>
      <span class="file-meta compress-percent">Preparing...</span>
    </div>
  `;
  
  filesList.insertBefore(el, filesList.firstChild);
  
  return {
    hasProgress: false,
    update: (percent, detail) => {
      const bar = el.querySelector('.upload-progress-bar');
      const text = el.querySelector('.compress-percent');
      if (bar) bar.style.width = `${percent}%`;
      if (text) text.textContent = detail ? `Compressing... ${percent}% - ${detail}` : `Compressing... ${percent}%`;
    },
    complete: (success$1, error$1) => {
      el.remove();
      if (success$1) {
        success('Compressed successfully');
        loadFiles(currentServerId$7, currentPath);
      } else {
        error(error$1 || 'Failed to compress');
      }
    },
    remove: () => el.remove()
  };
}

function showDecompressIndicator(filename) {
  const filesList = document.getElementById('files-list');
  
  const el = document.createElement('div');
  el.className = 'file-item decompress-indicator';
  el.innerHTML = `
    <div class="file-select"></div>
    <div class="file-icon">
      <span class="round-icon rotating">unarchive</span>
    </div>
    <div class="file-info">
      <span class="file-name">Extracting ${filename}...</span>
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: 0%"></div>
      </div>
      <span class="file-meta decompress-percent">Preparing...</span>
    </div>
  `;
  
  filesList.insertBefore(el, filesList.firstChild);
  
  return {
    hasProgress: false,
    update: (percent, currentFile) => {
      const bar = el.querySelector('.upload-progress-bar');
      const text = el.querySelector('.decompress-percent');
      if (bar) bar.style.width = `${percent}%`;
      if (text) text.textContent = currentFile ? `Extracting... ${percent}% - ${currentFile}` : `Extracting... ${percent}%`;
    },
    complete: (success$1, error$1) => {
      el.remove();
      if (success$1) {
        success('Extracted successfully');
        loadFiles(currentServerId$7, currentPath);
      } else {
        error(error$1 || 'Failed to extract');
      }
    },
    remove: () => el.remove()
  };
}

function isArchive(file) {
  const mime = (file.mimetype || file.mime || '').toLowerCase();
  
  if (mime) {
    if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript') {
      return false;
    }
    if (ARCHIVE_MIMETYPES.some(m => mime.includes(m.replace('application/', '')))) return true;
  }
  
  if (!mime) {
    const name = file.name.toLowerCase();
    return name.endsWith('.zip') || name.endsWith('.tar') || name.endsWith('.tar.gz') || 
           name.endsWith('.tgz') || name.endsWith('.gz') || name.endsWith('.rar') || name.endsWith('.7z');
  }
  
  return false;
}

function isEditable(file) {
  const mime = (file.mimetype || file.mime || '').toLowerCase();
  
  if (mime) {
    if (EDITABLE_MIMETYPES.some(m => mime.startsWith(m))) return true;
    if (mime === 'inode/x-empty') return true;
    if (ARCHIVE_MIMETYPES.some(m => mime.includes(m.replace('application/', '')))) return false;
    if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) return false;
    if (mime === 'application/octet-stream') return false;
  }
  
  const ext = file.name.split('.').pop().toLowerCase();
  const textExts = ['txt', 'log', 'md', 'json', 'yml', 'yaml', 'toml', 'xml', 'js', 'ts', 'jsx', 'tsx', 
    'css', 'scss', 'less', 'html', 'htm', 'php', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
    'sh', 'bash', 'bat', 'ps1', 'cmd', 'properties', 'cfg', 'conf', 'ini', 'env', 'sql', 'lua', 
    'go', 'rs', 'swift', 'kt', 'gradle'];
  return textExts.includes(ext) || !file.name.includes('.');
}

function isPreviewable(file) {
  const mime = (file.mimetype || file.mime || '').toLowerCase();
  if (!mime) {
    const ext = file.name.split('.').pop().toLowerCase();
    const previewExts = { 
      'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'webp': 'image', 'svg': 'image',
      'mp4': 'video', 'webm': 'video', 'ogg': 'audio', 'mp3': 'audio', 'wav': 'audio', 'pdf': 'pdf'
    };
    return previewExts[ext] || null;
  }
  for (const [type, mimes] of Object.entries(PREVIEW_TYPES)) {
    if (mimes.some(m => mime.startsWith(m.split('/')[0] + '/') || mime === m)) return type;
  }
  return null;
}

function getFileIcon(file) {
  const mime = (file.mimetype || file.mime || '').toLowerCase();
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (mime.startsWith('text/')) {
    if (mime.includes('html')) return 'html';
    if (mime.includes('css')) return 'css';
    if (mime.includes('javascript')) return 'javascript';
    return 'description';
  }
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'movie';
  if (mime.startsWith('audio/')) return 'audio_file';
  if (mime === 'application/json') return 'data_object';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime === 'application/zip' || mime.includes('compressed') || mime.includes('tar') || mime.includes('gzip')) return 'folder_zip';
  if (mime === 'application/java-archive') return 'inventory_2';
  if (mime === 'application/x-sh' || mime === 'application/x-shellscript') return 'terminal';
  if (mime.includes('xml') || mime.includes('yaml')) return 'settings';
  
  const icons = {
    'js': 'javascript', 'ts': 'javascript', 'json': 'data_object',
    'html': 'html', 'css': 'css', 'scss': 'css',
    'md': 'description', 'txt': 'description', 'log': 'description',
    'yml': 'settings', 'yaml': 'settings', 'toml': 'settings',
    'properties': 'settings', 'cfg': 'settings', 'conf': 'settings',
    'jar': 'inventory_2', 'zip': 'folder_zip', 'tar': 'folder_zip', 'gz': 'folder_zip',
    'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'svg': 'image',
    'sh': 'terminal', 'bat': 'terminal', 'ps1': 'terminal',
    'pdf': 'picture_as_pdf', 'mp3': 'audio_file', 'mp4': 'movie', 'avi': 'movie'
  };
  return icons[ext] || 'insert_drive_file';
}

function renderFilesTab() {
  return `
    <div class="files-tab">
      <div class="card">
        <div class="files-toolbar">
          <div class="files-breadcrumb" id="files-breadcrumb">
            <span class="breadcrumb-item" data-path="/">/</span>
          </div>
          <div class="files-actions">
            <div class="files-search-wrapper" id="files-search-wrapper">
              <button class="btn btn-xs btn-ghost" id="btn-search-toggle" title="Search">
                <span class="round-icon">search</span>
              </button>
              <input type="text" class="files-search-input" id="files-search-input" placeholder="Search files..." style="display:none;">
            </div>
            <button class="btn btn-xs btn-ghost" id="btn-sort" title="Sort">
              <span class="round-icon">sort</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-view-toggle" title="Toggle view">
              <span class="round-icon">grid_view</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-refresh" title="Refresh">
              <span class="round-icon">refresh</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-new-folder" title="New Folder">
              <span class="round-icon">create_new_folder</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-new-file" title="New File">
              <span class="round-icon">note_add</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-upload" title="Upload">
              <span class="round-icon">upload</span>
            </button>
          </div>
        </div>
        <div class="files-selection-bar" id="files-selection-bar" style="display: none;">
          <div class="selection-info">
            <span id="selection-count">0</span> selected
          </div>
          <div class="selection-actions">
            <button class="btn btn-xs btn-ghost" id="btn-copy-clipboard" title="Copy">
              <span class="round-icon">content_copy</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-cut-clipboard" title="Cut">
              <span class="round-icon">content_cut</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-move" title="Move">
              <span class="round-icon">drive_file_move</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-compress" title="Compress">
              <span class="round-icon">archive</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-delete-selected" title="Delete">
              <span class="round-icon">delete</span>
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-clear-selection" title="Clear">
              <span class="round-icon">close</span>
            </button>
          </div>
        </div>
        <div class="files-paste-bar" id="files-paste-bar" style="display: none;">
          <div class="selection-info">
            <span id="paste-info">0 file(s) in clipboard</span>
          </div>
          <div class="selection-actions">
            <button class="btn btn-xs btn-ghost" id="btn-paste" title="Paste here">
              <span class="round-icon">content_paste</span>
              Paste
            </button>
            <button class="btn btn-xs btn-ghost" id="btn-cancel-paste" title="Cancel">
              <span class="round-icon">close</span>
            </button>
          </div>
        </div>
        <div class="files-list" id="files-list">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;
}

function initFilesTab(serverId) {
  currentPath = '/';
  currentServerId$7 = serverId;
  isEditing = false;
  editingPath = null;
  selectedFiles.clear();
  searchQuery = '';
  loadFiles(serverId, currentPath);
  
  document.getElementById('btn-refresh').onclick = () => loadFiles(serverId, currentPath);
  document.getElementById('btn-new-folder').onclick = () => createNewFolder(serverId);
  document.getElementById('btn-new-file').onclick = () => createNewFile(serverId);
  document.getElementById('btn-upload').onclick = () => uploadFile(serverId);
  
  document.getElementById('btn-move').onclick = () => moveSelectedFiles(serverId);
  document.getElementById('btn-compress').onclick = () => compressSelectedFiles(serverId);
  document.getElementById('btn-delete-selected').onclick = () => deleteSelectedFiles(serverId);
  document.getElementById('btn-clear-selection').onclick = () => clearSelection();
  
  document.getElementById('btn-copy-clipboard').onclick = () => clipboardCopy(serverId);
  document.getElementById('btn-cut-clipboard').onclick = () => clipboardCut(serverId);
  document.getElementById('btn-paste').onclick = () => clipboardPaste(serverId);
  document.getElementById('btn-cancel-paste').onclick = () => clipboardClear();

  const searchToggle = document.getElementById('btn-search-toggle');
  const searchInput = document.getElementById('files-search-input');
  searchToggle.onclick = () => {
    const visible = searchInput.style.display !== 'none';
    searchInput.style.display = visible ? 'none' : 'inline-block';
    if (!visible) searchInput.focus();
    else { searchInput.value = ''; searchQuery = ''; loadFiles(serverId, currentPath); }
  };
  searchInput.oninput = () => {
    clearTimeout(searchTimeout$1);
    searchTimeout$1 = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      if (searchQuery.length >= 2) {
        searchFiles(serverId, searchQuery);
      } else if (searchQuery.length === 0) {
        loadFiles(serverId, currentPath);
      }
    }, 300);
  };

  document.getElementById('btn-sort').onclick = () => showSortMenu(serverId);
  document.getElementById('btn-view-toggle').onclick = () => toggleViewMode(serverId);

  initKeyboardShortcuts(serverId);
  initDragDrop(serverId);
}

function initKeyboardShortcuts(serverId) {
  const handler = (e) => {
    if (isEditing) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.ctrlKey && e.key === 'c') {
      if (selectedFiles.size > 0) { e.preventDefault(); clipboardCopy(serverId); }
    }
    if (e.ctrlKey && e.key === 'x') {
      if (selectedFiles.size > 0) { e.preventDefault(); clipboardCut(serverId); }
    }
    if (e.ctrlKey && e.key === 'v') {
      if (clipboard.files.length > 0) { e.preventDefault(); clipboardPaste(serverId); }
    }
    if (e.key === 'Delete' && selectedFiles.size > 0) {
      deleteSelectedFiles(serverId);
    }
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      selectAll();
    }
    if (e.key === 'F2' && selectedFiles.size === 1) {
      renameFile(serverId, [...selectedFiles][0]);
    }
  };

  document.addEventListener('keydown', handler);
  window._filesKeyboardHandler = handler;
}

function initDragDrop(serverId) {
  const filesList = document.getElementById('files-list');
  if (!filesList) return;

  filesList.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      filesList.classList.add('drag-over');
    }
  });

  filesList.addEventListener('dragleave', (e) => {
    if (!filesList.contains(e.relatedTarget)) {
      filesList.classList.remove('drag-over');
    }
  });

  filesList.addEventListener('drop', async (e) => {
    e.preventDefault();
    filesList.classList.remove('drag-over');

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const files = [];
    const promises = [];

    for (const item of items) {
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) promises.push(traverseEntry(entry, '', files));
      } else if (item.kind === 'file') {
        files.push({ file: item.getAsFile(), path: '' });
      }
    }

    await Promise.all(promises);
    if (files.length > 0) {
      uploadMultipleFiles(serverId, files);
    }
  });
}

async function traverseEntry(entry, basePath, files) {
  if (entry.isFile) {
    const file = await new Promise(r => entry.file(r));
    files.push({ file, path: basePath });
  } else if (entry.isDirectory) {
    const reader = entry.createDirectoryReader();
    const entries = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    for (const child of entries) {
      await traverseEntry(child, `${basePath}/${entry.name}`, files);
    }
  }
}

async function uploadMultipleFiles(serverId, fileList) {
  const queue = [...fileList];
  const MAX_CONCURRENT = 3;
  const indicators = new Map();

  for (const item of fileList) {
    indicators.set(item, showUploadIndicator(item.file.name));
  }

  let active = 0;

  function processNext() {
    while (active < MAX_CONCURRENT && queue.length > 0) {
      const item = queue.shift();
      active++;
      uploadSingleFileFromQueue(serverId, item, indicators.get(item)).then(() => {
        active--;
        indicators.get(item).remove();
        if (queue.length === 0 && active === 0) {
          loadFiles(serverId, currentPath);
        } else {
          processNext();
        }
      }).catch(() => {
        active--;
        indicators.get(item).remove();
        processNext();
      });
    }
  }

  processNext();
}

async function uploadSingleFileFromQueue(serverId, item, indicator) {
  const res = await api(`/api/servers/${serverId}/files/upload`, {
    method: 'POST',
    body: JSON.stringify({ path: currentPath })
  });

  const data = await res.json();
  if (!res.ok || !data.url) {
    error(`Failed to upload ${item.file.name}`);
    return;
  }

  let uploadDir = currentPath === '/' ? '' : currentPath.replace(/^\//, '');
  if (item.path) {
    uploadDir = uploadDir ? `${uploadDir}${item.path}` : item.path.replace(/^\//, '');
  }
  const uploadUrl = `${data.url}&directory=${encodeURIComponent(uploadDir)}`;

  const formData = new FormData();
  formData.append('files', item.file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        indicator.update(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        error(`Failed to upload ${item.file.name}`);
        reject();
      }
    };

    xhr.onerror = () => {
      error(`Failed to upload ${item.file.name}`);
      reject();
    };

    xhr.send(formData);
  });
}

function clipboardCopy(serverId) {
  clipboard.files = [...selectedFiles];
  clipboard.operation = 'copy';
  clipboard.sourceDir = currentPath;
  clipboard.serverId = serverId;
  success(`${clipboard.files.length} file(s) copied`);
  clearSelection();
  updatePasteBar();
}

function clipboardCut(serverId) {
  clipboard.files = [...selectedFiles];
  clipboard.operation = 'cut';
  clipboard.sourceDir = currentPath;
  clipboard.serverId = serverId;
  success(`${clipboard.files.length} file(s) cut`);
  clearSelection();
  updatePasteBar();
}

function clipboardClear() {
  clipboard.files = [];
  clipboard.operation = null;
  clipboard.sourceDir = null;
  clipboard.serverId = null;
  updatePasteBar();
}

function updatePasteBar() {
  const bar = document.getElementById('files-paste-bar');
  const info = document.getElementById('paste-info');
  if (!bar) return;
  if (clipboard.files.length > 0) {
    bar.style.display = 'flex';
    info.textContent = `${clipboard.files.length} file(s) ${clipboard.operation === 'cut' ? 'cut' : 'copied'}`;
  } else {
    bar.style.display = 'none';
  }
}

async function clipboardPaste(serverId) {
  if (clipboard.files.length === 0) return;

  try {
    const res = await api(`/api/servers/${serverId}/files/paste`, {
      method: 'POST',
      body: JSON.stringify({
        files: clipboard.files,
        sourceDir: clipboard.sourceDir,
        destDir: currentPath,
        operation: clipboard.operation
      })
    });

    if (res.ok) {
      success(`${clipboard.files.length} file(s) ${clipboard.operation === 'cut' ? 'moved' : 'copied'}`);
      if (clipboard.operation === 'cut') clipboardClear();
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Paste failed');
    }
  } catch (e) {
    error('Paste failed');
  }
}

function selectAll() {
  document.querySelectorAll('.file-item:not(.upload-indicator):not(.compress-indicator):not(.decompress-indicator)').forEach(item => {
    const name = item.dataset.name;
    if (name) {
      selectedFiles.add(name);
      item.classList.add('selected');
      const cb = item.querySelector('.file-checkbox');
      if (cb) cb.checked = true;
    }
  });
  updateSelectionBar();
}

function showSortMenu(serverId) {
  const options = [
    { label: 'Name', value: 'name' },
    { label: 'Size', value: 'size' },
    { label: 'Modified', value: 'modified' }
  ];

  const current = options.find(o => o.value === sortBy);
  const menuHtml = options.map(o => 
    `<div class="sort-option ${o.value === sortBy ? 'active' : ''}" data-sort="${o.value}">
      ${o.label} ${o.value === sortBy ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
    </div>`
  ).join('');

  const btn = document.getElementById('btn-sort');
  const rect = btn.getBoundingClientRect();

  let existing = document.querySelector('.sort-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.className = 'sort-menu';
  menu.innerHTML = menuHtml;
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  document.body.appendChild(menu);

  menu.querySelectorAll('.sort-option').forEach(opt => {
    opt.onclick = () => {
      const val = opt.dataset.sort;
      if (val === sortBy) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy = val;
        sortOrder = 'asc';
      }
      menu.remove();
      loadFiles(serverId, currentPath);
    };
  });

  const close = (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.remove();
      document.removeEventListener('click', close);
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function toggleViewMode(serverId) {
  viewMode = viewMode === 'list' ? 'grid' : 'list';
  const btn = document.getElementById('btn-view-toggle');
  const icon = btn.querySelector('.round-icon');
  icon.textContent = viewMode === 'list' ? 'grid_view' : 'view_list';
  loadFiles(serverId, currentPath);
}

async function searchFiles(serverId, query) {
  const filesList = document.getElementById('files-list');
  filesList.innerHTML = '<div class="files-loading">Searching...</div>';

  try {
    const res = await api(`/api/servers/${serverId}/files/search?query=${encodeURIComponent(query)}&directory=${encodeURIComponent(currentPath)}`);
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      filterFilesLocally(serverId, query);
      return;
    }

    const data = await res.json();

    if (data.error) {
      filesList.innerHTML = `<div class="files-error">${data.error}</div>`;
      return;
    }

    const results = data.results || [];
    if (results.length === 0) {
      filesList.innerHTML = '<div class="files-empty">No files found</div>';
      return;
    }

    renderFilesList(results.map(f => ({ ...f, _searchResult: true })), serverId);
  } catch (e) {
    filterFilesLocally(serverId, query);
  }
}

async function filterFilesLocally(serverId, query) {
  const filesList = document.getElementById('files-list');
  try {
    const res = await api(`/api/servers/${serverId}/files/list?path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    if (data.error) {
      filesList.innerHTML = `<div class="files-error">${data.error}</div>`;
      return;
    }
    const files = (data.files || []).filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
    if (files.length === 0) {
      filesList.innerHTML = '<div class="files-empty">No files found</div>';
      return;
    }
    renderFilesList(files.map(f => ({ ...f, _searchResult: true })), serverId);
  } catch {
    filesList.innerHTML = '<div class="files-error">Search failed</div>';
  }
}

function updateSelectionBar() {
  const bar = document.getElementById('files-selection-bar');
  const count = document.getElementById('selection-count');
  if (selectedFiles.size > 0) {
    bar.style.display = 'flex';
    count.textContent = selectedFiles.size;
  } else {
    bar.style.display = 'none';
  }
}

function clearSelection() {
  selectedFiles.clear();
  document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
  updateSelectionBar();
}

async function loadFiles(serverId, path) {
  const filesList = document.getElementById('files-list');
  
  filesList.innerHTML = '<div class="loading-spinner"></div>';
  selectedFiles.clear();
  updateSelectionBar();
  updatePasteBar();
  
  try {
    const res = await api(`/api/servers/${serverId}/files/list?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    
    if (data.error) {
      filesList.innerHTML = `<div class="files-error">${data.error}</div>`;
      return;
    }
    
    currentPath = path;
    updateBreadcrumb(path, serverId);
    renderFilesList(data.files || [], serverId);
  } catch (e) {
    console.error('Failed to load files:', e);
    const isNodeError = e.message?.includes('node') || e.message?.includes('connect') || e.message?.includes('offline');
    const msg = isNodeError 
      ? '<span class="round-icon" style="font-size:20px;vertical-align:middle;margin-right:6px">cloud_off</span>Cannot connect to the node. Please try again later.'
      : 'Failed to load files';
    filesList.innerHTML = `<div class="files-error">${msg}</div>`;
  }
}

function updateBreadcrumb(path, serverId) {
  const breadcrumb = document.getElementById('files-breadcrumb');
  const parts = path.split('/').filter(p => p);
  
  let html = `<span class="breadcrumb-item clickable" data-path="/"><span class="round-icon" style="font-size: 16px; vertical-align: middle;">home</span></span>`;
  
  if (parts.length === 0) {
  } else if (parts.length === 1) {
    html += `<span class="breadcrumb-separator">/</span>`;
    html += `<span class="breadcrumb-item" data-path="/${parts[0]}">${parts[0]}</span>`;
  } else {
    const lastPath = '/' + parts.join('/');
    html += `<span class="breadcrumb-separator">/</span>`;
    html += `<span class="breadcrumb-ellipsis">...</span>`;
    html += `<span class="breadcrumb-separator">/</span>`;
    html += `<span class="breadcrumb-item" data-path="${lastPath}">${parts[parts.length - 1]}</span>`;
  }
  
  breadcrumb.innerHTML = html;
  
  breadcrumb.querySelectorAll('.breadcrumb-item.clickable').forEach(item => {
    item.onclick = () => loadFiles(serverId, item.dataset.path);
  });
}

function isDirectory(file) {
  if (typeof file.is_file === 'boolean') return !file.is_file;
  if (typeof file.is_directory === 'boolean') return file.is_directory;
  if (typeof file.directory === 'boolean') return file.directory;
  if (file.mime === 'inode/directory') return true;
  return false;
}

function sortFiles(files) {
  const dirs = files.filter(f => isDirectory(f));
  const fileList = files.filter(f => !isDirectory(f));

  const sorter = (a, b) => {
    let cmp;
    switch (sortBy) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'size': cmp = (a.size || 0) - (b.size || 0); break;
      case 'modified': cmp = new Date(a.modified_at || 0) - new Date(b.modified_at || 0); break;
      default: cmp = 0;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  };

  return [...dirs.sort(sorter), ...fileList.sort(sorter)];
}

function renderFilesList(files, serverId) {
  const filesList = document.getElementById('files-list');
  
  if (files.length === 0) {
    filesList.innerHTML = `<div class="files-empty">
      <span class="round-icon" style="font-size: 2rem; margin-bottom: .5rem;">folder_open</span>
      <p>This directory is empty</p>
      <p style="font-size: .7rem; margin-top: .25rem;">Drag files here or use the upload button</p>
    </div>`;
    return;
  }
  
  const sorted = sortFiles(files);
  
  const isGrid = viewMode === 'grid';
  filesList.className = `files-list ${isGrid ? 'files-grid' : ''}`;
  
  filesList.innerHTML = sorted.map(file => {
    const isDir = isDirectory(file);
    const canEdit = !isDir && isEditable(file);
    const previewType = !isDir ? isPreviewable(file) : null;
    const searchPath = file._searchResult ? `<span class="file-search-path">${file.path}</span>` : '';
    
    if (isGrid) {
      return `
      <div class="file-item-grid ${isDir ? 'directory' : 'file'}" data-name="${file.name}" data-is-dir="${isDir}" data-editable="${canEdit}" data-preview="${previewType || ''}" ${file._searchResult ? `data-path="${file.path}"` : ''}>
        <div class="file-grid-icon">
          <span class="round-icon">${isDir ? 'folder' : getFileIcon(file)}</span>
        </div>
        <div class="file-grid-name">${file.name}</div>
        <div class="file-grid-meta">${isDir ? '' : formatBytes(file.size)}</div>
      </div>`;
    }
    
    return `
    <div class="file-item ${isDir ? 'directory' : 'file'}" data-name="${file.name}" data-is-dir="${isDir}" data-editable="${canEdit}" data-preview="${previewType || ''}" ${file._searchResult ? `data-path="${file.path}"` : ''} draggable="${!isDir ? 'true' : 'false'}">
      <div class="file-select">
        <input type="checkbox" class="file-checkbox" data-name="${file.name}">
      </div>
      <div class="file-icon">
        <span class="round-icon">${isDir ? 'folder' : getFileIcon(file)}</span>
      </div>
      <div class="file-info">
        <span class="file-name">${file.name}</span>
        <span class="file-meta">${isDir ? '--' : formatBytes(file.size)} • ${formatDate$3(file.modified_at)}${searchPath}</span>
      </div>
      <div class="file-actions">
        ${!isDir && isArchive(file) ? `
          <button class="btn btn-sm btn-ghost btn-decompress" title="Extract">
            <span class="round-icon">unarchive</span>
          </button>
        ` : ''}
        ${!isDir ? `
          <button class="btn btn-sm btn-ghost btn-download" title="Download">
            <span class="round-icon">download</span>
          </button>
          <button class="btn btn-sm btn-ghost btn-copy" title="Copy">
            <span class="round-icon">content_copy</span>
          </button>
        ` : ''}
        <button class="btn btn-sm btn-ghost btn-chmod" title="Permissions">
          <span class="round-icon">lock</span>
        </button>
        <button class="btn btn-sm btn-ghost btn-rename" title="Rename">
          <span class="round-icon">drive_file_rename_outline</span>
        </button>
        <button class="btn btn-sm btn-ghost btn-delete" title="Delete">
          <span class="round-icon">delete</span>
        </button>
      </div>
    </div>
  `}).join('');
  
  filesList.querySelectorAll('.file-checkbox').forEach(checkbox => {
    checkbox.onclick = (e) => {
      e.stopPropagation();
      const name = checkbox.dataset.name;
      const item = checkbox.closest('.file-item, .file-item-grid');
      if (checkbox.checked) {
        selectedFiles.add(name);
        item.classList.add('selected');
      } else {
        selectedFiles.delete(name);
        item.classList.remove('selected');
      }
      updateSelectionBar();
    };
  });
  
  filesList.querySelectorAll('.file-item.directory .file-info, .file-item-grid.directory').forEach(el => {
    el.onclick = () => {
      const item = el.closest('.file-item, .file-item-grid') || el;
      const name = item.dataset.name;
      const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      loadFiles(serverId, newPath);
    };
  });
  
  filesList.querySelectorAll('.file-item.file .file-info, .file-item-grid.file').forEach(el => {
    el.onclick = () => {
      const item = el.closest('.file-item, .file-item-grid') || el;
      const name = item.dataset.name;
      const preview = item.dataset.preview;
      const canEdit = item.dataset.editable === 'true';
      const filePath = item.dataset.path || (currentPath === '/' ? `/${name}` : `${currentPath}/${name}`);

      if (canEdit) {
        editFile(serverId, filePath);
      }
    };
  });
  
  filesList.querySelectorAll('.file-item .btn-delete').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.closest('.file-item').dataset.name;
      deleteFile(serverId, currentPath === '/' ? `/${name}` : `${currentPath}/${name}`);
    };
  });
  
  filesList.querySelectorAll('.file-item .btn-rename').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.closest('.file-item').dataset.name;
      renameFile(serverId, name);
    };
  });
  
  filesList.querySelectorAll('.file-item .btn-download').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.closest('.file-item').dataset.name;
      downloadFile(serverId, currentPath === '/' ? `/${name}` : `${currentPath}/${name}`);
    };
  });
  
  filesList.querySelectorAll('.file-item .btn-decompress').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.closest('.file-item').dataset.name;
      showDecompressDialog(serverId, name);
    };
  });
  
  filesList.querySelectorAll('.file-item .btn-copy').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.closest('.file-item').dataset.name;
      copyFile(serverId, currentPath === '/' ? `/${name}` : `${currentPath}/${name}`);
    };
  });
  
  filesList.querySelectorAll('.file-item .btn-chmod').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const item = btn.closest('.file-item');
      const name = item.dataset.name;
      chmodFile(serverId, name);
    };
  });

  setupFileDragToMove(filesList, serverId);
}

function setupFileDragToMove(filesList, serverId) {
  filesList.querySelectorAll('.file-item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.dataset.name);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  });

  filesList.querySelectorAll('.file-item.directory').forEach(folder => {
    folder.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('text/plain')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        folder.classList.add('drop-target');
      }
    });
    folder.addEventListener('dragleave', () => {
      folder.classList.remove('drop-target');
    });
    folder.addEventListener('drop', async (e) => {
      e.preventDefault();
      folder.classList.remove('drop-target');
      const fileName = e.dataTransfer.getData('text/plain');
      if (!fileName || fileName === folder.dataset.name) return;

      const destDir = currentPath === '/' ? `/${folder.dataset.name}` : `${currentPath}/${folder.dataset.name}`;
      try {
        const res = await api(`/api/servers/${serverId}/files/rename`, {
          method: 'POST',
          body: JSON.stringify({
            root: currentPath,
            files: [{ from: fileName, to: `${destDir.replace(/^\//, '')}/${fileName}` }]
          })
        });
        if (res.ok) {
          success(`Moved ${fileName}`);
          loadFiles(serverId, currentPath);
        } else {
          const data = await res.json();
          error(data.error || 'Failed to move');
        }
      } catch {
        error('Failed to move');
      }
    });
  });
}

async function openPreview(serverId, name, type, filePath) {
  try {
    const res = await api(`/api/servers/${serverId}/files/preview?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (!res.ok || !data.url) {
      error('Failed to get preview URL');
      return;
    }

    let content = '';
    if (type === 'image') {
      content = `<div class="preview-container"><img src="${data.url}" class="file-preview-image" alt="${name}"></div>`;
    } else if (type === 'video') {
      content = `<div class="preview-container"><video src="${data.url}" controls class="file-preview-video"></video></div>`;
    } else if (type === 'audio') {
      content = `<div class="preview-container preview-audio"><span class="round-icon" style="font-size:3rem;color:var(--accent)">audio_file</span><p>${name}</p><audio src="${data.url}" controls class="file-preview-audio"></audio></div>`;
    } else if (type === 'pdf') {
      content = `<div class="preview-container"><iframe src="${data.url}" class="file-preview-pdf"></iframe></div>`;
    }

    show({
      title: name,
      content: content,
      confirmText: 'Close',
      cancelText: 'Download'
    }).then((result) => {
      if (!result) downloadFile(serverId, filePath);
    });
  } catch (e) {
    error('Failed to preview file');
  }
}

function formatDate$3(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function createNewFolder(serverId) {
  const name = await prompt('Enter folder name:', { title: 'New Folder', placeholder: 'folder-name' });
  if (!name) return;
  
  const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
  
  try {
    const res = await api(`/api/servers/${serverId}/files/folder`, {
      method: 'POST',
      body: JSON.stringify({ path })
    });
    
    if (res.ok) {
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to create folder');
    }
  } catch (e) {
    error('Failed to create folder');
  }
}

async function createNewFile(serverId) {
  const name = await prompt('Enter file name:', { title: 'New File', placeholder: 'file.txt' });
  if (!name) return;
  
  const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
  
  try {
    const res = await api(`/api/servers/${serverId}/files/write`, {
      method: 'POST',
      body: JSON.stringify({ path, content: '' })
    });
    
    if (res.ok) {
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to create file');
    }
  } catch (e) {
    error('Failed to create file');
  }
}

async function deleteFile(serverId, path) {
  const confirmed = await confirm(`Are you sure you want to delete "${path.split('/').pop()}"?`, { 
    title: 'Delete File', 
    confirmText: 'Delete', 
    danger: true 
  });
  if (!confirmed) return;
  
  try {
    const res = await api(`/api/servers/${serverId}/files/delete`, {
      method: 'POST',
      body: JSON.stringify({ path })
    });
    
    if (res.ok) {
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to delete');
    }
  } catch (e) {
    error('Failed to delete');
  }
}

async function deleteSelectedFiles(serverId) {
  if (selectedFiles.size === 0) return;
  
  const confirmed = await confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`, {
    title: 'Delete Files',
    confirmText: 'Delete All',
    danger: true
  });
  if (!confirmed) return;
  
  const files = Array.from(selectedFiles);
  
  try {
    const res = await api(`/api/servers/${serverId}/files/delete`, {
      method: 'POST',
      body: JSON.stringify({ root: currentPath, files })
    });
    
    if (res.ok) {
      clearSelection();
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to delete');
    }
  } catch (e) {
    error('Failed to delete');
  }
}

async function renameFile(serverId, oldName) {
  const newName = await prompt('Enter new name:', { 
    title: 'Rename', 
    defaultValue: oldName,
    confirmText: 'Rename'
  });
  if (!newName || newName === oldName) return;
  
  const from = currentPath === '/' ? `/${oldName}` : `${currentPath}/${oldName}`;
  const to = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
  
  try {
    const res = await api(`/api/servers/${serverId}/files/rename`, {
      method: 'POST',
      body: JSON.stringify({ from, to })
    });
    
    if (res.ok) {
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to rename');
    }
  } catch (e) {
    error('Failed to rename');
  }
}

async function copyFile(serverId, location) {
  try {
    const res = await api(`/api/servers/${serverId}/files/copy`, {
      method: 'POST',
      body: JSON.stringify({ location })
    });
    
    if (res.ok) {
      success('File copied');
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to copy');
    }
  } catch (e) {
    error('Failed to copy file');
  }
}

async function chmodFile(serverId, name) {
  const mode = await prompt('Enter permissions (e.g. 755, 644):', {
    title: 'Change Permissions',
    placeholder: '755',
    confirmText: 'Apply'
  });
  if (!mode) return;
  
  if (!/^[0-7]{3,4}$/.test(mode)) {
    error('Invalid permission format');
    return;
  }
  
  try {
    const res = await api(`/api/servers/${serverId}/files/chmod`, {
      method: 'POST',
      body: JSON.stringify({
        root: currentPath,
        files: [{ file: name, mode }]
      })
    });
    
    if (res.ok) {
      success('Permissions updated');
    } else {
      const data = await res.json();
      error(data.error || 'Failed to change permissions');
    }
  } catch (e) {
    error('Failed to change permissions');
  }
}

async function moveSelectedFiles(serverId) {
  if (selectedFiles.size === 0) return;
  
  const destination = await prompt('Enter destination path:', {
    title: 'Move Files',
    defaultValue: currentPath,
    placeholder: '/path/to/folder',
    confirmText: 'Move'
  });
  if (!destination || destination === currentPath) return;
  
  const files = Array.from(selectedFiles).map(name => ({
    from: name,
    to: `${destination.replace(/\/$/, '')}/${name}`.replace(/^\/+/, '')
  }));
  
  try {
    const res = await api(`/api/servers/${serverId}/files/rename`, {
      method: 'POST',
      body: JSON.stringify({ root: currentPath, files })
    });
    
    if (res.ok) {
      success('Files moved');
      clearSelection();
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to move');
    }
  } catch (e) {
    error('Failed to move');
  }
}

async function compressSelectedFiles(serverId) {
  if (selectedFiles.size === 0) return;
  
  const files = Array.from(selectedFiles);
  
  connectProgressSocket(serverId);
  
  const indicator = showCompressIndicator();
  activeProgressIndicators.set('compress', indicator);
  clearSelection();
  
  try {
    const res = await api(`/api/servers/${serverId}/files/compress`, {
      method: 'POST',
      body: JSON.stringify({ root: currentPath, files })
    });
    
    if (indicator.hasProgress) {
      return;
    }
    
    activeProgressIndicators.delete('compress');
    indicator.remove();
    
    if (res.ok) {
      success('Compressed successfully');
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to compress');
    }
  } catch (e) {
    activeProgressIndicators.delete('compress');
    indicator.remove();
    error('Failed to compress');
  }
}

function showDecompressDialog(serverId, filename) {
  const folderName = filename.replace(/\.(zip|tar|tar\.gz|tgz|gz|rar|7z)$/i, '');
  
  confirm(`Extract "${filename}" to current folder?`, {
    title: 'Extract Archive',
    confirmText: 'Extract Here',
    cancelText: 'New Folder'
  }).then(async (extractHere) => {
    if (extractHere === null) return;
    
    if (!extractHere) {
      const folderPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
      
      await api(`/api/servers/${serverId}/files/folder`, {
        method: 'POST',
        body: JSON.stringify({ path: folderPath })
      });
      
      await decompressFile(serverId, filename, currentPath, folderPath);
    } else {
      await decompressFile(serverId, filename, currentPath, currentPath);
    }
  });
}

async function decompressFile(serverId, filename, archiveDir, extractTo) {
  connectProgressSocket(serverId);
  
  const indicator = showDecompressIndicator(filename);
  activeProgressIndicators.set('decompress', indicator);
  
  try {
    const res = await api(`/api/servers/${serverId}/files/decompress`, {
      method: 'POST',
      body: JSON.stringify({ 
        root: archiveDir,
        file: filename,
        extractTo: extractTo
      })
    });
    
    if (indicator.hasProgress) {
      return;
    }
    
    activeProgressIndicators.delete('decompress');
    indicator.remove();
    
    if (res.ok) {
      success('Extracted successfully');
      loadFiles(serverId, currentPath);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to extract');
    }
  } catch (e) {
    activeProgressIndicators.delete('decompress');
    indicator.remove();
    error('Failed to extract');
  }
}

async function editFile(serverId, path) {
  const filesList = document.getElementById('files-list');
  const filename = path.split('/').pop();
  
  filesList.innerHTML = '<div class="files-loading">Loading file...</div>';
  
  try {
    const res = await api(`/api/servers/${serverId}/files/contents?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    
    if (data.error) {
      error(data.error);
      loadFiles(serverId, currentPath);
      return;
    }
    
    isEditing = true;
    editingPath = path;
    
    const container = document.querySelector('.files-tab .card');
    container.innerHTML = `
      <div class="file-editor">
        <div class="editor-header">
          <div class="editor-title">
            <button class="btn btn-ghost btn-sm" id="btn-back">
              <span class="round-icon">arrow_back</span>
            </button>
            <span class="editor-filename">${filename}</span>
          </div>
          <div class="editor-actions">
            <button class="btn btn-primary btn-sm" id="btn-save">
              <span class="round-icon">save</span>
              Save
            </button>
          </div>
        </div>
        <div class="editor-content" id="editor-container"></div>
      </div>
    `;
    
    if (editorInstance) {
      editorInstance.destroy();
    }
    
    const editorContainer = document.getElementById('editor-container');
    editorInstance = createEditor(
      editorContainer,
      data.content || '',
      filename,
      () => saveFile(serverId, path)
    );
    
    document.getElementById('btn-back').onclick = () => {
      if (editorInstance) {
        editorInstance.destroy();
        editorInstance = null;
      }
      isEditing = false;
      editingPath = null;
      restoreFilesList(serverId);
    };
    
    document.getElementById('btn-save').onclick = () => saveFile(serverId, path);
    
  } catch (e) {
    console.error('Failed to load file:', e);
    error('Failed to load file');
    loadFiles(serverId, currentPath);
  }
}

async function saveFile(serverId, path) {
  const content = editorInstance ? editorInstance.getValue() : '';
  const saveBtn = document.getElementById('btn-save');
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="round-icon">hourglass_empty</span> Saving...';
  
  try {
    const res = await api(`/api/servers/${serverId}/files/write`, {
      method: 'POST',
      body: JSON.stringify({ path, content })
    });
    
    if (res.ok) {
      saveBtn.innerHTML = '<span class="round-icon">check</span> Saved';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="round-icon">save</span> Save';
      }, 1500);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to save');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="round-icon">save</span> Save';
    }
  } catch (e) {
    error('Failed to save file');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="round-icon">save</span> Save';
  }
}

async function downloadFile(serverId, path) {
  window.open(`/api/servers/${serverId}/files/download?path=${encodeURIComponent(path)}`);
}

async function uploadFile(serverId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = async () => {
    const fileArray = Array.from(input.files);
    if (fileArray.length === 0) return;

    if (fileArray.length === 1) {
      const file = fileArray[0];
      const indicator = showUploadIndicator(file.name);
      
      try {
        const res = await api(`/api/servers/${serverId}/files/upload`, {
          method: 'POST',
          body: JSON.stringify({ path: currentPath })
        });
        
        const data = await res.json();
        if (!res.ok || !data.url) {
          indicator.remove();
          error(data.error || 'Failed to get upload URL');
          return;
        }
        
        const uploadPath = currentPath === '/' ? '' : currentPath.replace(/^\//, '');
        const uploadUrl = `${data.url}&directory=${encodeURIComponent(uploadPath)}`;
        
        const formData = new FormData();
        formData.append('files', file);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            indicator.update(percent);
          }
        };
        
        xhr.onload = () => {
          indicator.remove();
          if (xhr.status >= 200 && xhr.status < 300) {
            success('File uploaded');
            loadFiles(serverId, currentPath);
          } else {
            error('Failed to upload file');
          }
        };
        
        xhr.onerror = () => {
          indicator.remove();
          error('Failed to upload');
        };
        
        xhr.send(formData);
      } catch (e) {
        indicator.remove();
        error('Failed to upload');
      }
    } else {
      uploadMultipleFiles(serverId, fileArray.map(f => ({ file: f, path: '' })));
    }
  };
  input.click();
}

function showUploadIndicator(filename) {
  const filesList = document.getElementById('files-list');
  
  const el = document.createElement('div');
  el.className = 'file-item upload-indicator';
  el.innerHTML = `
    <div class="file-select"></div>
    <div class="file-icon">
      <span class="round-icon rotating">sync</span>
    </div>
    <div class="file-info">
      <span class="file-name">${filename}</span>
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: 0%"></div>
      </div>
      <span class="file-meta upload-percent">Uploading... 0%</span>
    </div>
  `;
  
  filesList.insertBefore(el, filesList.firstChild);
  
  return {
    update: (percent) => {
      const bar = el.querySelector('.upload-progress-bar');
      const text = el.querySelector('.upload-percent');
      if (bar) bar.style.width = `${percent}%`;
      if (text) text.textContent = `Uploading... ${percent}%`;
    },
    remove: () => el.remove()
  };
}

function restoreFilesList(serverId) {
  const container = document.querySelector('.files-tab .card');
  container.innerHTML = `
    <div class="files-toolbar">
      <div class="files-breadcrumb" id="files-breadcrumb">
        <span class="breadcrumb-item" data-path="/">/</span>
      </div>
      <div class="files-actions">
        <div class="files-search-wrapper" id="files-search-wrapper">
          <button class="btn btn-xs btn-ghost" id="btn-search-toggle" title="Search">
            <span class="round-icon">search</span>
          </button>
          <input type="text" class="files-search-input" id="files-search-input" placeholder="Search files..." style="display:none;">
        </div>
        <button class="btn btn-xs btn-ghost" id="btn-sort" title="Sort">
          <span class="round-icon">sort</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-view-toggle" title="Toggle view">
          <span class="round-icon">${viewMode === 'list' ? 'grid_view' : 'view_list'}</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-refresh" title="Refresh">
          <span class="round-icon">refresh</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-new-folder" title="New Folder">
          <span class="round-icon">create_new_folder</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-new-file" title="New File">
          <span class="round-icon">note_add</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-upload" title="Upload">
          <span class="round-icon">upload</span>
        </button>
      </div>
    </div>
    <div class="files-selection-bar" id="files-selection-bar" style="display: none;">
      <div class="selection-info">
        <span id="selection-count">0</span> selected
      </div>
      <div class="selection-actions">
        <button class="btn btn-xs btn-ghost" id="btn-copy-clipboard" title="Copy">
          <span class="round-icon">content_copy</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-cut-clipboard" title="Cut">
          <span class="round-icon">content_cut</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-move" title="Move">
          <span class="round-icon">drive_file_move</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-compress" title="Compress">
          <span class="round-icon">archive</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-delete-selected" title="Delete">
          <span class="round-icon">delete</span>
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-clear-selection" title="Clear">
          <span class="round-icon">close</span>
        </button>
      </div>
    </div>
    <div class="files-paste-bar" id="files-paste-bar" style="display: none;">
      <div class="selection-info">
        <span id="paste-info">0 file(s) in clipboard</span>
      </div>
      <div class="selection-actions">
        <button class="btn btn-xs btn-ghost" id="btn-paste" title="Paste here">
          <span class="round-icon">content_paste</span>
          Paste
        </button>
        <button class="btn btn-xs btn-ghost" id="btn-cancel-paste" title="Cancel">
          <span class="round-icon">close</span>
        </button>
      </div>
    </div>
    <div class="files-list" id="files-list">
      <div class="loading-spinner"></div>
    </div>
  `;
  
  document.getElementById('btn-refresh').onclick = () => loadFiles(currentServerId$7, currentPath);
  document.getElementById('btn-new-folder').onclick = () => createNewFolder(currentServerId$7);
  document.getElementById('btn-new-file').onclick = () => createNewFile(currentServerId$7);
  document.getElementById('btn-upload').onclick = () => uploadFile(currentServerId$7);
  document.getElementById('btn-move').onclick = () => moveSelectedFiles(currentServerId$7);
  document.getElementById('btn-compress').onclick = () => compressSelectedFiles(currentServerId$7);
  document.getElementById('btn-delete-selected').onclick = () => deleteSelectedFiles(currentServerId$7);
  document.getElementById('btn-clear-selection').onclick = () => clearSelection();
  document.getElementById('btn-copy-clipboard').onclick = () => clipboardCopy(currentServerId$7);
  document.getElementById('btn-cut-clipboard').onclick = () => clipboardCut(currentServerId$7);
  document.getElementById('btn-paste').onclick = () => clipboardPaste(currentServerId$7);
  document.getElementById('btn-cancel-paste').onclick = () => clipboardClear();

  const searchToggle = document.getElementById('btn-search-toggle');
  const searchInput = document.getElementById('files-search-input');
  searchToggle.onclick = () => {
    const visible = searchInput.style.display !== 'none';
    searchInput.style.display = visible ? 'none' : 'inline-block';
    if (!visible) searchInput.focus();
    else { searchInput.value = ''; searchQuery = ''; loadFiles(currentServerId$7, currentPath); }
  };
  
  searchInput.oninput = () => {
    clearTimeout(searchTimeout$1);
    searchTimeout$1 = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      if (searchQuery.length >= 2) searchFiles(currentServerId$7, searchQuery);
      else if (searchQuery.length === 0) loadFiles(currentServerId$7, currentPath);
    }, 300);
  };

  document.getElementById('btn-sort').onclick = () => showSortMenu(currentServerId$7);
  document.getElementById('btn-view-toggle').onclick = () => toggleViewMode(currentServerId$7);

  initDragDrop(currentServerId$7);
  loadFiles(currentServerId$7, currentPath);
}

function cleanupFilesTab() {
  currentPath = '/';
  selectedFiles.clear();
  activeProgressIndicators.clear();
  searchQuery = '';
  if (searchTimeout$1) clearTimeout(searchTimeout$1);
  if (progressSocket) {
    progressSocket.close();
    progressSocket = null;
  }
  if (editorInstance) {
    editorInstance.destroy();
    editorInstance = null;
  }
  if (window._filesKeyboardHandler) {
    document.removeEventListener('keydown', window._filesKeyboardHandler);
    window._filesKeyboardHandler = null;
  }
}

let currentServerId$6 = null;
let serverData$2 = null;
let eggData = null;
let nestsData = null;

function parseRules(rulesString) {
  const rules = {
    required: false,
    nullable: false,
    type: null,
    min: null,
    max: null,
    in: [],
    regex: null
  };
  
  if (!rulesString) return rules;
  
  const parts = rulesString.split('|');
  for (const part of parts) {
    const trimmed = part.trim();
    
    if (trimmed === 'required') rules.required = true;
    else if (trimmed === 'nullable') rules.nullable = true;
    else if (trimmed === 'string') rules.type = 'string';
    else if (trimmed === 'numeric' || trimmed === 'integer') rules.type = 'number';
    else if (trimmed === 'boolean') rules.type = 'boolean';
    else if (trimmed.startsWith('min:')) rules.min = parseInt(trimmed.split(':')[1]);
    else if (trimmed.startsWith('max:')) rules.max = parseInt(trimmed.split(':')[1]);
    else if (trimmed.startsWith('in:')) rules.in = trimmed.split(':')[1].split(',');
    else if (trimmed.startsWith('regex:')) rules.regex = trimmed.split(':').slice(1).join(':');
  }
  
  return rules;
}

function renderVariableInput(variable, currentValue, rules) {
  const id = `var-${variable.env_variable}`;
  const dataAttr = `data-var="${variable.env_variable}" data-rules="${escapeHtml$1(variable.rules || '')}"`;
  const placeholder = escapeHtml$1(variable.default_value || '');
  const value = escapeHtml$1(currentValue);
  
  // Boolean type - render as toggle/select
  if (rules.type === 'boolean') {
    const isTrue = currentValue === '1' || currentValue === 'true' || currentValue === true;
    return `
      <select id="${id}" name="env_${variable.env_variable}" class="select-input" ${dataAttr}>
        <option value="0" ${!isTrue ? 'selected' : ''}>False (0)</option>
        <option value="1" ${isTrue ? 'selected' : ''}>True (1)</option>
      </select>
    `;
  }
  
  // Has predefined options - render as select
  if (rules.in.length > 0) {
    return `
      <select id="${id}" name="env_${variable.env_variable}" class="select-input" ${dataAttr}>
        ${rules.in.map(opt => `
          <option value="${escapeHtml$1(opt)}" ${currentValue === opt ? 'selected' : ''}>${escapeHtml$1(opt)}</option>
        `).join('')}
      </select>
    `;
  }
  
  // Number type
  if (rules.type === 'number') {
    return `
      <input 
        type="number" 
        id="${id}"
        name="env_${variable.env_variable}" 
        value="${value}"
        placeholder="${placeholder}"
        ${dataAttr}
        ${rules.min !== null ? `min="${rules.min}"` : ''}
        ${rules.max !== null ? `max="${rules.max}"` : ''}
        ${rules.required ? 'required' : ''}
      />
    `;
  }
  
  // Default: text input
  return `
    <input 
      type="text" 
      id="${id}"
      name="env_${variable.env_variable}" 
      value="${value}"
      placeholder="${placeholder}"
      ${dataAttr}
      ${rules.max !== null ? `maxlength="${rules.max}"` : ''}
      ${rules.required ? 'required' : ''}
    />
  `;
}

function validateVariable(value, rulesString) {
  const rules = parseRules(rulesString);
  const errors = [];
  
  // Check required
  if (rules.required && (value === '' || value === null || value === undefined)) {
    errors.push('This field is required');
    return errors;
  }
  
  // If nullable and empty, skip other validations
  if (rules.nullable && (value === '' || value === null || value === undefined)) {
    return errors;
  }
  
  // Type validations
  if (rules.type === 'number' && value !== '') {
    if (isNaN(Number(value))) {
      errors.push('Must be a number');
    } else {
      const num = Number(value);
      if (rules.min !== null && num < rules.min) {
        errors.push(`Minimum value is ${rules.min}`);
      }
      if (rules.max !== null && num > rules.max) {
        errors.push(`Maximum value is ${rules.max}`);
      }
    }
  }
  
  if (rules.type === 'string' && value !== '') {
    if (rules.min !== null && value.length < rules.min) {
      errors.push(`Minimum length is ${rules.min} characters`);
    }
    if (rules.max !== null && value.length > rules.max) {
      errors.push(`Maximum length is ${rules.max} characters`);
    }
  }
  
  // In validation
  if (rules.in.length > 0 && value !== '' && !rules.in.includes(value)) {
    errors.push(`Must be one of: ${rules.in.join(', ')}`);
  }
  
  // Regex validation
  if (rules.regex && value !== '') {
    try {
      const regex = new RegExp(rules.regex);
      if (!regex.test(value)) {
        errors.push('Invalid format');
      }
    } catch (e) {
      // Invalid regex, skip
    }
  }
  
  return errors;
}

function renderStartupTab() {
  return `
    <div class="startup-tab">
      <div class="settings-content">
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">terminal</span>
            <h3>Startup Configuration</h3>
          </div>
          <div id="startup-card-content">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>
      <div class="startup-content" id="startup-content"></div>
    </div>
  `;
}

async function initStartupTab(serverId) {
  currentServerId$6 = serverId;
  await loadStartupData(serverId);
}

async function loadStartupData(serverId) {
  const username = state$1.username;
  const content = document.getElementById('startup-content');
  
  try {
    const [serverRes, startupRes, nestsRes] = await Promise.all([
      api(`/api/servers/${serverId}`),
      api(`/api/servers/${serverId}/startup`),
      api(`/api/servers/nests`)
    ]);
    
    const serverJson = await serverRes.json();
    const startupJson = await startupRes.json();
    const nestsJson = await nestsRes.json();
    
    if (serverJson.error || startupJson.error) {
      content.innerHTML = `<div class="error">${serverJson.error || startupJson.error}</div>`;
      return;
    }
    
    serverData$2 = serverJson.server;
    eggData = startupJson.egg;
    nestsData = nestsJson.nests || [];
    
    renderStartupForm(serverData$2, eggData);
  } catch (e) {
    console.error('Failed to load startup data:', e);
    content.innerHTML = '<div class="error">Failed to load startup configuration</div>';
  }
}

function renderStartupForm(server, egg) {
  const cardContent = document.getElementById('startup-card-content');
  const externalContent = document.getElementById('startup-content');
  const variables = egg?.variables || [];
  
  // Content inside the card
  cardContent.innerHTML = `
    <div class="form-group">
      <label>Startup Command</label>
      <div class="textarea-wrapper">
        <textarea name="startup" id="startup-command" rows="3" spellcheck="false" placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar">${escapeHtml$1(server.startup || egg?.startup || '')}</textarea>
      </div>
      <small class="form-hint">Use {{VARIABLE}} syntax for variables</small>
    </div>
    <div class="startup-preview">
      <span class="preview-label">Preview:</span>
      <code id="startup-preview">${escapeHtml$1(parseStartupCommand(server.startup || egg?.startup || '', server.environment || {}, server))}</code>
    </div>
    
    <div class="form-group" style="margin-top: 20px;">
      <label>Server Egg</label>
      <div class="input-wrapper">
        <span class="round-icon">egg</span>
        <select name="egg_id" id="egg-select" class="select-input">
          ${getEggOptions(server)}
        </select>
      </div>
    </div>
    
    <div class="form-group" style="margin-top: 12px;">
      <label>Docker Image</label>
      <div class="input-wrapper">
        <span class="round-icon">inventory_2</span>
        <select name="docker_image" class="select-input">
          ${getDockerImagesOptions(server, egg)}
        </select>
      </div>
    </div>
  `;
  
  // Content outside the card (variables + save button)
  externalContent.innerHTML = `
    <form id="startup-form" class="startup-form">
      <div class="variables-section">
        <div class="variables-list">
          ${variables.length === 0 ? '<div class="empty">No variables defined for this egg</div>' : ''}
          ${variables.map(v => {
            const rules = parseRules(v.rules || '');
            const currentValue = server.environment?.[v.env_variable] ?? v.default_value ?? '';
            return `
            <div class="variable-item">
              <div class="variable-header">
                <label for="var-${v.env_variable}">
                  ${escapeHtml$1(v.name)}
                  ${rules.required ? '<span class="required">*</span>' : ''}
                </label>
                <code class="variable-key">${escapeHtml$1(v.env_variable)}</code>
              </div>
              <p class="variable-description">${escapeHtml$1(v.description || '')}</p>
              ${renderVariableInput(v, currentValue, rules)}
              <div class="variable-meta">
                ${rules.required ? '<span class="rule-badge required">Required</span>' : '<span class="rule-badge optional">Optional</span>'}
                ${rules.type ? `<span class="rule-badge type">${escapeHtml$1(rules.type)}</span>` : ''}
                ${rules.min !== null ? `<span class="rule-badge">Min: ${rules.min}</span>` : ''}
                ${rules.max !== null ? `<span class="rule-badge">Max: ${rules.max}</span>` : ''}
                ${rules.in.length > 0 ? `<span class="rule-badge">Options: ${rules.in.join(', ')}</span>` : ''}
              </div>
              <div class="variable-error" id="error-${v.env_variable}"></div>
            </div>
          `}).join('')}
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="save-startup">
          <span class="round-icon">save</span>
          Save Changes
        </button>
        <button type="button" class="btn btn-ghost" id="reset-startup">
          <span class="round-icon">restart_alt</span>
          Reset to Defaults
        </button>
      </div>
    </form>
  `;
  
  const form = document.getElementById('startup-form');
  const startupInput = document.getElementById('startup-command');
  const previewEl = document.getElementById('startup-preview');
  
  const updatePreview = () => {
    const env = getEnvironmentFromForm();
    const cmd = startupInput.value;
    previewEl.textContent = parseStartupCommand(cmd, env, serverData$2);
  };
  
  startupInput.addEventListener('input', updatePreview);
  
  document.querySelectorAll('.variable-item input').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
  
  form.onsubmit = (e) => {
    e.preventDefault();
    saveStartup();
  };
  
  document.getElementById('egg-select').onchange = async (e) => {
    const newEggId = e.target.value;
    if (!newEggId || newEggId === serverData$2.egg_id) return;
    
    const confirmed = await confirm({
      title: 'Change Egg',
      message: 'Changing the egg will delete all server files and reinstall the server with the new egg configuration. This action cannot be undone!',
      confirmText: 'Change & Reinstall',
      danger: true
    });
    
    if (!confirmed) {
      e.target.value = serverData$2.egg_id;
      return;
    }
    
    try {
      const res = await api(`/api/servers/${currentServerId$6}/startup`, {
        method: 'PUT',
        body: JSON.stringify({ egg_id: newEggId })
      });
      const data = await res.json();
      if (res.ok && data.egg_changed) {
        success('Egg changed, server is reinstalling...');
        window.router.navigateTo('/servers');
      } else {
        error(data.error || 'Failed to change egg');
        e.target.value = serverData$2.egg_id;
      }
    } catch (err) {
      error('Failed to change egg');
      e.target.value = serverData$2.egg_id;
    }
  };
  
  document.getElementById('reset-startup').onclick = async () => {
    const confirmed = await confirm({ 
      title: 'Reset Configuration', 
      message: 'Reset startup configuration to egg defaults?',
      confirmText: 'Reset',
      danger: true 
    });
    if (confirmed) {
      resetToDefaults();
    }
  };
}

function getEggOptions(server) {
  const currentEggId = server.egg_id || '';
  let options = '';
  
  for (const nest of (nestsData || [])) {
    const nestEggs = nest.eggs || [];
    if (nestEggs.length === 0) continue;
    options += `<optgroup label="${escapeHtml$1(nest.name)}">`;
    for (const egg of nestEggs) {
      options += `<option value="${escapeHtml$1(egg.id)}" ${currentEggId === egg.id ? 'selected' : ''}>${escapeHtml$1(egg.name)}</option>`;
    }
    options += `</optgroup>`;
  }
  
  return options || '<option value="">No eggs available</option>';
}

function getDockerImagesOptions(server, egg) {
  const currentImage = server.docker_image || egg?.docker_image || '';
  const eggImages = egg?.docker_images || {};
  
  const images = Object.entries(eggImages);
  
  if (images.length === 0) {
    if (currentImage) {
      return `<option value="${escapeHtml$1(currentImage)}" selected>${escapeHtml$1(currentImage)}</option>`;
    }
    return '<option value="">No images available</option>';
  }
  
  return images.map(([label, value]) => `
    <option value="${escapeHtml$1(value)}" ${currentImage === value ? 'selected' : ''}>
      ${escapeHtml$1(label)}
    </option>
  `).join('');
}

function getEnvironmentFromForm() {
  const env = {};
  document.querySelectorAll('.variable-item input[data-var], .variable-item select[data-var]').forEach(input => {
    env[input.dataset.var] = input.value;
  });
  return env;
}

function validateAllVariables() {
  let hasErrors = false;
  
  document.querySelectorAll('.variable-item input[data-var], .variable-item select[data-var]').forEach(input => {
    const varName = input.dataset.var;
    const rules = input.dataset.rules || '';
    const value = input.value;
    const errorEl = document.getElementById(`error-${varName}`);
    
    const errors = validateVariable(value, rules);
    
    if (errors.length > 0) {
      hasErrors = true;
      input.classList.add('input-error');
      if (errorEl) errorEl.textContent = errors.join(', ');
    } else {
      input.classList.remove('input-error');
      if (errorEl) errorEl.textContent = '';
    }
  });
  
  return !hasErrors;
}

function getBuiltInVariables(server) {
  if (!server) return {};
  const alloc = server.allocation || {};
  const limits = server.limits || {};
  return {
    SERVER_MEMORY: String(limits.memory || ''),
    SERVER_IP: alloc.ip || '0.0.0.0',
    SERVER_PORT: String(alloc.port || ''),
    SERVER_DISK: String(limits.disk || ''),
    SERVER_CPU: String(limits.cpu || ''),
  };
}

function parseStartupCommand(command, environment, server) {
  if (!command) return '';
  
  let parsed = command;
  
  const allVars = { ...getBuiltInVariables(server), ...environment };
  
  for (const [key, value] of Object.entries(allVars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    parsed = parsed.replace(regex, value || '');
    
    const envRegex = new RegExp(`\\$\\{${key}\\}`, 'g');
    parsed = parsed.replace(envRegex, value || '');
  }
  
  parsed = parsed.replace(/\{\{[A-Z_]+\}\}/g, '');
  parsed = parsed.replace(/\$\{[A-Z_]+\}/g, '');
  
  return parsed;
}

async function saveStartup() {
  const username = state$1.username;
  const saveBtn = document.getElementById('save-startup');
  
  // Validate before saving
  if (!validateAllVariables()) {
    warning('Please fix validation errors');
    return;
  }
  
  const startup = document.getElementById('startup-command').value;
  const dockerImage = document.querySelector('select[name="docker_image"]').value;
  const environment = getEnvironmentFromForm();
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="round-icon">hourglass_empty</span> Saving...';
  
  try {
    const res = await api(`/api/servers/${currentServerId$6}/startup`, {
      method: 'PUT',
      
      body: JSON.stringify({
        username,
        startup,
        docker_image: dockerImage,
        environment
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      saveBtn.innerHTML = '<span class="round-icon">check</span> Saved';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="round-icon">save</span> Save Changes';
      }, 1500);
    } else {
      error(data.error || 'Failed to save');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="round-icon">save</span> Save Changes';
    }
  } catch (e) {
    console.error('Failed to save startup:', e);
    error('Failed to save startup');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="round-icon">save</span> Save Changes';
  }
}

async function resetToDefaults() {
  if (!eggData) return;
  
  document.getElementById('startup-command').value = eggData.startup || '';
  
  const dockerSelect = document.querySelector('select[name="docker_image"]');
  if (dockerSelect && eggData.docker_image) {
    dockerSelect.value = eggData.docker_image;
  }
  
  (eggData.variables || []).forEach(v => {
    const input = document.getElementById(`var-${v.env_variable}`);
    if (input) {
      input.value = v.default_value || '';
    }
  });
  
  const env = getEnvironmentFromForm();
  document.getElementById('startup-preview').textContent = 
    parseStartupCommand(eggData.startup || '', env, serverData$2);
}

function cleanupStartupTab() {
  currentServerId$6 = null;
  serverData$2 = null;
  eggData = null;
  nestsData = null;
}

let currentServerId$5 = null;
let allocations = [];

function renderNetworkTab() {
  return `
    <div class="network-tab">
      <div class="network-header">
        <h3>Network Allocations</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-allocation">
          <span class="round-icon">add</span>
          Add Allocation
        </button>
      </div>
      <div class="allocations-list" id="allocations-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
}

async function initNetworkTab(serverId) {
  currentServerId$5 = serverId;
  await loadAllocations();
  
  document.getElementById('btn-add-allocation').onclick = addAllocation;
}

async function loadAllocations() {
  const username = state$1.username;
  const list = document.getElementById('allocations-list');
  
  try {
    const res = await api(`/api/servers/${currentServerId$5}/allocations`);
    const data = await res.json();
    
    if (data.error) {
      list.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }
    
    allocations = data.allocations || [];
    renderAllocations();
  } catch (e) {
    list.innerHTML = '<div class="error">Failed to load allocations</div>';
  }
}

function renderAllocations() {
  const list = document.getElementById('allocations-list');
  
  if (allocations.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="round-icon">lan</span>
        <p>No allocations configured</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = allocations.map(alloc => `
    <div class="allocation-item ${alloc.primary ? 'primary' : ''}">
      <div class="allocation-info">
        <span class="allocation-address">${alloc.ip}:${alloc.port}</span>
        ${alloc.primary ? '<span class="badge primary">Primary</span>' : ''}
      </div>
      <div class="allocation-actions">
        ${!alloc.primary ? `
          <button class="btn btn-ghost btn-sm" data-primary="${alloc.id}" title="Make Primary">
            <span class="round-icon">star</span>
          </button>
          <button class="btn btn-ghost btn-sm btn-danger-hover" data-delete="${alloc.id}" title="Delete">
            <span class="round-icon">delete</span>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  list.querySelectorAll('[data-primary]').forEach(btn => {
    btn.onclick = () => setAllocationPrimary(btn.dataset.primary);
  });
  
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.onclick = () => deleteAllocation(btn.dataset.delete);
  });
}

async function addAllocation() {
  const username = state$1.username;
  const btn = document.getElementById('btn-add-allocation');
  
  btn.disabled = true;
  btn.innerHTML = '<span class="round-icon spinning">sync</span>';
  
  try {
    const res = await api(`/api/servers/${currentServerId$5}/allocations`, {
      method: 'POST',
      
      body: JSON.stringify({})
    });
    
    const data = await res.json();
    
    if (data.error) {
      error(data.error);
    } else {
      success('Allocation added');
      await loadAllocations();
    }
  } catch (e) {
    error('Failed to add allocation');
  }
  
  btn.disabled = false;
  btn.innerHTML = '<span class="round-icon">add</span> Add Allocation';
}

async function setAllocationPrimary(allocId) {
  const username = state$1.username;
  
  try {
    const res = await api(`/api/servers/${currentServerId$5}/allocations/${allocId}/primary`, {
      method: 'PUT',
      
      body: JSON.stringify({})
    });
    
    if (res.ok) {
      success('Primary allocation updated');
      await loadAllocations();
    } else {
      const data = await res.json();
      error(data.error);
    }
  } catch (e) {
    error('Failed to set primary');
  }
}

async function deleteAllocation(allocId) {
  const confirmed = await confirm({ title: 'Delete Allocation', message: 'Delete this allocation?', danger: true });
  if (!confirmed) return;
  
  const username = state$1.username;
  
  try {
    const res = await api(`/api/servers/${currentServerId$5}/allocations/${allocId}`, {
      method: 'DELETE',
      
      body: JSON.stringify({})
    });
    
    if (res.ok) {
      success('Allocation deleted');
      await loadAllocations();
    } else {
      const data = await res.json();
      error(data.error);
    }
  } catch (e) {
    error('Failed to delete allocation');
  }
}

function cleanupNetworkTab() {
  currentServerId$5 = null;
  allocations = [];
}

const PERMISSIONS = {
  'control.console': 'Send commands',
  'control.start': 'Start server',
  'control.stop': 'Stop server',
  'control.restart': 'Restart server',
  'user.create': 'Add subusers',
  'user.read': 'View subusers',
  'user.update': 'Edit subusers',
  'user.delete': 'Remove subusers',
  'file.read': 'View files',
  'file.create': 'Create files',
  'file.update': 'Edit files',
  'file.delete': 'Delete files',
  'file.archive': 'Archive files',
  'file.sftp': 'SFTP access',
  'backup.create': 'Create backups',
  'backup.read': 'View backups',
  'backup.delete': 'Delete backups',
  'backup.restore': 'Restore backups',
  'allocation.read': 'View allocations',
  'allocation.create': 'Add allocations',
  'allocation.update': 'Edit allocations',
  'allocation.delete': 'Remove allocations',
  'startup.read': 'View startup',
  'startup.update': 'Edit startup',
  'settings.rename': 'Rename server',
  'settings.reinstall': 'Reinstall server',
  'activity.read': 'View activity',
  'schedule.read': 'View schedules',
  'schedule.create': 'Create schedules',
  'schedule.update': 'Edit schedules',
  'schedule.delete': 'Delete schedules'
};

const PERMISSION_GROUPS = {
  'Control': ['control.console', 'control.start', 'control.stop', 'control.restart'],
  'Subusers': ['user.create', 'user.read', 'user.update', 'user.delete'],
  'Files': ['file.read', 'file.create', 'file.update', 'file.delete', 'file.archive', 'file.sftp'],
  'Backups': ['backup.create', 'backup.read', 'backup.delete', 'backup.restore'],
  'Allocations': ['allocation.read', 'allocation.create', 'allocation.update', 'allocation.delete'],
  'Startup': ['startup.read', 'startup.update'],
  'Settings': ['settings.rename', 'settings.reinstall'],
  'Activity': ['activity.read'],
  'Schedules': ['schedule.read', 'schedule.create', 'schedule.update', 'schedule.delete']
};

function hasPermission(permissions, permission) {
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(permission);
}

function hasAnyPermission(permissions, perms) {
  return perms.some(p => hasPermission(permissions, p));
}

let currentServerId$4 = null;
let subusers = [];

function renderUsersTab() {
  return `
    <div class="users-tab">
      <div class="users-header">
        <h3>Subusers</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-subuser">
          <span class="round-icon">person_add</span>
          Add User
        </button>
      </div>
      <div class="subusers-list" id="subusers-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
    
    <div class="modal" id="subuser-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3 id="modal-title">Add Subuser</h3>
          <button class="modal-close">
            <span class="round-icon">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group" id="username-group">
            <label>Username</label>
            <div class="input-wrapper">
              <span class="round-icon">person</span>
              <input type="text" id="subuser-username" placeholder="Enter username" />
            </div>
          </div>
          <div class="permissions-editor">
            <h4>Permissions</h4>
            <div class="permissions-grid" id="permissions-grid"></div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancel-subuser">Cancel</button>
          <button class="btn btn-primary" id="save-subuser">Save</button>
        </div>
      </div>
    </div>
  `;
}

async function initUsersTab(serverId) {
  currentServerId$4 = serverId;
  await loadSubusers();
  
  document.getElementById('btn-add-subuser').onclick = () => openModal();
  
  const modal = document.getElementById('subuser-modal');
  modal.querySelector('.modal-close').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  document.getElementById('cancel-subuser').onclick = closeModal;
}

async function loadSubusers() {
  const username = state$1.username;
  const list = document.getElementById('subusers-list');
  
  try {
    const res = await api(`/api/servers/${currentServerId$4}/subusers`);
    const data = await res.json();
    
    if (data.error) {
      list.innerHTML = `<div class="error-message">${escapeHtml$1(data.error)}</div>`;
      return;
    }
    
    subusers = data.subusers || [];
    renderSubusers();
  } catch (e) {
    list.innerHTML = '<div class="error-message">Failed to load subusers</div>';
  }
}

function renderSubusers() {
  const list = document.getElementById('subusers-list');
  
  if (subusers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="round-icon">group</span>
        <p>No subusers added yet</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = subusers.map(sub => `
    <div class="subuser-item">
      <div class="subuser-info">
        <span class="subuser-name">${escapeHtml$1(sub.username)}</span>
        <span class="subuser-perms">${sub.permissions.length} permissions</span>
      </div>
      <div class="subuser-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${sub.id}" title="Edit">
          <span class="round-icon">edit</span>
        </button>
        <button class="btn btn-ghost btn-sm btn-danger-hover" data-delete="${sub.id}" title="Remove">
          <span class="round-icon">person_remove</span>
        </button>
      </div>
    </div>
  `).join('');
  
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => openModal(btn.dataset.edit);
  });
  
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.onclick = () => deleteSubuser(btn.dataset.delete);
  });
}

function openModal(editId = null) {
  const modal = document.getElementById('subuser-modal');
  const title = document.getElementById('modal-title');
  const usernameGroup = document.getElementById('username-group');
  const usernameInput = document.getElementById('subuser-username');
  const saveBtn = document.getElementById('save-subuser');
  
  let editingSubuser = null;
  
  if (editId) {
    editingSubuser = subusers.find(s => s.id === editId);
    title.textContent = 'Edit Subuser';
    usernameGroup.style.display = 'none';
  } else {
    title.textContent = 'Add Subuser';
    usernameGroup.style.display = 'block';
    usernameInput.value = '';
  }
  
  renderPermissionsGrid(editingSubuser?.permissions || []);
  
  saveBtn.onclick = () => saveSubuser(editId);
  
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('subuser-modal').classList.remove('active');
}

function renderPermissionsGrid(selectedPerms = []) {
  const grid = document.getElementById('permissions-grid');
  
  grid.innerHTML = Object.entries(PERMISSION_GROUPS).map(([group, perms]) => `
    <div class="permission-group">
      <div class="permission-group-header">
        <label class="checkbox-label">
          <input type="checkbox" class="group-checkbox" data-group="${group}" 
            ${perms.every(p => selectedPerms.includes(p)) ? 'checked' : ''} />
          <span>${group}</span>
        </label>
      </div>
      <div class="permission-items">
        ${perms.map(p => `
          <label class="checkbox-label">
            <input type="checkbox" class="perm-checkbox" value="${p}" 
              ${selectedPerms.includes(p) ? 'checked' : ''} />
            <span>${PERMISSIONS[p] || p}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  grid.querySelectorAll('.group-checkbox').forEach(cb => {
    cb.onchange = () => {
      const group = cb.dataset.group;
      const perms = PERMISSION_GROUPS[group];
      perms.forEach(p => {
        const permCb = grid.querySelector(`input[value="${p}"]`);
        if (permCb) permCb.checked = cb.checked;
      });
    };
  });
  
  grid.querySelectorAll('.perm-checkbox').forEach(cb => {
    cb.onchange = () => updateGroupCheckbox(grid);
  });
}

function updateGroupCheckbox(grid) {
  Object.entries(PERMISSION_GROUPS).forEach(([group, perms]) => {
    const groupCb = grid.querySelector(`[data-group="${group}"]`);
    if (groupCb) {
      const allChecked = perms.every(p => {
        const cb = grid.querySelector(`input[value="${p}"]`);
        return cb?.checked;
      });
      groupCb.checked = allChecked;
    }
  });
}

function getSelectedPermissions() {
  const checkboxes = document.querySelectorAll('.perm-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

async function saveSubuser(editId) {
  const username = state$1.username;
  const permissions = getSelectedPermissions();
  const saveBtn = document.getElementById('save-subuser');
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="round-icon spinning">sync</span>';
  
  try {
    if (editId) {
      const res = await api(`/api/servers/${currentServerId$4}/subusers/${editId}`, {
        method: 'PUT',
        
        body: JSON.stringify({ permissions })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } else {
      const targetUsername = document.getElementById('subuser-username').value.trim();
      if (!targetUsername) throw new Error('Username required');
      
      const res = await api(`/api/servers/${currentServerId$4}/subusers`, {
        method: 'POST',
        
        body: JSON.stringify({ target_username: targetUsername, permissions })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    }
    
    closeModal();
    success(editId ? 'Subuser updated' : 'Subuser added');
    await loadSubusers();
  } catch (e) {
    error(e.message);
  }
  
  saveBtn.disabled = false;
  saveBtn.innerHTML = 'Save';
}

async function deleteSubuser(id) {
  const confirmed = await confirm({ title: 'Remove Subuser', message: 'Remove this subuser?', danger: true });
  if (!confirmed) return;
  
  const username = state$1.username;
  
  try {
    const res = await api(`/api/servers/${currentServerId$4}/subusers/${id}`, {
      method: 'DELETE',
      
      body: JSON.stringify({})
    });
    
    if (res.ok) {
      success('Subuser removed');
      await loadSubusers();
    } else {
      const data = await res.json();
      error(data.error);
    }
  } catch (e) {
    error('Failed to remove subuser');
  }
}

function cleanupUsersTab() {
  currentServerId$4 = null;
  subusers = [];
}

let currentServerId$3 = null;

function renderSchedulesTab(serverId) {
  currentServerId$3 = serverId;
  return `
    <div class="schedules-tab">
      <div class="tab-header">
        <h2>Schedules</h2>
        <button class="btn btn-primary" id="create-schedule-btn">
          <span class="round-icon">add</span>
          New Schedule
        </button>
      </div>
      <div class="schedules-list" id="schedules-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
}

async function initSchedulesTab(serverId) {
  currentServerId$3 = serverId;
  document.getElementById('create-schedule-btn')?.addEventListener('click', showCreateScheduleModal);
  await loadSchedules();
}

function cleanupSchedulesTab() {
  currentServerId$3 = null;
}

async function loadSchedules() {
  const container = document.getElementById('schedules-list');
  if (!container) return;
  
  try {
    const res = await api(`/api/servers/${currentServerId$3}/schedules`);
    const data = await res.json();
    
    if (data.schedules.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="round-icon">schedule</span>
          <p>No schedules configured</p>
          <span class="text-muted">Create automated tasks for your server</span>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.schedules.map(schedule => `
      <div class="schedule-card" data-id="${schedule.id}">
        <div class="schedule-header">
          <div class="schedule-info">
            <div class="schedule-name">
              <span class="status-dot ${schedule.is_active ? 'active' : 'inactive'}"></span>
              ${escapeHtml$1(schedule.name)}
            </div>
            <div class="schedule-cron">${formatCron(schedule.cron)}</div>
          </div>
          <div class="schedule-actions">
            <button class="btn btn-sm btn-ghost" title="Run Now" data-action="execute" data-id="${schedule.id}">
              <span class="round-icon">play_arrow</span>
            </button>
            <button class="btn btn-sm btn-ghost" title="Duplicate" data-action="duplicate" data-id="${schedule.id}">
              <span class="round-icon">content_copy</span>
            </button>
            <button class="btn btn-sm btn-ghost" title="Edit" data-action="edit" data-id="${schedule.id}">
              <span class="round-icon">edit</span>
            </button>
            <button class="btn btn-sm btn-ghost btn-danger" title="Delete" data-action="delete" data-id="${schedule.id}">
              <span class="round-icon">delete</span>
            </button>
          </div>
        </div>
        <div class="schedule-meta">
          <span class="meta-item">
            <span class="round-icon">task</span>
            ${schedule.tasks?.length || 0} task${schedule.tasks?.length !== 1 ? 's' : ''}
          </span>
          ${schedule.last_run_at ? `
            <span class="meta-item">
              <span class="round-icon">history</span>
              Last: ${formatRelativeTime(schedule.last_run_at)}
            </span>
          ` : ''}
          ${schedule.next_run_at ? `
            <span class="meta-item">
              <span class="round-icon">schedule</span>
              Next: ${formatRelativeTime(schedule.next_run_at)}
            </span>
          ` : ''}
        </div>
        <div class="schedule-tasks" id="tasks-${schedule.id}">
          ${renderTasks(schedule.tasks || [], schedule.id)}
        </div>
        <button class="btn btn-sm btn-ghost add-task-btn" data-schedule="${schedule.id}">
          <span class="round-icon">add</span>
          Add Task
        </button>
      </div>
    `).join('');
    
    attachScheduleListeners();
  } catch (err) {
    container.innerHTML = `<div class="error">Failed to load schedules</div>`;
  }
}

function renderTasks(tasks, scheduleId) {
  if (tasks.length === 0) {
    return '<div class="no-tasks">No tasks configured</div>';
  }
  
  return tasks.sort((a, b) => a.sequence_id - b.sequence_id).map(task => `
    <div class="task-item" data-task="${task.id}" data-schedule="${scheduleId}">
      <div class="task-order">#${task.sequence_id}</div>
      <div class="task-info">
        <span class="task-action ${task.action}">${getActionLabel(task.action)}</span>
        <span class="task-payload">${escapeHtml$1(task.payload || '-')}</span>
        ${task.time_offset > 0 ? `<span class="task-delay">+${task.time_offset}s delay</span>` : ''}
      </div>
      <div class="task-actions">
        <button class="btn btn-xs btn-ghost" data-action="edit-task" data-task="${task.id}" data-schedule="${scheduleId}">
          <span class="round-icon">edit</span>
        </button>
        <button class="btn btn-xs btn-ghost btn-danger" data-action="delete-task" data-task="${task.id}" data-schedule="${scheduleId}">
          <span class="round-icon">close</span>
        </button>
      </div>
    </div>
  `).join('');
}

function attachScheduleListeners() {
  document.querySelectorAll('[data-action="execute"]').forEach(btn => {
    btn.onclick = async () => {
      const confirmed = await confirm({ title: 'Execute Schedule', message: 'Execute this schedule now?', confirmText: 'Execute' });
      if (!confirmed) return;
      
      const id = btn.dataset.id;
      const card = btn.closest('.schedule-card');
      const icon = btn.querySelector('.round-icon');
      
      btn.disabled = true;
      card?.classList.add('executing');
      if (icon) icon.textContent = 'sync';
      
      try {
        await api(`/api/servers/${currentServerId$3}/schedules/${id}/execute`, { method: 'POST' });
        success('Schedule executed');
        await loadSchedules();
      } catch {
        error('Failed to execute schedule');
      }
      
      btn.disabled = false;
      card?.classList.remove('executing');
      if (icon) icon.textContent = 'play_arrow';
    };
  });
  
  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.onclick = () => showEditScheduleModal(btn.dataset.id);
  });
  
  document.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.onclick = () => duplicateSchedule(btn.dataset.id);
  });
  
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Schedule', message: 'Delete this schedule?', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/servers/${currentServerId$3}/schedules/${btn.dataset.id}`, { method: 'DELETE' });
        success('Schedule deleted');
        await loadSchedules();
      } catch {
        error('Failed to delete schedule');
      }
    };
  });
  
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.onclick = () => showAddTaskModal(btn.dataset.schedule);
  });
  
  document.querySelectorAll('[data-action="edit-task"]').forEach(btn => {
    btn.onclick = () => showEditTaskModal(btn.dataset.schedule, btn.dataset.task);
  });
  
  document.querySelectorAll('[data-action="delete-task"]').forEach(btn => {
    btn.onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Task', message: 'Delete this task?', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/servers/${currentServerId$3}/schedules/${btn.dataset.schedule}/tasks/${btn.dataset.task}`, { method: 'DELETE' });
        success('Task deleted');
        await loadSchedules();
      } catch {
        error('Failed to delete task');
      }
    };
  });
}

function showCreateScheduleModal() {
  showScheduleModal(null);
}

async function duplicateSchedule(id) {
  try {
    const res = await api(`/api/servers/${currentServerId$3}/schedules/${id}`);
    const data = await res.json();
    const original = data.schedule;
    
    // Crear copia con nombre modificado
    const duplicate = {
      ...original,
      id: null,
      name: `${original.name} (Copy)`,
      is_active: false
    };
    
    showScheduleModal(duplicate, true);
  } catch {
    error('Failed to load schedule');
  }
}

async function showEditScheduleModal(id) {
  try {
    const res = await api(`/api/servers/${currentServerId$3}/schedules/${id}`);
    const data = await res.json();
    showScheduleModal(data.schedule);
  } catch {
    error('Failed to load schedule');
  }
}

function showScheduleModal(schedule, isDuplicate = false) {
  const existing = document.getElementById('schedule-modal');
  if (existing) existing.remove();
  
  const isEdit = !!schedule && !isDuplicate;
  
  const modal = document.createElement('div');
  modal.id = 'schedule-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Schedule' : isDuplicate ? 'Duplicate Schedule' : 'Create Schedule'}</h3>
        <button class="modal-close" id="close-schedule-modal">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="schedule-form" class="modal-body">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${schedule?.name || ''}" required maxlength="100" placeholder="Daily Restart" />
        </div>
        
        <div class="form-section-title">Schedule (Cron)</div>
        <div class="cron-inputs">
          <div class="form-group">
            <label>Minute</label>
            <input type="text" name="minute" value="${schedule?.cron?.minute || '*'}" placeholder="*" />
            <small>0-59 or *</small>
          </div>
          <div class="form-group">
            <label>Hour</label>
            <input type="text" name="hour" value="${schedule?.cron?.hour || '*'}" placeholder="*" />
            <small>0-23 or *</small>
          </div>
          <div class="form-group">
            <label>Day of Month</label>
            <input type="text" name="day_of_month" value="${schedule?.cron?.day_of_month || '*'}" placeholder="*" />
            <small>1-31 or *</small>
          </div>
          <div class="form-group">
            <label>Day of Week</label>
            <input type="text" name="day_of_week" value="${schedule?.cron?.day_of_week || '*'}" placeholder="*" />
            <small>0-6 or *</small>
          </div>
          <div class="form-group">
            <label>Month</label>
            <input type="text" name="month" value="${schedule?.cron?.month || '*'}" placeholder="*" />
            <small>1-12 or *</small>
          </div>
        </div>
        
        <div class="cron-error" id="cron-error" style="display: none;"></div>
        
        <div class="form-toggles">
          <label class="toggle-item">
            <input type="checkbox" name="is_active" ${schedule?.is_active !== false ? 'checked' : ''} />
            <span class="toggle-content">
              <span class="toggle-title">Active</span>
              <span class="toggle-desc">Enable this schedule</span>
            </span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" name="only_when_online" ${schedule?.only_when_online ? 'checked' : ''} />
            <span class="toggle-content">
              <span class="toggle-title">Only When Online</span>
              <span class="toggle-desc">Only run when server is online</span>
            </span>
          </label>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancel-schedule-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : isDuplicate ? 'Duplicate' : 'Create'}</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  };
  document.getElementById('close-schedule-modal').onclick = closeModal;
  document.getElementById('cancel-schedule-modal').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  
  document.getElementById('schedule-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const cronError = document.getElementById('cron-error');
    
    // Validar campos cron
    const errors = validateAllCronFields(form);
    if (errors.length > 0) {
      cronError.textContent = errors.join('. ');
      cronError.style.display = 'block';
      return;
    }
    cronError.style.display = 'none';
    
    btn.disabled = true;
    
    const payload = {
      name: form.name.value,
      minute: form.minute.value || '*',
      hour: form.hour.value || '*',
      day_of_month: form.day_of_month.value || '*',
      day_of_week: form.day_of_week.value || '*',
      month: form.month.value || '*',
      is_active: form.is_active.checked,
      only_when_online: form.only_when_online.checked
    };
    
    try {
      const url = isEdit 
        ? `/api/servers/${currentServerId$3}/schedules/${schedule.id}`
        : `/api/servers/${currentServerId$3}/schedules`;
      
      const res = await api(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save schedule');
      }
      
      success(isEdit ? 'Schedule updated' : 'Schedule created');
      closeModal();
      await loadSchedules();
    } catch (err) {
      error(err.message || 'Failed to save schedule');
      btn.disabled = false;
    }
  };
}

function showAddTaskModal(scheduleId) {
  showTaskModal(scheduleId, null);
}

async function showEditTaskModal(scheduleId, taskId) {
  try {
    const res = await api(`/api/servers/${currentServerId$3}/schedules/${scheduleId}`);
    const data = await res.json();
    const task = data.schedule.tasks?.find(t => t.id === taskId);
    if (task) showTaskModal(scheduleId, task);
  } catch {
    error('Failed to load task');
  }
}

function showTaskModal(scheduleId, task) {
  const existing = document.getElementById('task-modal');
  if (existing) existing.remove();
  
  const isEdit = !!task;
  
  const modal = document.createElement('div');
  modal.id = 'task-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Task' : 'Add Task'}</h3>
        <button class="modal-close" id="close-task-modal">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="task-form" class="modal-body">
        <div class="form-group">
          <label>Action</label>
          <select name="action" id="task-action" required>
            <option value="command" ${task?.action === 'command' ? 'selected' : ''}>Send Command</option>
            <option value="power" ${task?.action === 'power' ? 'selected' : ''}>Power Action</option>
            <option value="backup" ${task?.action === 'backup' ? 'selected' : ''}>Create Backup</option>
          </select>
        </div>
        
        <div class="form-group" id="payload-group">
          <label id="payload-label">Command</label>
          <input type="text" name="payload" id="payload-input" value="${escapeHtml$1(task?.payload || '')}" placeholder="say Server restarting in 5 minutes!" />
        </div>
        
        <div class="form-group" id="power-group" style="display: none;">
          <label>Power Action</label>
          <select name="power_action" id="power-select">
            <option value="start" ${task?.payload === 'start' ? 'selected' : ''}>Start</option>
            <option value="stop" ${task?.payload === 'stop' ? 'selected' : ''}>Stop</option>
            <option value="restart" ${task?.payload === 'restart' ? 'selected' : ''}>Restart</option>
            <option value="kill" ${task?.payload === 'kill' ? 'selected' : ''}>Kill</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Time Offset (seconds)</label>
          <input type="number" name="time_offset" value="${task?.time_offset || 0}" min="0" max="900" />
          <small>Delay before executing this task (0-900 seconds)</small>
        </div>
        
        <div class="form-toggles">
          <label class="toggle-item">
            <input type="checkbox" name="continue_on_failure" ${task?.continue_on_failure ? 'checked' : ''} />
            <span class="toggle-content">
              <span class="toggle-title">Continue on Failure</span>
              <span class="toggle-desc">Continue to next task if this one fails</span>
            </span>
          </label>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancel-task-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add Task'}</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  };
  document.getElementById('close-task-modal').onclick = closeModal;
  document.getElementById('cancel-task-modal').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  
  const actionSelect = document.getElementById('task-action');
  const payloadGroup = document.getElementById('payload-group');
  const powerGroup = document.getElementById('power-group');
  const payloadLabel = document.getElementById('payload-label');
  
  function updatePayloadVisibility() {
    const action = actionSelect.value;
    if (action === 'command') {
      payloadGroup.style.display = 'block';
      powerGroup.style.display = 'none';
      payloadLabel.textContent = 'Command';
    } else if (action === 'power') {
      payloadGroup.style.display = 'none';
      powerGroup.style.display = 'block';
    } else {
      payloadGroup.style.display = 'none';
      powerGroup.style.display = 'none';
    }
  }
  
  actionSelect.onchange = updatePayloadVisibility;
  updatePayloadVisibility();
  
  document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const action = form.action.value;
    let payload = '';
    
    if (action === 'command') {
      payload = form.payload.value;
    } else if (action === 'power') {
      payload = form.power_action.value;
    }
    
    const data = {
      action,
      payload,
      time_offset: parseInt(form.time_offset.value) || 0,
      continue_on_failure: form.continue_on_failure.checked
    };
    
    try {
      const url = isEdit 
        ? `/api/servers/${currentServerId$3}/schedules/${scheduleId}/tasks/${task.id}`
        : `/api/servers/${currentServerId$3}/schedules/${scheduleId}/tasks`;
      
      const res = await api(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save task');
      }
      
      success(isEdit ? 'Task updated' : 'Task added');
      closeModal();
      await loadSchedules();
    } catch (err) {
      error(err.message || 'Failed to save task');
      btn.disabled = false;
    }
  };
}

// Helpers
function validateCronField(value, min, max, fieldName) {
  if (value === '*') return null;
  
  // Soportar rangos (e.g., 1-5), listas (e.g., 1,3,5), y pasos (e.g., */5)
  const patterns = value.split(',');
  for (const pattern of patterns) {
    if (pattern.includes('/')) {
      const [range, step] = pattern.split('/');
      if (range !== '*' && !validateCronField(range, min, max, fieldName)) {
        return `Invalid step in ${fieldName}`;
      }
      const stepNum = parseInt(step);
      if (isNaN(stepNum) || stepNum < 1) {
        return `Invalid step value in ${fieldName}`;
      }
    } else if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        return `Invalid range in ${fieldName} (${min}-${max})`;
      }
    } else {
      const num = parseInt(pattern);
      if (isNaN(num) || num < min || num > max) {
        return `${fieldName} must be ${min}-${max} or *`;
      }
    }
  }
  return null;
}

function validateAllCronFields(form) {
  const errors = [];
  
  const minuteErr = validateCronField(form.minute.value || '*', 0, 59, 'Minute');
  if (minuteErr) errors.push(minuteErr);
  
  const hourErr = validateCronField(form.hour.value || '*', 0, 23, 'Hour');
  if (hourErr) errors.push(hourErr);
  
  const dayErr = validateCronField(form.day_of_month.value || '*', 1, 31, 'Day of month');
  if (dayErr) errors.push(dayErr);
  
  const dowErr = validateCronField(form.day_of_week.value || '*', 0, 6, 'Day of week');
  if (dowErr) errors.push(dowErr);
  
  const monthErr = validateCronField(form.month.value || '*', 1, 12, 'Month');
  if (monthErr) errors.push(monthErr);
  
  return errors;
}

function formatCron(cron) {
  if (!cron) return 'Not set';
  const { minute, hour, day_of_month, day_of_week, month } = cron;
  
  const allWildcard = minute === '*' && hour === '*' && day_of_month === '*' && day_of_week === '*' && month === '*';
  if (allWildcard) return 'Every minute';
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Casos comunes legibles
  if (day_of_month === '*' && month === '*') {
    if (hour !== '*' && minute !== '*' && day_of_week === '*') {
      return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    if (hour !== '*' && minute !== '*' && day_of_week !== '*') {
      const dayName = days[parseInt(day_of_week)] || day_of_week;
      return `Every ${dayName} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    if (hour === '*' && minute !== '*' && day_of_week === '*') {
      return `Every hour at minute ${minute}`;
    }
  }
  
  if (minute !== '*' && hour !== '*' && day_of_month !== '*' && month !== '*') {
    const monthName = months[parseInt(month)] || month;
    return `${monthName} ${day_of_month} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  
  // Formato descriptivo genérico
  let desc = [];
  
  if (minute !== '*' && hour !== '*') {
    desc.push(`at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
  } else if (minute !== '*') {
    desc.push(`at minute ${minute}`);
  } else if (hour !== '*') {
    desc.push(`at hour ${hour}`);
  }
  
  if (day_of_month !== '*') desc.push(`on day ${day_of_month}`);
  if (day_of_week !== '*') {
    const dayName = days[parseInt(day_of_week)] || day_of_week;
    desc.push(`on ${dayName}`);
  }
  if (month !== '*') {
    const monthName = months[parseInt(month)] || month;
    desc.push(`in ${monthName}`);
  }
  
  return desc.length > 0 ? desc.join(', ') : 'Every minute';
}

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = date - now;
  const absDiff = Math.abs(diff);
  
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);
  
  let text;
  if (minutes < 1) text = 'just now';
  else if (minutes < 60) text = `${minutes}m`;
  else if (hours < 24) text = `${hours}h`;
  else text = `${days}d`;
  
  return diff > 0 ? `in ${text}` : `${text} ago`;
}

function getActionLabel(action) {
  const labels = {
    command: 'Command',
    power: 'Power',
    backup: 'Backup'
  };
  return labels[action] || action;
}

let currentServerId$2 = null;
let serverData$1 = null;

function renderSettingsTab() {
  return `
    <div class="settings-tab">
      <div class="settings-content">
        <div class="settings-section">
          <div class="section-header">
            <span class="round-icon">dns</span>
            <h3>Server Details</h3>
          </div>
          <div id="settings-details">
            <div class="loading-spinner"></div>
          </div>
        </div>
        
        <div class="settings-section danger-section">
          <div class="section-header">
            <span class="round-icon">warning</span>
            <h3>Danger Zone</h3>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Reinstall Server</span>
              <span class="setting-description">Delete all server files and reinstall from scratch</span>
            </div>
            <button class="btn btn-warning" id="btn-reinstall">
              <span class="round-icon">refresh</span>
              <span>Reinstall</span>
            </button>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Delete Server</span>
              <span class="setting-description">Permanently delete this server and all its data</span>
            </div>
            <button class="btn btn-danger" id="btn-delete">
              <span class="round-icon">delete_forever</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function initSettingsTab(serverId) {
  currentServerId$2 = serverId;
  
  // Attach event listeners immediately (buttons exist from renderSettingsTab)
  const reinstallBtn = document.getElementById('btn-reinstall');
  const deleteBtn = document.getElementById('btn-delete');
  
  if (reinstallBtn) reinstallBtn.onclick = () => confirmReinstall();
  if (deleteBtn) deleteBtn.onclick = () => confirmDelete();
  
  // Load details async (will render the form when ready)
  await loadServerDetails$1(serverId);
}

async function loadServerDetails$1(serverId) {
  const content = document.getElementById('settings-details');
  if (!content) {
    console.error('Settings details container not found');
    return;
  }
  
  try {
    const res = await api(`/api/servers/${serverId}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      content.innerHTML = `<div class="error">${escapeHtml$1(errorData.error || 'Failed to load server')}</div>`;
      return;
    }
    
    const data = await res.json();
    
    if (!data.server) {
      content.innerHTML = '<div class="error">Invalid server response</div>';
      return;
    }
    
    serverData$1 = data.server;
    renderDetailsForm(serverData$1);
  } catch (e) {
    console.error('Failed to load server details:', e);
    if (content) {
      content.innerHTML = '<div class="error">Failed to load server details</div>';
    }
  }
}

function renderDetailsForm(server) {
  const content = document.getElementById('settings-details');
  
  content.innerHTML = `
    <form id="details-form" class="settings-form">
      <div class="form-group">
        <label for="server-name-input">Server Name</label>
        <div class="input-wrapper">
          <span class="round-icon">badge</span>
          <input type="text" id="server-name-input" name="name" value="${escapeHtml$1(server.name)}" maxlength="50" required />
        </div>
      </div>
      
      <div class="form-group">
        <label for="server-description-input">Description</label>
        <div class="textarea-wrapper">
          <textarea id="server-description-input" name="description" rows="3" maxlength="200" placeholder="Optional server description...">${escapeHtml$1(server.description || '')}</textarea>
        </div>
      </div>
      
      <div class="form-info">
        <div class="info-row">
          <span class="info-label">Server ID</span>
          <code class="info-value">${escapeHtml$1(server.id)}</code>
        </div>
        <div class="info-row">
          <span class="info-label">Created</span>
          <span class="info-value">${formatDate$2(server.created_at)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Port</span>
          <span class="info-value">${server.allocation?.port || 25565}</span>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="save-details">
          <span class="round-icon">save</span>
          Save Changes
        </button>
      </div>
    </form>
  `;
  
  document.getElementById('details-form').onsubmit = (e) => {
    e.preventDefault();
    saveDetails();
  };
}

async function saveDetails() {
  const saveBtn = document.getElementById('save-details');
  
  const nameInput = document.getElementById('server-name-input');
  const descInput = document.getElementById('server-description-input');
  
  if (!nameInput || !descInput) {
    error('Form elements not found');
    return;
  }
  
  const name = nameInput.value.trim();
  const description = descInput.value.trim();
  
  if (!name) {
    warning('Server name is required');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="round-icon">hourglass_empty</span> Saving...';
  
  try {
    const res = await api(`/api/servers/${currentServerId$2}/details`, {
      method: 'PUT',
      
      body: JSON.stringify({ name, description })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      success('Server details saved');
      saveBtn.innerHTML = '<span class="round-icon">check</span> Saved';
      
      // Update server data cache
      if (serverData$1) {
        serverData$1.name = name;
        serverData$1.description = description;
      }
      
      const serverNameEl = document.getElementById('server-name-header');
      if (serverNameEl) serverNameEl.textContent = name;
      
      const headerNameEl = document.querySelector('.server-title h1');
      if (headerNameEl) headerNameEl.textContent = name;
      
      // Also update the main page server name
      const mainServerName = document.getElementById('server-name');
      if (mainServerName) mainServerName.textContent = name;
      
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="round-icon">save</span> Save Changes';
      }, 1500);
    } else {
      error(data.error || 'Failed to save');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="round-icon">save</span> Save Changes';
    }
  } catch (e) {
    console.error('Failed to save details:', e);
    error('Failed to save server details');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="round-icon">save</span> Save Changes';
  }
}

function confirmReinstall() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Reinstall Server</h3>
        <button class="modal-close">
          <span class="round-icon">close</span>
        </button>
      </div>
      <div class="warning-box">
        <span class="round-icon">warning</span>
        <p>This will delete all server files and reinstall the server from scratch. This action cannot be undone!</p>
      </div>
      <p style="margin-bottom: 12px; color: var(--text-secondary);">Type <strong style="color: var(--text-primary);">REINSTALL</strong> to confirm:</p>
      <input type="text" class="text-input" id="confirm-reinstall-input" placeholder="REINSTALL" style="width: 100%; text-align: center;" />
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-reinstall">Cancel</button>
        <button class="btn btn-warning" id="do-reinstall" disabled>Reinstall Server</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
  
  const input = document.getElementById('confirm-reinstall-input');
  const doBtn = document.getElementById('do-reinstall');
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  };
  
  input.oninput = () => {
    doBtn.disabled = input.value !== 'REINSTALL';
  };
  
  modal.querySelector('.modal-close').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  document.getElementById('cancel-reinstall').onclick = closeModal;
  
  doBtn.onclick = async () => {
    doBtn.disabled = true;
    doBtn.innerHTML = '<span class="round-icon">hourglass_empty</span> Reinstalling...';
    await reinstallServer();
    closeModal();
  };
}

async function reinstallServer() {
  try {
    const res = await api(`/api/servers/${currentServerId$2}/reinstall`, {
      method: 'POST',
      
      body: JSON.stringify({})
    });
    
    const data = await res.json();
    
    if (res.ok) {
      success('Server reinstall initiated');
      window.router.navigateTo('/servers');
    } else {
      error(data.error || 'Failed to reinstall');
    }
  } catch (e) {
    console.error('Failed to reinstall server:', e);
    error('Failed to reinstall server');
  }
}

function confirmDelete() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Delete Server</h3>
        <button class="modal-close">
          <span class="round-icon">close</span>
        </button>
      </div>
      <div class="warning-box danger">
        <span class="round-icon">error</span>
        <p>This will permanently delete the server and all its data. This action cannot be undone!</p>
      </div>
      <p style="margin-bottom: 12px; color: var(--text-secondary);">Type <strong style="color: var(--text-primary);">DELETE</strong> to confirm:</p>
      <input type="text" class="text-input" id="confirm-delete-input" placeholder="DELETE" style="width: 100%; text-align: center;" />
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-delete">Cancel</button>
        <button class="btn btn-danger" id="do-delete" disabled>Delete Server</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
  
  const input = document.getElementById('confirm-delete-input');
  const doBtn = document.getElementById('do-delete');
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  };
  
  input.oninput = () => {
    doBtn.disabled = input.value !== 'DELETE';
  };
  
  modal.querySelector('.modal-close').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  document.getElementById('cancel-delete').onclick = closeModal;
  
  doBtn.onclick = async () => {
    doBtn.disabled = true;
    doBtn.innerHTML = '<span class="round-icon">hourglass_empty</span> Deleting...';
    await deleteServer();
    closeModal();
  };
}

async function deleteServer() {
  try {
    const res = await api(`/api/servers/${currentServerId$2}`, {
      method: 'DELETE',
      
      body: JSON.stringify({})
    });
    
    const data = await res.json();
    
    if (res.ok) {
      success('Server deleted');
      window.router.navigateTo('/servers');
    } else {
      error(data.error || 'Failed to delete');
    }
  } catch (e) {
    console.error('Failed to delete server:', e);
    error('Failed to delete server');
  }
}

function formatDate$2(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cleanupSettingsTab() {
  currentServerId$2 = null;
  serverData$1 = null;
}

let currentServerId$1 = null;
let autoRefreshInterval = null;
let isModalOpen = false;

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

function renderBackupsTab() {
  return `
    <div class="backups-tab">
      <div class="tab-header">
        <h3>Backups</h3>
        <div>
          <button class="btn btn-ghost btn-sm" id="btn-refresh-backups" title="Refresh">
            <span class="round-icon">refresh</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btn-create-backup">
            <span class="round-icon">add</span>
            Create Backup
          </button>
        </div>
      </div>
      <div class="backups-list" id="backups-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
}

async function initBackupsTab(serverId) {
  currentServerId$1 = serverId;
  
  document.getElementById('btn-create-backup').onclick = () => createBackup(serverId);
  document.getElementById('btn-refresh-backups').onclick = () => refreshBackups();
  
  await loadBackups(serverId);
  startAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshInterval = setInterval(() => {
    if (!isModalOpen && currentServerId$1) {
      loadBackups(currentServerId$1);
    }
  }, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

async function refreshBackups() {
  if (!currentServerId$1) return;
  
  const btn = document.getElementById('btn-refresh-backups');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('.round-icon').classList.add('spinning');
  }
  
  await loadBackups(currentServerId$1);
  
  if (btn) {
    btn.disabled = false;
    btn.querySelector('.round-icon').classList.remove('spinning');
  }
}

async function loadBackups(serverId) {
  const container = document.getElementById('backups-list');
  
  try {
    const res = await api(`/api/servers/${serverId}/backups`);
    const data = await res.json();
    
    if (!res.ok) {
      container.innerHTML = `<div class="error">${data.error || 'Failed to load backups'}</div>`;
      return;
    }
    
    const backups = data.backups || [];
    
    if (backups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="round-icon">cloud_off</span>
          <p>No backups yet</p>
          <p class="hint">Create a backup to save your server files</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = backups.map(backup => `
      <div class="backup-item ${backup.is_successful ? '' : 'pending'}" data-id="${backup.id}">
        <div class="backup-icon">
          <span class="round-icon ${backup.is_successful ? '' : 'spinning'}">
            ${backup.is_successful ? 'cloud_done' : 'cloud_sync'}
          </span>
        </div>
        <div class="backup-info">
          <div class="backup-name">
            ${backup.name}
            ${backup.is_locked ? '<span class="round-icon locked-icon">lock</span>' : ''}
          </div>
          <div class="backup-meta">
            ${backup.is_successful ? formatBytes(backup.bytes || 0) : '<span class="backup-progress">Creating backup...</span>'}
            <span class="separator">•</span>
            ${formatDate$4(backup.created_at)}
          </div>
          ${backup.checksum ? `<div class="backup-checksum" title="SHA256 Checksum">Checksum: ${backup.checksum}</div>` : ''}
        </div>
        <div class="backup-actions">
          ${backup.is_successful ? `
            <button class="btn btn-xs btn-ghost" title="Download" data-action="download">
              <span class="round-icon">download</span>
            </button>
            <button class="btn btn-xs btn-ghost" title="Restore" data-action="restore">
              <span class="round-icon">restore</span>
            </button>
          ` : `
            <div class="backup-pending-indicator">
              <div class="progress-bar-mini">
                <div class="progress-bar-mini-fill"></div>
              </div>
            </div>
          `}
          <button class="btn btn-xs btn-ghost" title="${backup.is_locked ? 'Unlock' : 'Lock'}" data-action="lock">
            <span class="round-icon">${backup.is_locked ? 'lock_open' : 'lock'}</span>
          </button>
          <button class="btn btn-xs btn-ghost btn-danger" title="Delete" data-action="delete" ${backup.is_locked ? 'disabled' : ''}>
            <span class="round-icon">delete</span>
          </button>
        </div>
      </div>
    `).join('');
    
    // Attach event listeners
    container.querySelectorAll('.backup-item').forEach(item => {
      const backupId = item.dataset.id;
      
      item.querySelector('[data-action="download"]')?.addEventListener('click', () => {
        downloadBackup(serverId, backupId);
      });
      
      item.querySelector('[data-action="restore"]')?.addEventListener('click', () => {
        restoreBackup(serverId, backupId);
      });
      
      item.querySelector('[data-action="lock"]')?.addEventListener('click', () => {
        toggleLock(serverId, backupId);
      });
      
      item.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        deleteBackup(serverId, backupId);
      });
    });
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load backups</div>`;
  }
}

function validateBackupName(name) {
  if (!name) return true;
  if (name.length > 100) return 'Name must be 100 characters or less';
  if (/[<>:"/\\|?*]/.test(name)) return 'Name contains invalid characters';
  return true;
}

async function createBackup(serverId) {
  isModalOpen = true;
  
  const content = `
    <div class="form-group">
      <label>Backup Name (optional)</label>
      <input type="text" id="backup-name" placeholder="My Backup" maxlength="100" />
      <p class="hint error-hint" id="backup-name-error"></p>
    </div>
    <div class="form-group">
      <label>Ignored Files (optional)</label>
      <textarea id="backup-ignored" placeholder="*.log&#10;cache/*" rows="3"></textarea>
      <p class="hint">One pattern per line. These files will be excluded from the backup.</p>
    </div>
  `;
  
  show({
    title: 'Create Backup',
    content,
    confirmText: 'Create',
    onConfirm: async () => {
      const name = document.getElementById('backup-name').value.trim();
      const errorEl = document.getElementById('backup-name-error');
      
      const validation = validateBackupName(name);
      if (validation !== true) {
        errorEl.textContent = validation;
        return false;
      }
      
      const ignoredText = document.getElementById('backup-ignored').value.trim();
      const ignored = ignoredText ? ignoredText.split('\n').map(s => s.trim()).filter(Boolean) : [];
      
      try {
        const res = await api(`/api/servers/${serverId}/backups`, {
          method: 'POST',
          body: JSON.stringify({ name, ignored })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          error(data.error || 'Failed to create backup');
          return;
        }
        
        success('Backup started');
        loadBackups(serverId);
      } catch (e) {
        error('Failed to create backup');
      }
    },
    onClose: () => {
      isModalOpen = false;
    }
  });
  
  const nameInput = document.getElementById('backup-name');
  const errorEl = document.getElementById('backup-name-error');
  
  nameInput?.addEventListener('input', () => {
    const validation = validateBackupName(nameInput.value.trim());
    errorEl.textContent = validation === true ? '' : validation;
  });
}

async function downloadBackup(serverId, backupId) {
  try {
    const res = await api(`/api/servers/${serverId}/backups/${backupId}/download`);
    const data = await res.json();
    
    if (!res.ok) {
      error(data.error || 'Failed to get download URL');
      return;
    }
    
    if (data.url) {
      window.open(data.url, '_blank');
    } else {
      error('Download URL not available');
    }
  } catch (e) {
    error('Failed to download backup');
  }
}

async function restoreBackup(serverId, backupId) {
  confirm({
    title: 'Restore Backup',
    message: 'Are you sure you want to restore this backup? This will overwrite current server files.',
    confirmText: 'Restore',
    danger: true,
    onConfirm: async () => {
      try {
        const res = await api(`/api/servers/${serverId}/backups/${backupId}/restore`, {
          method: 'POST'
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          error(data.error || 'Failed to restore backup');
          return;
        }
        
        success('Backup restore started');
      } catch (e) {
        error('Failed to restore backup');
      }
    }
  });
}

async function toggleLock(serverId, backupId) {
  try {
    const res = await api(`/api/servers/${serverId}/backups/${backupId}/lock`, {
      method: 'POST'
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      error(data.error || 'Failed to toggle lock');
      return;
    }
    
    success(data.is_locked ? 'Backup locked' : 'Backup unlocked');
    loadBackups(serverId);
  } catch (e) {
    error('Failed to toggle lock');
  }
}

async function deleteBackup(serverId, backupId) {
  confirm({
    title: 'Delete Backup',
    message: 'Are you sure you want to delete this backup? This action cannot be undone.',
    confirmText: 'Delete',
    danger: true,
    onConfirm: async () => {
      try {
        const res = await api(`/api/servers/${serverId}/backups/${backupId}`, {
          method: 'DELETE'
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          error(data.error || 'Failed to delete backup');
          return;
        }
        
        success('Backup deleted');
        loadBackups(serverId);
      } catch (e) {
        error('Failed to delete backup');
      }
    }
  });
}

function cleanupBackupsTab() {
  stopAutoRefresh();
  currentServerId$1 = null;
  isModalOpen = false;
}

let _pluginData = null;
let _loading = null;
const _clientModules = new Map();
const _renderFns = {
  pages: new Map(),
  serverTabs: new Map(),
  widgets: new Map(),
  adminPages: new Map()
};
const _eventHandlers = {};

// --- Event system for client-side plugins ---

function emitPluginEvent(event, data) {
  const handlers = _eventHandlers[event];
  if (!handlers) return;
  for (const fn of handlers) {
    try { fn(data); } catch (e) { console.warn(`[Plugin event] ${event} error:`, e); }
  }
}

function onPluginEvent(event, handler) {
  if (!_eventHandlers[event]) _eventHandlers[event] = [];
  _eventHandlers[event].push(handler);
}

function offPluginEvent(event, handler) {
  if (!_eventHandlers[event]) return;
  _eventHandlers[event] = _eventHandlers[event].filter(h => h !== handler);
}

// --- Create client-side sodium API for a plugin ---

function createClientApi(pluginMeta) {
  const pluginId = pluginMeta.id;

  return {
    plugin: {
      id: pluginId,
      name: pluginMeta.name,
      version: pluginMeta.version
    },

    api: (path, opts = {}) => {
      const url = `/api/plugins/${pluginId}${path.startsWith('/') ? path : '/' + path}`;
      return api(url, opts);
    },

    ui: {
      onRenderPage(pageId, renderFn) {
        _renderFns.pages.set(`${pluginId}:${pageId}`, renderFn);
      },
      onRenderServerTab(tabId, renderFn) {
        _renderFns.serverTabs.set(`${pluginId}:${tabId}`, renderFn);
      },
      onRenderWidget(widgetId, renderFn) {
        _renderFns.widgets.set(`${pluginId}:${widgetId}`, renderFn);
      },
      onRenderAdminPage(pageId, renderFn) {
        _renderFns.adminPages.set(`${pluginId}:${pageId}`, renderFn);
      }
    },

    events: {
      on: onPluginEvent,
      off: offPluginEvent,
      emit: emitPluginEvent
    },

    navigate(path) {
      if (window.router?.navigateTo) {
        window.router.navigateTo(path);
      }
    },

    toast: {
      success: (msg) => success(msg),
      error: (msg) => error(msg),
      info: (msg) => info?.(msg) || success(msg)
    },

    modal: {
      show: (opts) => show(opts),
      confirm: (opts) => confirm?.(opts) || show(opts)
    },

    escapeHtml: escapeHtml$1
  };
}

// --- Load plugin metadata + client modules ---

async function loadPluginData() {
  if (_pluginData) return _pluginData;
  if (_loading) return _loading;

  _loading = (async () => {
    try {
      const res = await fetch('/api/plugins/client-data');
      const data = await res.json();
      _pluginData = data.plugins || [];
    } catch {
      _pluginData = [];
    }

    // Load client modules for plugins that have them
    const loadPromises = _pluginData
      .filter(p => p.hasClient)
      .map(async (pluginMeta) => {
        try {
          const mod = await import(`/api/plugins/${pluginMeta.id}/client.js`);
          if (typeof mod.default === 'function') {
            const clientApi = createClientApi(pluginMeta);
            const result = mod.default(clientApi);
            _clientModules.set(pluginMeta.id, result || {});
          }
        } catch (e) {
          console.warn(`[Plugins] Failed to load client for "${pluginMeta.id}":`, e);
        }
      });

    await Promise.allSettled(loadPromises);
    _loading = null;
    return _pluginData;
  })();

  return _loading;
}

// --- Sidebar items ---

function getPluginSidebarItems() {
  if (!_pluginData) return [];
  const items = [];
  for (const plugin of _pluginData) {
    if (plugin.sidebarItems) {
      items.push(...plugin.sidebarItems);
    }
    // Auto-add sidebar items for pages that don't have manual sidebar entries
    if (plugin.pages) {
      for (const page of plugin.pages) {
        if (page.sidebar !== false) {
          const alreadyAdded = items.some(i => i.href === page.path);
          if (!alreadyAdded) {
            items.push({
              href: page.path,
              icon: page.icon || 'extension',
              label: page.title || page.id
            });
          }
        }
      }
    }
  }
  return items;
}

// --- Plugin pages (routes) ---

function getPluginPages() {
  if (!_pluginData) return [];
  const pages = [];
  for (const plugin of _pluginData) {
    if (plugin.pages) {
      for (const page of plugin.pages) {
        pages.push({ ...page, pluginId: plugin.id });
      }
    }
  }
  return pages;
}

function renderPluginPage(pluginId, pageId, container) {
  const key = `${pluginId}:${pageId}`;
  const renderFn = _renderFns.pages.get(key);
  if (renderFn) {
    renderFn(container);
    emitPluginEvent('page.rendered', { pluginId, pageId });
    return true;
  }
  container.innerHTML = `
    <div class="empty-state">
      <span class="round-icon">extension_off</span>
      <p>Plugin page not available</p>
    </div>
  `;
  return false;
}

// --- Server tabs ---

function getPluginServerTabs() {
  if (!_pluginData) return [];
  const tabs = [];
  for (const plugin of _pluginData) {
    if (plugin.serverTabs) {
      for (const tab of plugin.serverTabs) {
        tabs.push({ ...tab, pluginId: plugin.id });
      }
    }
  }
  return tabs;
}

function renderPluginServerTab(pluginId, tabId, container, serverId) {
  const key = `${pluginId}:${tabId}`;
  const renderFn = _renderFns.serverTabs.get(key);
  if (renderFn) {
    renderFn(container, serverId);
    emitPluginEvent('serverTab.rendered', { pluginId, tabId, serverId });
    return true;
  }
  container.innerHTML = `<div class="empty-state"><p>Tab content not available</p></div>`;
  return false;
}

// --- Dashboard widgets ---

function getPluginDashboardWidgets() {
  if (!_pluginData) return [];
  const widgets = [];
  for (const plugin of _pluginData) {
    if (plugin.dashboardWidgets) {
      for (const widget of plugin.dashboardWidgets) {
        widgets.push({ ...widget, pluginId: plugin.id });
      }
    }
  }
  return widgets;
}

function renderPluginWidget(pluginId, widgetId, container) {
  const key = `${pluginId}:${widgetId}`;
  const renderFn = _renderFns.widgets.get(key);
  if (renderFn) {
    renderFn(container);
    return true;
  }
  return false;
}

// --- Admin pages ---

function getPluginAdminPages() {
  if (!_pluginData) return [];
  const pages = [];
  for (const plugin of _pluginData) {
    if (plugin.adminPages) {
      for (const page of plugin.adminPages) {
        pages.push({ ...page, pluginId: plugin.id });
      }
    }
  }
  return pages;
}

function renderPluginAdminPage(pluginId, pageId, container) {
  const key = `${pluginId}:${pageId}`;
  const renderFn = _renderFns.adminPages.get(key);
  if (renderFn) {
    renderFn(container);
    emitPluginEvent('adminPage.rendered', { pluginId, pageId });
    return true;
  }
  container.innerHTML = `<div class="empty-state"><p>Admin page not available</p></div>`;
  return false;
}

// --- Cache management ---

function clearPluginCache() {
  _pluginData = null;
  _loading = null;
  _clientModules.clear();
  _renderFns.pages.clear();
  _renderFns.serverTabs.clear();
  _renderFns.widgets.clear();
  _renderFns.adminPages.clear();
  for (const key of Object.keys(_eventHandlers)) {
    delete _eventHandlers[key];
  }
}

let currentServerId = null;
let serverLimits = null;
let currentTab = 'console';
let serverData = null;
let installCheckInterval = null;

const SPARK_POINTS = 10;
const sparkHistory = {
  cpu: [],
  mem: [],
  disk: []
};

const tabs = [
  { id: 'console', label: 'Console', icon: 'terminal' },
  { id: 'files', label: 'Files', icon: 'folder' },
  { id: 'backups', label: 'Backups', icon: 'cloud' },
  { id: 'schedules', label: 'Schedules', icon: 'schedule' },
  { id: 'network', label: 'Network', icon: 'lan' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'startup', label: 'Startup', icon: 'play_circle' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

function renderServerPage(serverId) {
  currentServerId = serverId;
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="server-page">
      <div class="node-down-banner" id="node-down-banner" style="display:none">
        <span class="round-icon">warning</span>
        <div class="node-down-text">
          <strong>Node Offline</strong>
          <p>The node hosting this server is currently unreachable. Actions like start, stop, and file management may not work until the node is back online.</p>
        </div>
      </div>
      <div class="server-header">
        <div class="server-header-left">
          <div class="server-title">
            <h1 id="server-name">Loading...</h1>
            <span class="server-status" id="server-status">--</span>
          </div>
        </div>
        <div class="server-header-right">
          <div class="power-buttons">
            <button class="power-action start" id="btn-start" title="Start">
              <span class="round-icon">play_arrow</span>
              Start
            </button>
            <button class="power-action restart" id="btn-restart" title="Restart">
              <span class="round-icon">refresh</span>
              Restart
            </button>
            <button class="power-action stop" id="btn-stop" title="Stop">
              <span class="round-icon">stop</span>
              Stop
            </button>
            <button class="power-action kill" id="btn-kill" title="Kill" style="display: none">
              Kill
            </button>
          </div>
        </div>
      </div>
      
      <div class="server-tabs">
        ${tabs.map(tab => `
          <button class="server-tab ${tab.id === currentTab ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}" 
                  data-tab="${tab.id}" ${tab.disabled ? 'disabled' : ''}>
            <span class="round-icon">${tab.icon}</span>
            <span>${tab.label}</span>
          </button>
        `).join('')}
        ${getPluginServerTabs().map(tab => `
          <button class="server-tab" data-tab="plugin:${tab.pluginId}:${tab.id}">
            <span class="round-icon">${tab.icon || 'extension'}</span>
            <span>${tab.label || tab.id}</span>
          </button>
        `).join('')}
      </div>
      
      <div class="server-content">
        <div class="server-main" id="tab-content"></div>
        <div class="server-sidebar">
          <div class="sidebar-section">
            <div class="section-header">
              <span class="round-icon">info</span>
              <h3>Server Info</h3>
            </div>
            <div class="sidebar-card">
              <span class="round-icon corner-icon">info</span>
              <div class="info-row">
                <span class="round-icon">language</span>
                <div class="info-content">
                  <span class="info-label">Address</span>
                  <span class="info-value" id="server-address">--</span>
                </div>
              </div>
              <div class="info-row">
                <span class="round-icon">dns</span>
                <div class="info-content">
                  <span class="info-label">Node</span>
                  <span class="info-value" id="server-node">--</span>
                </div>
              </div>
              <div class="info-row">
                <span class="round-icon">schedule</span>
                <div class="info-content">
                  <span class="info-label">Uptime</span>
                  <span class="info-value" id="server-uptime">--</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="sidebar-section">
            <div class="section-header">
              <span class="round-icon">data_usage</span>
              <h3>Resources</h3>
            </div>
            <div class="sidebar-card">
              <span class="round-icon corner-icon">data_usage</span>
              <svg style="width:0; height:0; position:absolute;" aria-hidden="true">
                <defs>
                  <linearGradient id="grad-cpu" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
                  </linearGradient>
                  <linearGradient id="grad-mem" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="var(--success)" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="var(--success)" stop-opacity="0" />
                  </linearGradient>
                  <linearGradient id="grad-disk" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="var(--warning)" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="var(--warning)" stop-opacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div class="resource-spark-item">
                <div class="resource-spark-header">
                  <div class="resource-spark-label">
                    <span class="round-icon">memory</span>
                    <span>CPU</span>
                  </div>
                  <span class="resource-spark-value" id="res-cpu-text">0%</span>
                </div>
                <div class="resource-spark-chart">
                  <svg id="spark-cpu" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <path class="spark-area" fill="url(#grad-cpu)" d="" />
                    <path class="spark-line cpu" d="M0,24 L100,24" fill="none" />
                  </svg>
                </div>
              </div>
              <div class="resource-spark-item">
                <div class="resource-spark-header">
                  <div class="resource-spark-label">
                    <span class="round-icon">storage</span>
                    <span>Memory</span>
                  </div>
                  <span class="resource-spark-value" id="res-mem-text">0 MB</span>
                </div>
                <div class="resource-spark-chart">
                  <svg id="spark-mem" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <path class="spark-area" fill="url(#grad-mem)" d="" />
                    <path class="spark-line memory" d="M0,24 L100,24" fill="none" />
                  </svg>
                </div>
              </div>
              <div class="resource-spark-item">
                <div class="resource-spark-header">
                  <div class="resource-spark-label">
                    <span class="round-icon">save</span>
                    <span>Disk</span>
                  </div>
                  <span class="resource-spark-value" id="res-disk-text">0 MB</span>
                </div>
                <div class="resource-spark-chart">
                  <svg id="spark-disk" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <path class="spark-area" fill="url(#grad-disk)" d="" />
                    <path class="spark-line disk" d="M0,24 L100,24" fill="none" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div class="sidebar-section">
            <div class="section-header">
              <span class="round-icon">swap_vert</span>
              <h3>Network</h3>
            </div>
            <div class="sidebar-card network-stats">
              <span class="round-icon corner-icon">swap_vert</span>
              <span class="round-icon corner-icon corner-icon-left">swap_vert</span>
              <div class="network-stat">
                <span class="round-icon tx">arrow_upward</span>
                <div class="stat-content">
                  <span class="stat-label">Outbound</span>
                  <span class="stat-value" id="res-net-tx">0 B</span>
                </div>
              </div>
              <div class="network-stat">
                <span class="round-icon rx">arrow_downward</span>
                <div class="stat-content">
                  <span class="stat-label">Inbound</span>
                  <span class="stat-value" id="res-net-rx">0 B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  setConsoleCallbacks(updateServerStatus, updateServerResources, getServerId);
  loadServerDetails(serverId);
  switchTab(currentTab);
  
  document.querySelectorAll('.server-tab:not(.disabled)').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
  
  document.getElementById('btn-start').onclick = () => powerAction(serverId, 'start');
  document.getElementById('btn-restart').onclick = () => powerAction(serverId, 'restart');
  
  document.getElementById('btn-stop').onclick = () => {
    powerAction(serverId, 'stop');
    const btnStop = document.getElementById('btn-stop');
    const btnKill = document.getElementById('btn-kill');
    if (btnStop && btnKill) {
        btnStop.style.display = 'none';
        btnKill.style.display = 'inline-flex';
    }
  };
  
  document.getElementById('btn-kill').onclick = () => powerAction(serverId, 'kill');
}

function switchTab(tabId) {
  cleanupCurrentTab();
  
  currentTab = tabId;
  
  document.querySelectorAll('.server-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  const content = document.getElementById('tab-content');
  const sidebar = document.querySelector('.server-sidebar');
  
  if (sidebar) {
    sidebar.style.display = tabId === 'console' ? 'flex' : 'none';
  }
  
  switch (tabId) {
    case 'console':
      content.innerHTML = renderConsoleTab();
      initConsoleTab(currentServerId);
      break;
    case 'files':
      content.innerHTML = renderFilesTab();
      initFilesTab(currentServerId);
      break;
    case 'backups':
      content.innerHTML = renderBackupsTab();
      initBackupsTab(currentServerId);
      break;
    case 'startup':
      content.innerHTML = renderStartupTab();
      initStartupTab(currentServerId);
      break;
    case 'schedules':
      content.innerHTML = renderSchedulesTab(currentServerId);
      initSchedulesTab(currentServerId);
      break;
    case 'network':
      content.innerHTML = renderNetworkTab();
      initNetworkTab(currentServerId);
      break;
    case 'users':
      content.innerHTML = renderUsersTab();
      initUsersTab(currentServerId);
      break;
    case 'settings':
      content.innerHTML = renderSettingsTab();
      initSettingsTab(currentServerId);
      break;
    default:
      // Handle plugin tabs (format: "plugin:pluginId:tabId")
      if (tabId.startsWith('plugin:')) {
        const parts = tabId.split(':');
        const pluginId = parts[1];
        const pluginTabId = parts[2];
        content.innerHTML = '';
        renderPluginServerTab(pluginId, pluginTabId, content, currentServerId);
      } else {
        content.innerHTML = `<div class="card"><p>Coming soon...</p></div>`;
      }
  }
}

function cleanupCurrentTab() {
  switch (currentTab) {
    case 'console':
      cleanupConsoleTab();
      break;
    case 'files':
      cleanupFilesTab();
      break;
    case 'backups':
      cleanupBackupsTab();
      break;
    case 'startup':
      cleanupStartupTab();
      break;
    case 'schedules':
      cleanupSchedulesTab();
      break;
    case 'network':
      cleanupNetworkTab();
      break;
    case 'users':
      cleanupUsersTab();
      break;
    case 'settings':
      cleanupSettingsTab();
      break;
  }
}

async function loadServerDetails(serverId) {
  const username = state$1.username;
  
  try {
    const res = await api(`/api/servers/${serverId}`);
    const data = await res.json();
    
    if (data.error) {
      document.getElementById('server-name').textContent = 'Error';
      return;
    }
    
    serverData = data.server;
    serverLimits = serverData.limits;
    
    document.getElementById('server-name').textContent = serverData.name;
    
    const address = serverData.node_address || `${serverData.allocation?.ip || '0.0.0.0'}:${serverData.allocation?.port || 25565}`;
    document.getElementById('server-address').textContent = address;
    
    const nodeEl = document.getElementById('server-node');
    if (nodeEl) nodeEl.textContent = serverData.node_name || 'Unknown';
    
    // Show node down banner and disable controls
    const nodeDown = false; //serverData.node_online === false;
    const nodeBanner = document.getElementById('node-down-banner');
    if (nodeBanner) {
      nodeBanner.style.display = nodeDown ? 'flex' : 'none';
    }
    if (nodeDown) {
      disableServerControls();
    }
    
    // Check if server is installing
    if (serverData.status === 'installing') {
      showInstallingScreen();
    }
  } catch (e) {
    console.error('Failed to load server:', e);
  }
}

function disableServerControls() {
  ['btn-start', 'btn-restart', 'btn-stop', 'btn-kill'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      btn.title = 'Node is offline';
      btn.style.opacity = '0.3';
      btn.style.pointerEvents = 'none';
    }
  });
  
  // Disable tabs that need the node
  document.querySelectorAll('.server-tab').forEach(tab => {
    tab.disabled = true;
    tab.classList.add('disabled');
    tab.title = 'Node is offline';
  });
  
  // Show message in tab content
  const content = document.getElementById('tab-content');
  if (content) {
    content.innerHTML = `
      <div class="node-offline-tab">
        <span class="round-icon">cloud_off</span>
        <h3>Node Unreachable</h3>
        <p>The node hosting this server is currently offline. Server management is unavailable until the node comes back online.</p>
        <a href="/status" class="btn btn-sm">View System Status</a>
      </div>
    `;
  }
}

function showInstallingScreen() {
  const content = document.getElementById('tab-content');
  const sidebar = document.querySelector('.server-sidebar');
  const tabsEl = document.querySelector('.server-tabs');
  const powerBtns = document.querySelector('.power-buttons');
  
  if (sidebar) sidebar.style.display = 'none';
  if (tabsEl) tabsEl.style.display = 'none';
  if (powerBtns) powerBtns.style.display = 'none';
  
  content.innerHTML = `
    <div class="installing-screen">
      <div class="installing-content">
        <div class="installing-icon">
          <span class="round-icon spinning">settings</span>
        </div>
        <h2>Server Installing</h2>
        <p>Your server is being set up. This may take a few minutes...</p>
        <div class="installing-progress">
          <div class="installing-bar"></div>
        </div>
        <p class="installing-hint">You can leave this page and come back later.</p>
      </div>
    </div>
  `;
  
  // Poll for status changes
  if (installCheckInterval) clearInterval(installCheckInterval);
  installCheckInterval = setInterval(checkInstallStatus, 5000);
}

async function checkInstallStatus() {
  const username = state$1.username;
  
  try {
    const res = await api(`/api/servers/${currentServerId}`);
    const data = await res.json();
    
    if (data.server && data.server.status !== 'installing') {
      clearInterval(installCheckInterval);
      installCheckInterval = null;
      
      // Reload the page to show full interface
      serverData = data.server;
      const tabsEl = document.querySelector('.server-tabs');
      const sidebar = document.querySelector('.server-sidebar');
      const powerBtns = document.querySelector('.power-buttons');
      
      if (tabsEl) tabsEl.style.display = 'flex';
      if (sidebar) sidebar.style.display = 'flex';
      if (powerBtns) powerBtns.style.display = 'flex';
      
      switchTab('console');
    }
  } catch (e) {
    console.error('Failed to check install status:', e);
  }
}

async function powerAction(serverId, action) {
  const username = state$1.username;
  
  try {
    const res = await api(`/api/servers/${serverId}/power`, {
      method: 'POST',
      
      body: JSON.stringify({ action })
    });
    
    if (!res.ok) {
      const data = await res.json();
      console.error('Power action failed:', data.error);
    }
  } catch (e) {
    console.error('Failed to execute power action:', e);
  }
}

function updateServerStatus(status) {
  const statusEl = document.getElementById('server-status');
  if (statusEl) {
    statusEl.textContent = status;
    statusEl.className = `server-status status-${status}`;
  }

  if (status === 'offline' || status === 'running' || status === 'starting') {
    const btnStop = document.getElementById('btn-stop');
    const btnKill = document.getElementById('btn-kill');
    if (btnStop && btnKill) {
        btnStop.style.display = '';
        btnKill.style.display = 'none';
    }
  }
}

function updateServerResources(stats) {
  const cpuPercent = Math.min(100, stats.cpu_absolute || 0);
  const memPercent = stats.memory_limit_bytes ? Math.min(100, (stats.memory_bytes / stats.memory_limit_bytes) * 100) : 0;
  const diskLimit = serverLimits?.disk ? serverLimits.disk * 1024 * 1024 : 0;
  const diskPercent = diskLimit ? Math.min(100, (stats.disk_bytes / diskLimit) * 100) : 0;
  
  sparkHistory.cpu.push(cpuPercent);
  sparkHistory.mem.push(memPercent);
  sparkHistory.disk.push(diskPercent);
  
  if (sparkHistory.cpu.length > SPARK_POINTS) sparkHistory.cpu.shift();
  if (sparkHistory.mem.length > SPARK_POINTS) sparkHistory.mem.shift();
  if (sparkHistory.disk.length > SPARK_POINTS) sparkHistory.disk.shift();
  
  updateSparkline('spark-cpu', sparkHistory.cpu);
  updateSparkline('spark-mem', sparkHistory.mem);
  updateSparkline('spark-disk', sparkHistory.disk);
  
  const cpuText = document.getElementById('res-cpu-text');
  const memText = document.getElementById('res-mem-text');
  const diskText = document.getElementById('res-disk-text');
  const netTx = document.getElementById('res-net-tx');
  const netRx = document.getElementById('res-net-rx');
  
  const uptimeEl = document.getElementById('server-uptime');
  
  if (cpuText) cpuText.textContent = `${cpuPercent.toFixed(1)}%`;
  if (memText) memText.textContent = formatBytes(stats.memory_bytes || 0);
  if (diskText) diskText.textContent = formatBytes(stats.disk_bytes || 0);
  if (netTx) netTx.textContent = formatBytes(stats.network?.tx_bytes || 0);
  if (netRx) netRx.textContent = formatBytes(stats.network?.rx_bytes || 0);
  if (uptimeEl) uptimeEl.textContent = formatUptime(stats.uptime || 0);
}

function formatUptime(ms) {
  if (!ms || ms <= 0) return '--';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function updateSparkline(svgId, data) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  
  const linePath = svg.querySelector('.spark-line');
  const areaPath = svg.querySelector('.spark-area');
  if (!linePath || !areaPath) return;

  if (data.length < 2) {
    const defaultPath = "M0,12 L100,12";
    linePath.setAttribute('d', defaultPath);
    areaPath.setAttribute('d', "");
    return;
  }

  const linePoints = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 24 - (value / 100) * 22;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  linePath.setAttribute('d', linePoints);

  const areaPoints = `${linePoints} L100,24 L0,24 Z`;
  areaPath.setAttribute('d', areaPoints);
}


function cleanupServerPage() {
  cleanupCurrentTab();
  if (installCheckInterval) {
    clearInterval(installCheckInterval);
    installCheckInterval = null;
  }
  currentServerId = null;
  serverData = null;
  currentTab = 'console';
  sparkHistory.cpu = [];
  sparkHistory.mem = [];
  sparkHistory.disk = [];
}

function getServerId() {
  return currentServerId;
}

let pollInterval = null;
let uptimeData = {};

function renderStatus() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="status-page">
      <div class="sp-hero">
        <div class="sp-hero-badge" id="sp-badge">
          <span class="sp-badge-dot"></span>
          <span class="sp-badge-text" id="sp-badge-text">Checking...</span>
        </div>
        <h1 class="sp-hero-title" id="sp-hero-title">Checking system status</h1>
        <p class="sp-hero-sub" id="sp-hero-sub">Connecting to monitoring services</p>
      </div>

      <div class="sp-overview" id="sp-overview"></div>

      <div class="sp-section">
        <div class="sp-section-head">
          <h2>Services</h2>
          <div class="sp-updated">
            <span class="round-icon spinning" id="sp-sync" style="display:none;font-size:14px">sync</span>
            <span id="sp-time">--</span>
          </div>
        </div>
        <div class="sp-services" id="sp-services">
          <div class="loading-spinner"></div>
        </div>
      </div>

      <div class="sp-section">
        <div class="sp-section-head">
          <h2>Past Incidents</h2>
        </div>
        <div class="sp-incidents" id="sp-incidents">
          <div class="sp-no-incidents">
            <span class="round-icon">check_circle</span>
            <p>No incidents reported in the last 90 days.</p>
          </div>
        </div>
      </div>

      <div class="sp-footer">
        <p>Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  `;
  
  loadStatus();
  pollInterval = setInterval(loadStatus, 30000);
}

function formatDate$1(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status) {
  switch (status) {
    case 'online': return 'Operational';
    case 'degraded': return 'Degraded';
    case 'offline': return 'Outage';
    default: return 'No data';
  }
}

function statusClass(status) {
  switch (status) {
    case 'online': return 'up';
    case 'degraded': return 'degraded';
    case 'offline': return 'down';
    default: return 'unknown';
  }
}

function renderUptimeBars(history) {
  return history.map(h => {
    const cls = statusClass(h.status);
    const label = statusLabel(h.status);
    const detail = h.checks > 0
      ? `${formatDateFull(h.date)}: ${label} (${h.online}/${h.checks} checks OK)`
      : `${formatDateFull(h.date)}: No data`;
    return `<div class="sp-bar ${cls}" title="${detail}"></div>`;
  }).join('');
}

function renderTimeScale(history) {
  if (history.length === 0) return '';
  // Show ~5 labels spread across 90 days
  const indices = [0, 22, 44, 66, 89].filter(i => i < history.length);
  const labels = indices.map(i => {
    const h = history[i];
    const d = new Date(h.date + 'T00:00:00');
    return `<span>${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>`;
  });
  return `
    <div class="sp-bars-legend">
      ${labels.join('')}
    </div>
  `;
}

function calcUptime(history) {
  const withData = history.filter(h => h.status !== 'unknown');
  if (withData.length === 0) return null;
  const up = withData.filter(h => h.status === 'online' || h.status === 'degraded').length;
  return ((up / withData.length) * 100).toFixed(2);
}

async function loadStatus() {
  const container = document.getElementById('sp-services');
  const syncIcon = document.getElementById('sp-sync');
  
  if (syncIcon) syncIcon.style.display = 'inline-block';
  
  try {
    const [nodesRes, uptimeRes, incidentsRes] = await Promise.all([
      fetch('/api/status/nodes'),
      fetch('/api/status/uptime'),
      fetch('/api/status/incidents')
    ]);
    const data = await nodesRes.json();
    const uptimeJson = await uptimeRes.json();
    uptimeData = uptimeJson.history || {};
    const incidentsJson = await incidentsRes.json();
    const realIncidents = incidentsJson.incidents || [];
    
    const online = data.nodes.filter(n => n.status === 'online').length;
    const total = data.nodes.length;
    
    // Hero badge
    const badge = document.getElementById('sp-badge');
    const badgeText = document.getElementById('sp-badge-text');
    const title = document.getElementById('sp-hero-title');
    const sub = document.getElementById('sp-hero-sub');
    
    if (online === total && total > 0) {
      badge.className = 'sp-hero-badge online';
      badgeText.textContent = 'Operational';
      title.textContent = 'All Systems Operational';
      sub.textContent = 'All services are running smoothly';
    } else if (online > 0) {
      badge.className = 'sp-hero-badge partial';
      badgeText.textContent = 'Degraded';
      title.textContent = 'Partial System Outage';
      sub.textContent = `${total - online} of ${total} services experiencing issues`;
    } else if (total > 0) {
      badge.className = 'sp-hero-badge offline';
      badgeText.textContent = 'Major Outage';
      title.textContent = 'Major System Outage';
      sub.textContent = 'All services are currently down';
    } else {
      badge.className = 'sp-hero-badge';
      badgeText.textContent = 'No Data';
      title.textContent = 'No Services Configured';
      sub.textContent = 'There are no monitored services yet';
    }
    
    // Overview metrics
    const overview = document.getElementById('sp-overview');
    const totalServers = data.nodes.reduce((s, n) => s + n.servers, 0);
    const totalAllocMem = data.nodes.reduce((s, n) => s + n.memory.allocated, 0);
    const totalMem = data.nodes.reduce((s, n) => s + n.memory.total, 0);
    const memPercent = totalMem > 0 ? ((totalAllocMem / totalMem) * 100).toFixed(0) : '0';
    const totalAllocDisk = data.nodes.reduce((s, n) => s + n.disk.allocated, 0);
    const totalDisk = data.nodes.reduce((s, n) => s + n.disk.total, 0);
    const diskPercent = totalDisk > 0 ? ((totalAllocDisk / totalDisk) * 100).toFixed(0) : '0';
    
    overview.innerHTML = `
      <div class="sp-metric">
        <span class="sp-metric-value">${online}/${total}</span>
        <span class="sp-metric-label">Nodes Online</span>
      </div>
      <div class="sp-metric">
        <span class="sp-metric-value">${totalServers}</span>
        <span class="sp-metric-label">Servers</span>
      </div>
      <div class="sp-metric">
        <span class="sp-metric-value">${memPercent}%</span>
        <span class="sp-metric-label">Memory Allocated</span>
      </div>
      <div class="sp-metric">
        <span class="sp-metric-value">${diskPercent}%</span>
        <span class="sp-metric-label">Disk Allocated</span>
      </div>
    `;
    
    // Update time
    document.getElementById('sp-time').textContent = new Date().toLocaleTimeString();
    
    // Services list
    if (data.nodes.length === 0) {
      container.innerHTML = `
        <div class="sp-empty">
          <span class="round-icon">cloud_off</span>
          <p>No services to display</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.nodes.map(node => {
      const history = uptimeData[node.id] || generateEmptyHistory();
      const uptime = calcUptime(history);
      const uptimeDisplay = uptime !== null ? `${uptime}%` : '—';
      
      return `
        <div class="sp-service">
          <div class="sp-service-top">
            <div class="sp-service-info">
              <span class="sp-dot ${node.status}"></span>
              <span class="sp-service-name">${escapeHtml$1(node.name)}</span>
              <span class="sp-service-loc">${escapeHtml$1(node.location || 'Unknown')}</span>
            </div>
            <div class="sp-service-right">
              <span class="sp-uptime-pct">${uptimeDisplay}</span>
              <span class="sp-status-tag ${node.status}">${node.status === 'online' ? 'Operational' : 'Down'}</span>
            </div>
          </div>
          <div class="sp-uptime-track">
            <div class="sp-bars">${renderUptimeBars(history)}</div>
            ${renderTimeScale(history)}
          </div>
          <div class="sp-service-resources">
            <div class="sp-res">
              <span class="sp-res-label">Memory</span>
              <span class="sp-res-value">${node.memory.allocated} / ${node.memory.total} MB</span>
            </div>
            <div class="sp-res">
              <span class="sp-res-label">Disk</span>
              <span class="sp-res-value">${node.disk.allocated} / ${node.disk.total} MB</span>
            </div>
            <div class="sp-res">
              <span class="sp-res-label">Servers</span>
              <span class="sp-res-value">${node.servers}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Render real incidents from DB
    renderIncidents(realIncidents);
  } catch {
    container.innerHTML = `
      <div class="sp-empty error">
        <span class="round-icon">error_outline</span>
        <p>Unable to reach monitoring services. Retrying...</p>
      </div>
    `;
  } finally {
    if (syncIcon) {
      setTimeout(() => { syncIcon.style.display = 'none'; }, 500);
    }
  }
}

function generateEmptyHistory() {
  const history = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    history.push({ date: ds, status: 'unknown', checks: 0, online: 0 });
  }
  return history;
}

function renderIncidents(incidents) {
  const el = document.getElementById('sp-incidents');
  if (!el) return;
  
  if (!incidents || incidents.length === 0) {
    el.innerHTML = `
      <div class="sp-no-incidents">
        <span class="round-icon">check_circle</span>
        <p>No incidents reported in the last 90 days.</p>
      </div>
    `;
    return;
  }
  
  const statusColors = {
    investigating: 'var(--warning, #f59e0b)',
    identified: '#f97316',
    monitoring: 'var(--info, #3b82f6)',
    resolved: 'var(--success)'
  };

  const impactIcons = {
    none: 'info',
    minor: 'warning',
    major: 'error',
    critical: 'dangerous'
  };
  
  // Group by date (created_at)
  const grouped = {};
  for (const inc of incidents) {
    const date = inc.created_at.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(inc);
  }
  
  el.innerHTML = Object.entries(grouped).map(([date, incs]) => `
    <div class="sp-incident-day">
      <div class="sp-incident-date">${formatDateFull(date)}</div>
      ${incs.map(inc => {
        const latestUpdate = (inc.updates || []).slice(-1)[0];
        return `
          <div class="sp-incident-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
              <span class="round-icon" style="font-size: 18px; color: ${statusColors[inc.status] || 'inherit'}">
                ${impactIcons[inc.impact] || 'warning'}
              </span>
              <span class="sp-incident-text" style="flex: 1;">
                <strong>${escapeHtml$1(inc.title)}</strong>
                <small style="margin-left: 6px; text-transform: capitalize;">${inc.status}</small>
              </span>
              ${inc.resolved_at ? `<small style="color: var(--success); font-size: 11px;">Resolved</small>` : ''}
            </div>
            ${inc.description ? `<p style="margin: 0 0 0 26px; font-size: 12px; color: var(--text-secondary);">${escapeHtml$1(inc.description)}</p>` : ''}
            ${latestUpdate && latestUpdate.message !== inc.description ? `
              <p style="margin: 0 0 0 26px; font-size: 11px; color: var(--text-tertiary);">
                Latest: ${escapeHtml$1(latestUpdate.message)} <small>(${new Date(latestUpdate.created_at).toLocaleString()})</small>
              </p>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

function cleanupStatus() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

const state = {
  currentView: { type: 'list', tab: 'nodes', id: null, subTab: null },
  currentPage: { nodes: 1, servers: 1, users: 1 },
  itemsPerPage: { nodes: 10, servers: 10, users: 10 },
  searchQuery: { nodes: '', servers: '', users: '' }
};

function jsonToYaml(obj, indent = 0) {
  let yaml = '';
  const spaces = '  '.repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          yaml += `${spaces}  -\n${jsonToYaml(item, indent + 2)}`;
        } else {
          yaml += `${spaces}  - ${item}\n`;
        }
      });
    } else if (typeof value === 'string') {
      yaml += `${spaces}${key}: "${value}"\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }
  return yaml;
}

function renderPagination(meta, tab) {
  if (!meta || meta.total === 0) return '';
  
  let pageNumbers = '';
  const maxVisible = 5;
  let startPage = Math.max(1, meta.current_page - Math.floor(maxVisible / 2));
  let endPage = Math.min(meta.total_pages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    pageNumbers += `<button class="page-num" data-page="1">1</button>`;
    if (startPage > 2) pageNumbers += `<span class="page-ellipsis">...</span>`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers += `<button class="page-num ${i === meta.current_page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  
  if (endPage < meta.total_pages) {
    if (endPage < meta.total_pages - 1) pageNumbers += `<span class="page-ellipsis">...</span>`;
    pageNumbers += `<button class="page-num" data-page="${meta.total_pages}">${meta.total_pages}</button>`;
  }
  
  return `
    <div class="pagination">
      <div class="pagination-left">
        <select class="per-page-select" data-tab="${tab}">
          <option value="10" ${meta.per_page === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${meta.per_page === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${meta.per_page === 50 ? 'selected' : ''}>50</option>
        </select>
        <span class="per-page-label">per page</span>
      </div>
      
      <div class="pagination-center">
        <button class="page-btn" data-page="${meta.current_page - 1}" ${meta.current_page <= 1 ? 'disabled' : ''}>
          <span class="round-icon">chevron_left</span>
        </button>
        <div class="page-numbers">${pageNumbers}</div>
        <button class="page-btn" data-page="${meta.current_page + 1}" ${meta.current_page >= meta.total_pages ? 'disabled' : ''}>
          <span class="round-icon">chevron_right</span>
        </button>
      </div>
      
      <div class="pagination-right">
        <span class="goto-label">Go to</span>
        <input type="number" class="goto-input" min="1" max="${meta.total_pages}" value="${meta.current_page}" data-tab="${tab}" />
        <span class="page-total">of ${meta.total_pages} (${meta.total} items)</span>
      </div>
    </div>
  `;
}

function setupPaginationListeners(tab, loadViewCallback) {
  document.querySelectorAll('.pagination .page-btn').forEach(btn => {
    btn.onclick = () => {
      const page = parseInt(btn.dataset.page);
      if (page >= 1) {
        state.currentPage[tab] = page;
        loadViewCallback();
      }
    };
  });
  
  document.querySelectorAll('.pagination .page-num').forEach(btn => {
    btn.onclick = () => {
      state.currentPage[tab] = parseInt(btn.dataset.page);
      loadViewCallback();
    };
  });
  
  const perPageSelect = document.querySelector('.per-page-select');
  if (perPageSelect) {
    perPageSelect.onchange = (e) => {
      state.itemsPerPage[tab] = parseInt(e.target.value);
      state.currentPage[tab] = 1;
      loadViewCallback();
    };
  }
  
  const gotoInput = document.querySelector('.goto-input');
  if (gotoInput) {
    gotoInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        let page = parseInt(gotoInput.value);
        const max = parseInt(gotoInput.max);
        if (page < 1) page = 1;
        if (page > max) page = max;
        state.currentPage[tab] = page;
        loadViewCallback();
      }
    };
  }
}

function renderBreadcrumb(items) {
  return `
    <nav class="admin-breadcrumb">
      ${items.map((item, idx) => `
        ${idx > 0 ? '<span class="round-icon">chevron_right</span>' : ''}
        ${item.onClick ? `<a href="#" class="breadcrumb-item" data-action="${item.onClick}">${escapeHtml$1(item.label)}</a>` : `<span class="breadcrumb-item current">${escapeHtml$1(item.label)}</span>`}
      `).join('')}
    </nav>
  `;
}

function setupBreadcrumbListeners(navigateToCallback) {
  document.querySelectorAll('.breadcrumb-item[data-action]').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      const action = el.dataset.action;
      if (action === 'list-nodes') navigateToCallback('nodes');
      else if (action === 'list-servers') navigateToCallback('servers');
      else if (action === 'list-users') navigateToCallback('users');
      else if (action === 'list-nests') navigateToCallback('nests');
      else if (action === 'list-locations') navigateToCallback('locations');
    };
  });
}

function renderSearchBox(tab, placeholder) {
  return `
    <div class="admin-search">
      <span class="round-icon">search</span>
      <input type="text" id="admin-search-input" placeholder="${placeholder}" value="${escapeHtml$1(state.searchQuery[tab] || '')}" />
      ${state.searchQuery[tab] ? `<button class="search-clear" id="admin-search-clear"><span class="round-icon">close</span></button>` : ''}
    </div>
  `;
}

let searchTimeout = null;

function setupSearchListeners(tab, loadViewCallback) {
  const input = document.getElementById('admin-search-input');
  const clearBtn = document.getElementById('admin-search-clear');
  
  if (input) {
    input.oninput = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery[tab] = input.value.trim();
        state.currentPage[tab] = 1;
        loadViewCallback();
      }, 300);
    };
  }
  
  if (clearBtn) {
    clearBtn.onclick = () => {
      state.searchQuery[tab] = '';
      state.currentPage[tab] = 1;
      loadViewCallback();
    };
  }
}

const navigateTo$c = (...args) => window.adminNavigate(...args);

async function renderNodesList(container, username, loadView) {
  try {
    const search = state.searchQuery.nodes ? `&search=${encodeURIComponent(state.searchQuery.nodes)}` : '';
    const [res, statusRes, healthRes] = await Promise.all([
      api(`/api/admin/nodes?page=${state.currentPage.nodes}&per_page=${state.itemsPerPage.nodes}${search}`),
      api('/api/status/nodes'),
      api('/api/admin/nodes/health').catch(() => ({ json: () => ({ health: {} }) }))
    ]);
    const data = await res.json();
    const statusData = await statusRes.json();
    const nodeStatuses = {};
    (statusData.nodes || []).forEach(n => { nodeStatuses[n.id] = n.status; });
    const healthData = await healthRes.json();
    const nodeHealthMap = healthData.health || {};
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Nodes' }])}
        ${renderSearchBox('nodes', 'Search by name, IP, or ID...')}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-node-btn">
            <span class="round-icon">add</span>
            Create Node
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${data.nodes.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">dns</span>
            <h3>No Nodes</h3>
            <p>Create your first node to get started</p>
          </div>
        ` : `
          <div class="list-grid nodes-grid">
            ${data.nodes.map(node => `
              <div class="list-card" data-id="${node.id}">
                <div class="list-card-header">
                  <div class="list-card-icon">
                    <span class="round-icon">dns</span>
                  </div>
                  <div class="list-card-title">
                    <h3>${escapeHtml$1(node.name)}</h3>
                    <span class="list-card-subtitle">${escapeHtml$1(node.fqdn)}</span>
                  </div>
                  <span class="status-indicator ${node.maintenance_mode ? 'status-warning' : nodeStatuses[node.id] === 'online' ? 'status-success' : 'status-danger'}"></span>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Memory</span>
                    <span class="stat-value">${formatBytes(node.memory * 1024 * 1024)}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Disk</span>
                    <span class="stat-value">${formatBytes(node.disk * 1024 * 1024)}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Response</span>
                    <span class="stat-value">${nodeHealthMap[node.id]?.response_time != null ? nodeHealthMap[node.id].response_time + 'ms' : '—'}</span>
                  </div>
                </div>
                <div class="list-card-footer">
                  <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); adminNavigate('nodes', '${node.id}')">
                    <span class="round-icon">settings</span>
                    Manage
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
        ${renderPagination(data.meta, 'nodes')}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$c);
    setupPaginationListeners('nodes', loadView);
    setupSearchListeners('nodes', loadView);
    
    document.querySelectorAll('.list-card[data-id]').forEach(card => {
      card.onclick = () => navigateTo$c('nodes', card.dataset.id);
    });
    
    document.getElementById('create-node-btn').onclick = () => createNewNode();
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load nodes</div>`;
  }
}

async function renderNodeDetail(container, username, nodeId) {
  try {
    const [res, statusRes, healthRes] = await Promise.all([
      api(`/api/admin/nodes`),
      api('/api/status/nodes'),
      api('/api/admin/nodes/health').catch(() => ({ json: () => ({ health: {} }) }))
    ]);
    const data = await res.json();
    const statusData = await statusRes.json();
    const node = data.nodes.find(n => n.id === nodeId);
    
    if (!node) {
      container.innerHTML = `<div class="error">Node not found</div>`;
      return;
    }
    
    const nodeStatus = (statusData.nodes || []).find(n => n.id === nodeId);
    const isOnline = nodeStatus?.status === 'online';
    const healthData = await healthRes.json();
    const nodeHealthInfo = (healthData.health || {})[nodeId];
    
    const locRes = await api('/api/admin/locations');
    const locData = await locRes.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Nodes', onClick: 'list-nodes' },
          { label: node.name }
        ])}
        <div class="admin-header-actions">
          <button class="btn btn-danger" id="delete-node-btn">
            <span class="round-icon">delete</span>
            Delete
          </button>
        </div>
      </div>
      
      <div class="detail-tabs">
        <button class="detail-tab ${state.currentView.subTab === 'about' ? 'active' : ''}" data-subtab="about">About</button>
        <button class="detail-tab ${state.currentView.subTab === 'settings' ? 'active' : ''}" data-subtab="settings">Settings</button>
        <button class="detail-tab ${state.currentView.subTab === 'configuration' ? 'active' : ''}" data-subtab="configuration">Configuration</button>
        <button class="detail-tab ${state.currentView.subTab === 'allocations' ? 'active' : ''}" data-subtab="allocations">Allocations</button>
      </div>
      
      <div class="detail-content" id="node-detail-content"></div>
    `;
    
    setupBreadcrumbListeners(navigateTo$c);
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.onclick = () => {
        state.currentView.subTab = tab.dataset.subtab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderNodeSubTab(node, locData.locations, username, isOnline, nodeHealthInfo);
      };
    });
    
    document.getElementById('delete-node-btn').onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Node', message: 'Are you sure you want to delete this node? This cannot be undone.', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/nodes/${nodeId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        navigateTo$c('nodes');
      } catch (e) {
        error('Failed to delete node');
      }
    };
    
    renderNodeSubTab(node, locData.locations, username, isOnline, nodeHealthInfo);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load node</div>`;
  }
}

function renderNodeSubTab(node, locations, username, isOnline, healthInfo) {
  const content = document.getElementById('node-detail-content');
  
  switch (state.currentView.subTab) {
    case 'about':
      content.innerHTML = `
        <div class="detail-grid">
          <div class="detail-card">
            <h3>Node Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">${escapeHtml$1(node.name)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">FQDN</span>
                <span class="info-value">${escapeHtml$1(node.fqdn)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Scheme</span>
                <span class="info-value">${node.scheme || 'https'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Daemon Port</span>
                <span class="info-value">${node.daemon_port || 8080}</span>
              </div>
              <div class="info-item">
                <span class="info-label">SFTP Port</span>
                <span class="info-value">${node.daemon_sftp_port || 2022}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Location</span>
                <span class="info-value">${locations.find(l => l.id === node.location_id)?.long || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Resources</h3>
            <div class="resource-bars">
              <div class="resource-bar">
                <div class="resource-header">
                  <span>Memory</span>
                  <span>${formatBytes(node.memory * 1024 * 1024)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
              </div>
              <div class="resource-bar">
                <div class="resource-header">
                  <span>Disk</span>
                  <span>${formatBytes(node.disk * 1024 * 1024)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Status</h3>
            <div class="status-grid">
              <div class="status-item ${isOnline ? 'success' : 'danger'}">
                <span class="round-icon">${isOnline ? 'check_circle' : 'cancel'}</span>
                <span>${isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div class="status-item ${node.maintenance_mode ? 'warning' : 'success'}">
                <span class="round-icon">${node.maintenance_mode ? 'construction' : 'check_circle'}</span>
                <span>${node.maintenance_mode ? 'Maintenance Mode' : 'Operational'}</span>
              </div>
              <div class="status-item ${node.behind_proxy ? 'info' : ''}">
                <span class="round-icon">${node.behind_proxy ? 'vpn_lock' : 'public'}</span>
                <span>${node.behind_proxy ? 'Behind Proxy' : 'Direct Connection'}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Health Monitoring</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">
                  <span class="status-indicator ${healthInfo?.status === 'online' ? 'status-success' : healthInfo?.status === 'degraded' ? 'status-warning' : 'status-danger'}" style="display: inline-block; margin-right: 6px;"></span>
                  ${healthInfo?.status ? healthInfo.status.charAt(0).toUpperCase() + healthInfo.status.slice(1) : 'Unknown'}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Response Time</span>
                <span class="info-value">${healthInfo?.response_time != null ? healthInfo.response_time + 'ms' : '—'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Seen</span>
                <span class="info-value">${healthInfo?.last_seen ? new Date(healthInfo.last_seen).toLocaleString() : 'Never'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Check</span>
                <span class="info-value">${healthInfo?.checked_at ? new Date(healthInfo.checked_at).toLocaleString() : 'Never'}</span>
              </div>
              ${healthInfo?.last_error ? `
              <div class="info-item">
                <span class="info-label">Last Error</span>
                <span class="info-value" style="color: var(--danger);">${escapeHtml$1(healthInfo.last_error)}</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      break;
      
    case 'settings':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Node Settings</h3>
          <form id="node-settings-form" class="settings-form">
            <div class="form-section">
              <h4>General</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" name="name" value="${escapeHtml$1(node.name)}" required />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input type="text" name="description" value="${escapeHtml$1(node.description || '')}" />
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Connection</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>FQDN</label>
                  <input type="text" name="fqdn" value="${escapeHtml$1(node.fqdn)}" required />
                </div>
                <div class="form-group">
                  <label>Scheme</label>
                  <select name="scheme">
                    <option value="https" ${node.scheme === 'https' ? 'selected' : ''}>HTTPS</option>
                    <option value="http" ${node.scheme === 'http' ? 'selected' : ''}>HTTP</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Daemon Port</label>
                  <input type="number" name="daemon_port" value="${node.daemon_port || 8080}" required />
                </div>
                <div class="form-group">
                  <label>SFTP Port</label>
                  <input type="number" name="daemon_sftp_port" value="${node.daemon_sftp_port || 2022}" required />
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Resources</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Memory (MB)</label>
                  <input type="number" name="memory" value="${node.memory}" required />
                </div>
                <div class="form-group">
                  <label>Disk (MB)</label>
                  <input type="number" name="disk" value="${node.disk}" required />
                </div>
                <div class="form-group">
                  <label>Upload Size (MB)</label>
                  <input type="number" name="upload_size" value="${node.upload_size || 100}" />
                </div>
                <div class="form-group">
                  <label>Location</label>
                  <select name="location_id">
                    ${locations.map(l => `<option value="${l.id}" ${l.id === node.location_id ? 'selected' : ''}>${escapeHtml$1(l.long)}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Resource Overallocation</h4>
              <p class="form-hint">Allow the node to allocate more resources than physically available. Use with caution.</p>
              <div class="form-grid">
                <div class="form-group">
                  <label>Memory Overallocation (%)</label>
                  <input type="number" name="memory_overallocation" value="${node.memory_overallocation || 0}" min="0" max="100" />
                  <small class="form-hint">0% = No overallocation, 100% = Double the available memory</small>
                </div>
                <div class="form-group">
                  <label>Disk Overallocation (%)</label>
                  <input type="number" name="disk_overallocation" value="${node.disk_overallocation || 0}" min="0" max="100" />
                  <small class="form-hint">0% = No overallocation, 100% = Double the available disk</small>
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Options</h4>
              <div class="form-toggles">
                <label class="toggle-item">
                  <input type="checkbox" name="behind_proxy" ${node.behind_proxy ? 'checked' : ''} />
                  <span class="toggle-content">
                    <span class="toggle-title">Behind Proxy</span>
                    <span class="toggle-desc">Enable if this node is behind a reverse proxy</span>
                  </span>
                </label>
                <label class="toggle-item">
                  <input type="checkbox" name="maintenance_mode" ${node.maintenance_mode ? 'checked' : ''} />
                  <span class="toggle-content">
                    <span class="toggle-title">Maintenance Mode</span>
                    <span class="toggle-desc">Prevent new servers from being created on this node</span>
                  </span>
                </label>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('node-settings-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const nodeData = Object.fromEntries(form);
        nodeData.behind_proxy = form.get('behind_proxy') === 'on';
        nodeData.maintenance_mode = form.get('maintenance_mode') === 'on';
        
        try {
          await api(`/api/admin/nodes/${node.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node: nodeData })
          });
          success('Node updated successfully');
          navigateTo$c('nodes', node.id, 'settings');
        } catch (e) {
          error('Failed to update node');
        }
      };
      break;
      
    case 'configuration':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Configuration Files</h3>
          <p class="card-description">Use these configuration files to set up Wings on your node.</p>
          
          <div class="config-actions">
            <button class="btn btn-ghost" id="show-config-btn">
              <span class="round-icon">description</span>
              View Configuration
            </button>
            <button class="btn btn-ghost" id="show-deploy-btn">
              <span class="round-icon">terminal</span>
              Deploy Command
            </button>
          </div>
          
          <div id="config-output" class="config-section" style="display:none;"></div>
        </div>
      `;
      
      document.getElementById('show-config-btn').onclick = async () => {
        const output = document.getElementById('config-output');
        try {
          const res = await api(`/api/admin/nodes/${node.id}/config`);
          const data = await res.json();
          if (data.error) {
            output.innerHTML = `<div class="error">${escapeHtml$1(data.error)}</div>`;
          } else {
            const yaml = jsonToYaml(data.config);
            output.innerHTML = `
              <div class="config-header">
                <span>config.yml</span>
                <button class="btn btn-sm btn-ghost" onclick="navigator.clipboard.writeText(this.closest('.config-section').querySelector('pre').textContent); this.textContent='Copied!'">Copy</button>
              </div>
              <pre class="config-code">${escapeHtml$1(yaml)}</pre>
            `;
          }
          output.style.display = 'block';
        } catch (e) {
          error('Failed to load configuration');
        }
      };
      
      document.getElementById('show-deploy-btn').onclick = async () => {
        const output = document.getElementById('config-output');
        try {
          const res = await api(`/api/admin/nodes/${node.id}/deploy`);
          const data = await res.json();
          if (data.error) {
            output.innerHTML = `<div class="error">${escapeHtml$1(data.error)}</div>`;
          } else {
            output.innerHTML = `
              <div class="config-header">
                <span>Deploy Command</span>
                <button class="btn btn-sm btn-ghost" onclick="navigator.clipboard.writeText(this.closest('.config-section').querySelector('pre').textContent); this.textContent='Copied!'">Copy</button>
              </div>
              <pre class="config-code" style="white-space:pre-wrap;word-break:break-all;">${escapeHtml$1(data.command)}</pre>
            `;
          }
          output.style.display = 'block';
        } catch (e) {
          error('Failed to load deploy command');
        }
      };
      break;
      
    case 'allocations':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Port Allocations</h3>
          <p class="card-description">Manage the port range available for servers on this node.</p>
          
          <form id="allocations-form" class="settings-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Port Range Start</label>
                <input type="number" name="allocation_start" value="${node.allocation_start || 25565}" required />
              </div>
              <div class="form-group">
                <label>Port Range End</label>
                <input type="number" name="allocation_end" value="${node.allocation_end || 25665}" required />
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Update Allocations</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('allocations-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const nodeData = {
          allocation_start: parseInt(form.get('allocation_start')),
          allocation_end: parseInt(form.get('allocation_end'))
        };
        
        try {
          await api(`/api/admin/nodes/${node.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node: nodeData })
          });
          success('Allocations updated');
        } catch (e) {
          error('Failed to update allocations');
        }
      };
      break;
  }
}

async function createNewNode() {
  try {
    const locRes = await api('/api/admin/locations');
    const locData = await locRes.json();
    
    const node = {
      name: 'Untitled Node',
      fqdn: 'node.example.com',
      scheme: 'https',
      memory: 8192,
      disk: 51200,
      daemon_port: 8080,
      daemon_sftp_port: 2022,
      allocation_start: 25565,
      allocation_end: 25665,
      location_id: locData.locations[0]?.id || null
    };
    
    const res = await api('/api/admin/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node })
    });
    
    const data = await res.json();
    if (data.node?.id) {
      navigateTo$c('nodes', data.node.id, 'about');
      info('Configure your new node');
    } else {
      error('Failed to create node');
    }
  } catch (e) {
    error('Failed to create node');
  }
}

const navigateTo$b = (...args) => window.adminNavigate(...args);

async function renderServersList(container, username, loadView) {
  try {
    const search = state.searchQuery.servers ? `&search=${encodeURIComponent(state.searchQuery.servers)}` : '';
    const res = await api(`/api/admin/servers?page=${state.currentPage.servers}&per_page=${state.itemsPerPage.servers}${search}`);
    const data = await res.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Servers' }])}
        ${renderSearchBox('servers', 'Search by name or ID...')}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-server-btn">
            <span class="round-icon">add</span>
            Create Server
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${data.servers.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">dns</span>
            <p>No servers yet</p>
          </div>
        ` : `
          <div class="list-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Node</th>
                  <th>Resources</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${data.servers.map(s => `
                  <tr class="clickable-row" data-id="${s.id}">
                    <td>
                      <div class="cell-main">${escapeHtml$1(s.name)}</div>
                      <div class="cell-sub">${s.id.substring(0, 8)}</div>
                    </td>
                    <td>${s.user_id?.substring(0, 8) || '--'}</td>
                    <td>${s.node_id?.substring(0, 8) || '--'}</td>
                    <td>
                      <div class="resource-pills">
                        <span class="pill">${s.limits?.memory || 0}MB</span>
                        <span class="pill">${s.limits?.disk || 0}MB</span>
                        <span class="pill">${s.limits?.cpu || 0}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge status-${s.status}">${s.status}</span>
                      ${s.suspended ? '<span class="status-badge status-suspended">Suspended</span>' : ''}
                    </td>
                    <td>
                      <div class="action-buttons" onclick="event.stopPropagation()">
                        ${s.suspended 
                          ? `<button class="btn btn-xs btn-success" onclick="unsuspendServerAdmin('${s.id}')">Unsuspend</button>` 
                          : `<button class="btn btn-xs btn-warning" onclick="suspendServerAdmin('${s.id}')">Suspend</button>`}
                        <button class="btn btn-xs btn-danger" onclick="deleteServerAdmin('${s.id}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="list-cards">
            ${data.servers.map(s => `
              <div class="list-card" data-id="${s.id}">
                <div class="list-card-header">
                  <div class="list-card-icon">
                    <span class="round-icon">dns</span>
                  </div>
                  <div class="list-card-title">
                    <h3>${escapeHtml$1(s.name)}</h3>
                    <span class="list-card-subtitle">${s.id.substring(0, 8)}</span>
                  </div>
                  <span class="status-badge status-${s.status}">${s.status}</span>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Memory</span>
                    <span class="stat-value">${s.limits?.memory || 0}MB</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Disk</span>
                    <span class="stat-value">${s.limits?.disk || 0}MB</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">CPU</span>
                    <span class="stat-value">${s.limits?.cpu || 0}%</span>
                  </div>
                </div>
                <div class="list-card-footer" onclick="event.stopPropagation()">
                  ${s.suspended 
                    ? `<button class="btn btn-sm btn-success" onclick="unsuspendServerAdmin('${s.id}')">Unsuspend</button>` 
                    : `<button class="btn btn-sm btn-warning" onclick="suspendServerAdmin('${s.id}')">Suspend</button>`}
                  <button class="btn btn-sm btn-danger" onclick="deleteServerAdmin('${s.id}')">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
        ${renderPagination(data.meta, 'servers')}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$b);
    setupPaginationListeners('servers', loadView);
    setupSearchListeners('servers', loadView);
    
    document.querySelectorAll('.clickable-row[data-id], .list-card[data-id]').forEach(el => {
      el.onclick = () => navigateTo$b('servers', el.dataset.id);
    });
    
    document.getElementById('create-server-btn').onclick = () => createNewServer();
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load servers</div>`;
  }
}

async function renderServerDetail(container, username, serverId) {
  try {
    const res = await api(`/api/admin/servers`);
    const data = await res.json();
    const server = data.servers.find(s => s.id === serverId);
    
    if (!server) {
      container.innerHTML = `<div class="error">Server not found</div>`;
      return;
    }
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Servers', onClick: 'list-servers' },
          { label: server.name }
        ])}
        <div class="admin-header-actions">
          <a href="/server/${serverId}" class="btn btn-ghost">
            <span class="round-icon">open_in_new</span>
            View Console
          </a>
          <button class="btn btn-danger" id="delete-server-btn">
            <span class="round-icon">delete</span>
            Delete
          </button>
        </div>
      </div>
      
      <div class="detail-tabs">
        <button class="detail-tab ${state.currentView.subTab === 'details' ? 'active' : ''}" data-subtab="details">Details</button>
        <button class="detail-tab ${state.currentView.subTab === 'build' ? 'active' : ''}" data-subtab="build">Build Configuration</button>
        <button class="detail-tab ${state.currentView.subTab === 'startup' ? 'active' : ''}" data-subtab="startup">Startup</button>
        <button class="detail-tab ${state.currentView.subTab === 'manage' ? 'active' : ''}" data-subtab="manage">Manage</button>
      </div>
      
      <div class="detail-content" id="server-detail-content"></div>
    `;
    
    setupBreadcrumbListeners(navigateTo$b);
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.onclick = () => {
        state.currentView.subTab = tab.dataset.subtab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderServerSubTab(server, username);
      };
    });
    
    document.getElementById('delete-server-btn').onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Server', message: 'Are you sure you want to delete this server? This cannot be undone.', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/servers/${serverId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        navigateTo$b('servers');
      } catch (e) {
        error('Failed to delete server');
      }
    };
    
    renderServerSubTab(server, username);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load server</div>`;
  }
}

function renderServerSubTab(server, username) {
  const content = document.getElementById('server-detail-content');
  
  switch (state.currentView.subTab) {
    case 'details':
      content.innerHTML = `
        <div class="detail-grid">
          <div class="detail-card">
            <h3>Server Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">${escapeHtml$1(server.name)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">ID</span>
                <span class="info-value code">${server.id}</span>
              </div>
              <div class="info-item">
                <span class="info-label">UUID</span>
                <span class="info-value code">${server.uuid || server.id}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Node</span>
                <span class="info-value">${server.node_name || server.node_id || 'Unknown'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">
                  <span class="status-badge status-${server.status}">${server.status}</span>
                  ${server.suspended ? '<span class="status-badge status-suspended">Suspended</span>' : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Owner</h3>
            <div class="owner-section">
              <div class="current-owner">
                <span class="info-label">Current Owner</span>
                <span class="info-value" id="current-owner-display">${server.owner_username || server.user_id || 'Unknown'}</span>
              </div>
              <div class="owner-search">
                <label>Transfer to User</label>
                <div class="search-input-wrapper">
                  <input type="text" id="owner-search-input" placeholder="Search by username..." autocomplete="off" />
                  <div class="search-results" id="owner-search-results"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Resource Limits</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Memory</span>
                <span class="info-value">${server.limits?.memory || 0} MB</span>
              </div>
              <div class="info-item">
                <span class="info-label">Disk</span>
                <span class="info-value">${server.limits?.disk || 0} MB</span>
              </div>
              <div class="info-item">
                <span class="info-label">CPU</span>
                <span class="info-value">${server.limits?.cpu || 0}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">Swap</span>
                <span class="info-value">${server.limits?.swap || 0} MB</span>
              </div>
              <div class="info-item">
                <span class="info-label">I/O</span>
                <span class="info-value">${server.limits?.io || 500}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      setupOwnerSearch(server);
      break;
      
    case 'build':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Build Configuration</h3>
          <form id="server-build-form" class="settings-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Memory (MB)</label>
                <input type="number" name="memory" value="${server.limits?.memory || 1024}" required />
              </div>
              <div class="form-group">
                <label>Disk (MB)</label>
                <input type="number" name="disk" value="${server.limits?.disk || 5120}" required />
              </div>
              <div class="form-group">
                <label>CPU Limit (%)</label>
                <input type="number" name="cpu" value="${server.limits?.cpu || 100}" required />
              </div>
              <div class="form-group">
                <label>Swap (MB)</label>
                <input type="number" name="swap" value="${server.limits?.swap || 0}" />
              </div>
              <div class="form-group">
                <label>Block IO Weight</label>
                <input type="number" name="io" value="${server.limits?.io || 500}" min="10" max="1000" />
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Update Build</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('server-build-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const limits = {
          memory: parseInt(form.get('memory')),
          disk: parseInt(form.get('disk')),
          cpu: parseInt(form.get('cpu')),
          swap: parseInt(form.get('swap')),
          io: parseInt(form.get('io'))
        };
        
        try {
          await api(`/api/admin/servers/${server.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: { limits } })
          });
          success('Build configuration updated');
        } catch (e) {
          error('Failed to update build configuration');
        }
      };
      break;
      
    case 'startup':
      content.innerHTML = `
        <div class="detail-grid">
          <div class="detail-card">
            <h3>Current Configuration</h3>
            <div class="info-grid">
              <div class="info-item full-width">
                <span class="info-label">Startup Command</span>
                <code class="info-value code" id="current-startup-display">${escapeHtml$1(server.startup || 'Not configured')}</code>
              </div>
              <div class="info-item">
                <span class="info-label">Docker Image</span>
                <span class="info-value code" id="current-docker-display">${escapeHtml$1(server.docker_image || 'Not set')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Egg ID</span>
                <span class="info-value code">${server.egg_id || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Change Egg</h3>
            <p class="card-description">Changing the egg will update the startup command and Docker image.</p>
            <div class="egg-section">
              <div class="current-egg">
                <span class="info-label">Current Egg</span>
                <span class="info-value" id="current-egg-display">Loading...</span>
              </div>
              <div class="egg-search">
                <label>Select New Egg</label>
                <div class="search-input-wrapper">
                  <input type="text" id="egg-search-input" placeholder="Search eggs..." autocomplete="off" />
                  <div class="search-results" id="egg-search-results"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      loadCurrentEgg(server);
      setupEggSearch(server);
      break;
      
    case 'manage':
      const isDraft = server.status === 'draft' || server.status === 'install_failed';
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Server Management</h3>
          <div class="manage-actions">
            ${isDraft ? `
              <div class="manage-action highlight">
                <div class="manage-action-info">
                  <h4>Install Server</h4>
                  <p>${server.status === 'install_failed' 
                    ? `Previous installation failed: ${escapeHtml$1(server.install_error || 'Unknown error')}. Fix the configuration and try again.` 
                    : 'This server is configured but not yet installed. Click to install it on the node.'}</p>
                </div>
                <button class="btn btn-success" id="install-btn">
                  <span class="round-icon">play_arrow</span>
                  Install Now
                </button>
              </div>
            ` : `
              <div class="manage-action">
                <div class="manage-action-info">
                  <h4>Open Server</h4>
                  <p>Access the server console, files, and settings as an administrator.</p>
                </div>
                <a href="/server/${server.id}" class="btn btn-primary">
                  <span class="round-icon">open_in_new</span>
                  Open Server
                </a>
              </div>
            `}
            
            ${!isDraft ? `
              <div class="manage-action">
                <div class="manage-action-info">
                  <h4>Transfer Server</h4>
                  <p>Move this server to a different node. The server will be stopped during transfer.</p>
                </div>
                <button class="btn btn-primary" id="transfer-btn">
                  <span class="round-icon">swap_horiz</span>
                  Transfer
                </button>
              </div>
              
              <div class="manage-action">
                <div class="manage-action-info">
                  <h4>Reinstall Server</h4>
                  <p>This will reinstall the server with the selected egg. All files will be deleted.</p>
                </div>
                <button class="btn btn-warning" id="reinstall-btn">Reinstall</button>
              </div>
            ` : ''}
            
            <div class="manage-action">
              <div class="manage-action-info">
                <h4>${server.suspended ? 'Unsuspend' : 'Suspend'} Server</h4>
                <p>${server.suspended ? 'Allow the server to be accessed again.' : 'Prevent the server from being accessed or started.'}</p>
              </div>
              <button class="btn ${server.suspended ? 'btn-success' : 'btn-warning'}" id="suspend-btn">
                ${server.suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
            
            <div class="manage-action danger">
              <div class="manage-action-info">
                <h4>Delete Server</h4>
                <p>Permanently delete this server and all of its files. This action cannot be undone.</p>
              </div>
              <button class="btn btn-danger" id="delete-btn">Delete Server</button>
            </div>
          </div>
        </div>
      `;
      
      if (isDraft) {
        document.getElementById('install-btn').onclick = async () => {
          const btn = document.getElementById('install-btn');
          btn.disabled = true;
          btn.innerHTML = '<span class="round-icon rotating">sync</span> Installing...';
          
          try {
            const res = await api(`/api/admin/servers/${server.id}/install`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            
            if (res.ok) {
              success('Server installation started');
              navigateTo$b('servers', server.id, 'manage');
            } else {
              const data = await res.json();
              error(data.error || 'Installation failed');
              btn.disabled = false;
              btn.innerHTML = '<span class="round-icon">play_arrow</span> Install Now';
            }
          } catch (e) {
            error('Failed to install server');
            btn.disabled = false;
            btn.innerHTML = '<span class="round-icon">play_arrow</span> Install Now';
          }
        };
      }
      
      const transferBtn = document.getElementById('transfer-btn');
      if (transferBtn) {
        transferBtn.onclick = () => showTransferModal(server);
      }
      
      const reinstallBtn = document.getElementById('reinstall-btn');
      if (reinstallBtn) {
        reinstallBtn.onclick = async () => {
          const confirmed = await confirm({ title: 'Reinstall Server', message: 'Are you sure? All server files will be deleted.', danger: true });
          if (!confirmed) return;
          try {
            await api(`/api/servers/${server.id}/reinstall`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            success('Server reinstall initiated');
          } catch (e) {
            error('Failed to reinstall server');
          }
        };
      }
      
      document.getElementById('suspend-btn').onclick = async () => {
        const action = server.suspended ? 'unsuspend' : 'suspend';
        try {
          await api(`/api/servers/${server.id}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          success(`Server ${action}ed`);
          navigateTo$b('servers', server.id, 'manage');
        } catch (e) {
          error(`Failed to ${action} server`);
        }
      };
      
      document.getElementById('delete-btn').onclick = async () => {
        const confirmed = await confirm({ title: 'Delete Server', message: 'Are you sure you want to delete this server? This cannot be undone.', danger: true });
        if (!confirmed) return;
        try {
          await api(`/api/admin/servers/${server.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          navigateTo$b('servers');
        } catch (e) {
          error('Failed to delete server');
        }
      };
      break;
  }
}

let ownerSearchTimeout = null;

function setupOwnerSearch(server) {
  const input = document.getElementById('owner-search-input');
  const resultsContainer = document.getElementById('owner-search-results');
  
  if (!input || !resultsContainer) return;
  
  input.oninput = () => {
    clearTimeout(ownerSearchTimeout);
    const query = input.value.trim();
    
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
      return;
    }
    
    ownerSearchTimeout = setTimeout(async () => {
      try {
        const res = await api(`/api/admin/users?search=${encodeURIComponent(query)}&per_page=10`);
        const data = await res.json();
        
        if (data.users?.length > 0) {
          resultsContainer.innerHTML = data.users.map(u => `
            <div class="search-result-item" data-user-id="${u.id}" data-username="${escapeHtml$1(u.username)}">
              <div class="user-avatar small">${(u.username || 'U')[0].toUpperCase()}</div>
              <div class="search-result-info">
                <span class="search-result-name">${escapeHtml$1(u.displayName || u.username)}</span>
                <span class="search-result-username">@${escapeHtml$1(u.username)}</span>
              </div>
            </div>
          `).join('');
          resultsContainer.style.display = 'block';
          
          resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.onclick = async () => {
              const userId = item.dataset.userId;
              const username = item.dataset.username;
              
              const confirmed = await confirm({ title: 'Transfer Server', message: `Transfer server to @${username}?`, confirmText: 'Transfer' });
              if (!confirmed) return;
              
              try {
                await api(`/api/admin/servers/${server.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ updates: { user_id: userId } })
                });
                
                success(`Server transferred to @${username}`);
                document.getElementById('current-owner-display').textContent = `@${username}`;
                input.value = '';
                resultsContainer.style.display = 'none';
              } catch (e) {
                error('Failed to transfer server');
              }
            };
          });
        } else {
          resultsContainer.innerHTML = '<div class="search-no-results">No users found</div>';
          resultsContainer.style.display = 'block';
        }
      } catch (e) {
        resultsContainer.innerHTML = '<div class="search-no-results">Search failed</div>';
        resultsContainer.style.display = 'block';
      }
    }, 300);
  };
  
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });
}

async function loadCurrentEgg(server) {
  const display = document.getElementById('current-egg-display');
  if (!display || !server.egg_id) {
    if (display) display.textContent = 'No egg assigned';
    return;
  }
  
  try {
    const res = await api(`/api/admin/eggs/${server.egg_id}`);
    const data = await res.json();
    if (data.egg) {
      display.textContent = data.egg.name;
    } else {
      display.textContent = 'Unknown egg';
    }
  } catch (e) {
    display.textContent = 'Failed to load';
  }
}

let eggSearchTimeout = null;

function setupEggSearch(server) {
  const input = document.getElementById('egg-search-input');
  const resultsContainer = document.getElementById('egg-search-results');
  
  if (!input || !resultsContainer) return;
  
  input.oninput = () => {
    clearTimeout(eggSearchTimeout);
    const query = input.value.trim();
    
    if (query.length < 1) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
      return;
    }
    
    eggSearchTimeout = setTimeout(async () => {
      try {
        const res = await api(`/api/admin/eggs?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.eggs?.length > 0) {
          resultsContainer.innerHTML = data.eggs.map(e => `
            <div class="search-result-item" data-egg-id="${e.id}" data-egg-name="${escapeHtml$1(e.name)}">
              <div class="egg-icon small">
                <span class="round-icon">${e.icon || 'egg'}</span>
              </div>
              <div class="search-result-info">
                <span class="search-result-name">${escapeHtml$1(e.name)}</span>
                <span class="search-result-sub">${escapeHtml$1(e.docker_image || 'No image')}</span>
              </div>
            </div>
          `).join('');
          resultsContainer.style.display = 'block';
          
          resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.onclick = async () => {
              const eggId = item.dataset.eggId;
              const eggName = item.dataset.eggName;
              
              const confirmed = await confirm({ title: 'Change Egg', message: `Change egg to "${eggName}"? This will update the startup command and Docker image.`, confirmText: 'Change' });
              if (!confirmed) return;
              
              try {
                const res = await api(`/api/admin/servers/${server.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ updates: { egg_id: eggId } })
                });
                
                const data = await res.json();
                if (data.success) {
                  success(`Egg changed to "${eggName}"`);
                  document.getElementById('current-egg-display').textContent = eggName;
                  if (data.server) {
                    document.getElementById('current-startup-display').textContent = data.server.startup || 'Not configured';
                    document.getElementById('current-docker-display').textContent = data.server.docker_image || 'Not set';
                  }
                  input.value = '';
                  resultsContainer.style.display = 'none';
                } else {
                  error('Failed to change egg');
                }
              } catch (e) {
                error('Failed to change egg');
              }
            };
          });
        } else {
          resultsContainer.innerHTML = '<div class="search-no-results">No eggs found</div>';
          resultsContainer.style.display = 'block';
        }
      } catch (e) {
        resultsContainer.innerHTML = '<div class="search-no-results">Search failed</div>';
        resultsContainer.style.display = 'block';
      }
    }, 300);
  };
  
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });
}

async function createNewServer() {
  try {
    const [usersRes, nodesRes, eggsRes] = await Promise.all([
      api(`/api/admin/users?per_page=100`),
      api(`/api/admin/nodes?per_page=100`),
      api('/api/admin/eggs')
    ]);
    
    const [usersData, nodesData, eggsData] = await Promise.all([
      usersRes.json(),
      nodesRes.json(),
      eggsRes.json()
    ]);
    
    if (!usersData.users?.length) {
      error('No users available');
      return;
    }
    if (!nodesData.nodes?.length) {
      error('No nodes available');
      return;
    }
    if (!eggsData.eggs?.length) {
      error('No eggs available');
      return;
    }
    
    const server = {
      name: 'Untitled Server',
      user_id: usersData.users[0].id,
      node_id: nodesData.nodes[0].id,
      egg_id: eggsData.eggs[0].id,
      memory: 1024,
      disk: 5120,
      cpu: 100
    };
    
    const res = await api('/api/admin/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server, skipInstall: true })
    });
    
    const data = await res.json();
    if (data.server?.id) {
      navigateTo$b('servers', data.server.id, 'details');
      info('Configure your server, then click "Install" when ready');
    } else {
      error(data.error || 'Failed to create server');
    }
  } catch (e) {
    error('Failed to create server');
  }
}

window.suspendServerAdmin = async function(serverId) {
  try {
    const res = await api(`/api/servers/${serverId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.ok) {
      // Trigger a reload in the main view. We assume adminNavigate will refresh.
      // But adminNavigate changes state. To reload current view we can just call the render function again
      // or re-navigate to same place.
      const currentTab = state.currentView.tab;
      navigateTo$b(currentTab);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to suspend');
    }
  } catch (e) {
    error('Failed to suspend');
  }
};

window.unsuspendServerAdmin = async function(serverId) {
  try {
    const res = await api(`/api/servers/${serverId}/unsuspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.ok) {
      const currentTab = state.currentView.tab;
      navigateTo$b(currentTab);
    } else {
      const data = await res.json();
      error(data.error || 'Failed to unsuspend');
    }
  } catch (e) {
    error('Failed to unsuspend');
  }
};

window.deleteServerAdmin = async function(serverId) {
  const confirmed = await confirm({ title: 'Delete Server', message: 'Are you sure? This will delete the server from the node.', danger: true });
  if (!confirmed) return;
  try {
    await api(`/api/admin/servers/${serverId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const currentTab = state.currentView.tab;
    navigateTo$b(currentTab);
  } catch (e) {
    error('Failed to delete server');
  }
};

async function showTransferModal(server) {
  // Load available nodes
  let nodes = [];
  try {
    const res = await api('/api/admin/nodes');
    const data = await res.json();
    nodes = (data.nodes || []).filter(n => n.id !== server.node_id && !n.maintenance_mode);
  } catch (e) {
    error('Failed to load nodes');
    return;
  }
  
  if (nodes.length === 0) {
    error('No other nodes available for transfer');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Transfer Server</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="transfer-form" class="modal-form">
        <div class="form-group">
          <label>Current Node</label>
          <input type="text" value="${escapeHtml$1(server.node_name || server.node_id)}" disabled />
        </div>
        <div class="form-group">
          <label>Target Node</label>
          <select name="target_node_id" required>
            <option value="">Select a node...</option>
            ${nodes.map(n => `<option value="${n.id}">${escapeHtml$1(n.name)} (${escapeHtml$1(n.fqdn)})</option>`).join('')}
          </select>
        </div>
        <div class="warning-box">
          <span class="round-icon">warning</span>
          <p>The server will be stopped during the transfer. All files will be copied to the new node.</p>
        </div>
        <div class="message" id="transfer-message"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Start Transfer</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('#transfer-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const targetNodeId = form.get('target_node_id');
    const messageEl = modal.querySelector('#transfer-message');
    const btn = e.target.querySelector('button[type="submit"]');
    
    if (!targetNodeId) {
      messageEl.textContent = 'Please select a target node';
      messageEl.className = 'message error';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon rotating">sync</span> Transferring...';
    
    try {
      const res = await api(`/api/admin/servers/${server.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_node_id: targetNodeId })
      });
      
      const data = await res.json();
      
      if (data.error) {
        messageEl.textContent = data.error;
        messageEl.className = 'message error';
        btn.disabled = false;
        btn.innerHTML = 'Start Transfer';
      } else {
        success('Server transfer completed');
        modal.remove();
        navigateTo$b('servers', server.id, 'details');
      }
    } catch (e) {
      messageEl.textContent = 'Transfer failed';
      messageEl.className = 'message error';
      btn.disabled = false;
      btn.innerHTML = 'Start Transfer';
    }
  };
}

const navigateTo$a = (...args) => window.adminNavigate(...args);

async function renderUsersList(container, username, loadView) {
  try {
    const search = state.searchQuery.users ? `&search=${encodeURIComponent(state.searchQuery.users)}` : '';
    const res = await api(`/api/admin/users?page=${state.currentPage.users}&per_page=${state.itemsPerPage.users}${search}`);
    const data = await res.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Users' }])}
        <div class="admin-header-actions">
          ${renderSearchBox('users', 'Search by username, ID, or display name...')}
          <button class="btn btn-primary" id="create-user-btn">
            <span class="round-icon">person_add</span>
            Create User
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${data.users.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">people</span>
            <p>No users yet</p>
          </div>
        ` : `
          <div class="list-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Limits</th>
                  <th>Subusers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${data.users.map(u => `
                  <tr class="clickable-row" data-id="${u.id}">
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar">${(u.username || 'U')[0].toUpperCase()}</div>
                        <div class="user-info">
                          <div class="cell-main">${escapeHtml$1(u.displayName || u.username)}</div>
                          <div class="cell-sub">@${escapeHtml$1(u.username)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="role-badge ${u.isAdmin ? 'admin' : 'user'}">${u.isAdmin ? 'Admin' : 'User'}</span></td>
                    <td>
                      <div class="resource-pills">
                        <span class="pill">${u.limits?.servers || 2} servers</span>
                        <span class="pill">${formatBytes((u.limits?.memory || 2048) * 1024 * 1024)}</span>
                        <span class="pill">${u.limits?.backups ?? 3} backups</span>
                      </div>
                    </td>
                    <td><span class="status-indicator ${u.allowSubusers === false ? 'status-danger' : 'status-success'}"></span> ${u.allowSubusers === false ? 'Disabled' : 'Enabled'}</td>
                    <td>
                      <div class="action-buttons" onclick="event.stopPropagation()">
                        <button class="btn btn-xs btn-ghost" onclick="adminNavigate('users', '${u.id}')">Manage</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="list-cards">
            ${data.users.map(u => `
              <div class="list-card" data-id="${u.id}">
                <div class="list-card-header">
                  <div class="user-avatar large">${(u.username || 'U')[0].toUpperCase()}</div>
                  <div class="list-card-title">
                    <h3>${escapeHtml$1(u.displayName || u.username)}</h3>
                    <span class="list-card-subtitle">@${escapeHtml$1(u.username)}</span>
                  </div>
                  <span class="role-badge ${u.isAdmin ? 'admin' : 'user'}">${u.isAdmin ? 'Admin' : 'User'}</span>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Servers</span>
                    <span class="stat-value">${u.limits?.servers || 2}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Memory</span>
                    <span class="stat-value">${formatBytes((u.limits?.memory || 2048) * 1024 * 1024)}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Backups</span>
                    <span class="stat-value">${u.limits?.backups ?? 3}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Subusers</span>
                    <span class="stat-value">${u.allowSubusers === false ? 'No' : 'Yes'}</span>
                  </div>
                </div>
                <div class="list-card-footer">
                  <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); adminNavigate('users', '${u.id}')">
                    <span class="round-icon">settings</span>
                    Manage
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
        ${renderPagination(data.meta, 'users')}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$a);
    setupPaginationListeners('users', loadView);
    setupSearchListeners('users', loadView);
    
    document.querySelectorAll('.clickable-row[data-id], .list-card[data-id]').forEach(el => {
      el.onclick = () => navigateTo$a('users', el.dataset.id);
    });
    
    document.getElementById('create-user-btn')?.addEventListener('click', () => {
      showCreateUserModal(loadView);
    });
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load users</div>`;
  }
}

function showCreateUserModal(loadView) {
  const existing = document.getElementById('create-user-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'create-user-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Create User</h3>
        <button class="modal-close" id="close-user-modal">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="create-user-form" class="modal-body">
        <div class="form-group">
          <label>Username *</label>
          <input type="text" name="username" required minlength="3" maxlength="20" placeholder="username" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="user@example.com" />
        </div>
        <div class="form-group">
          <label>Password *</label>
          <input type="password" name="password" required minlength="6" placeholder="Min 6 characters" />
        </div>
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" name="displayName" placeholder="Display Name" />
        </div>
        <div class="form-toggles">
          <label class="toggle-item">
            <input type="checkbox" name="isAdmin" />
            <span class="toggle-content">
              <span class="toggle-title">Administrator</span>
              <span class="toggle-desc">Grant full admin access</span>
            </span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="cancel-user-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('close-user-modal').onclick = () => modal.remove();
  document.getElementById('cancel-user-modal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  document.getElementById('create-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    const user = {
      username: form.username.value,
      email: form.email.value || undefined,
      password: form.password.value,
      displayName: form.displayName.value || undefined,
      isAdmin: form.isAdmin.checked
    };
    
    try {
      const res = await api('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      const data = await res.json();
      
      if (data.success) {
        success('User created successfully');
        modal.remove();
        loadView();
      } else {
        error(data.error || 'Failed to create user');
        btn.disabled = false;
        btn.textContent = 'Create User';
      }
    } catch (err) {
      error('Failed to create user');
      btn.disabled = false;
      btn.textContent = 'Create User';
    }
  };
}

async function renderUserDetail(container, username, userId) {
  try {
    const res = await api(`/api/admin/users`);
    const data = await res.json();
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      container.innerHTML = `<div class="error">User not found</div>`;
      return;
    }
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Users', onClick: 'list-users' },
          { label: user.displayName || user.username }
        ])}
      </div>
      
      <div class="detail-tabs">
        <button class="detail-tab ${state.currentView.subTab === 'overview' ? 'active' : ''}" data-subtab="overview">Overview</button>
        <button class="detail-tab ${state.currentView.subTab === 'servers' ? 'active' : ''}" data-subtab="servers">Servers</button>
        <button class="detail-tab ${state.currentView.subTab === 'permissions' ? 'active' : ''}" data-subtab="permissions">Permissions</button>
        <button class="detail-tab ${state.currentView.subTab === 'limits' ? 'active' : ''}" data-subtab="limits">Resource Limits</button>
      </div>
      
      <div class="detail-content" id="user-detail-content"></div>
    `;
    
    setupBreadcrumbListeners(navigateTo$a);
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.onclick = async () => {
        state.currentView.subTab = tab.dataset.subtab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        await renderUserSubTab(user, username);
      };
    });
    
    await renderUserSubTab(user, username);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load user</div>`;
  }
}

async function renderUserSubTab(user, username) {
  const content = document.getElementById('user-detail-content');
  
  switch (state.currentView.subTab) {
    case 'overview':
      content.innerHTML = `
        <div class="detail-grid">
          <div class="detail-card">
            <h3>User Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Username</span>
                <span class="info-value">@${escapeHtml$1(user.username)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Display Name</span>
                <span class="info-value">${escapeHtml$1(user.displayName || user.username)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">User ID</span>
                <span class="info-value code">${user.id}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Role</span>
                <span class="info-value"><span class="role-badge ${user.isAdmin ? 'admin' : 'user'}">${user.isAdmin ? 'Administrator' : 'User'}</span></span>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">${user.email ? escapeHtml$1(user.email) : '<span class="text-muted">Not set</span>'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email Verified</span>
                <span class="info-value">${user.emailVerified ? '<span class="status-success-text">Yes</span>' : '<span class="status-danger-text">No</span>'}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Resource Limits</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Max Servers</span>
                <span class="info-value">${user.limits?.servers || 2}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Max Memory</span>
                <span class="info-value">${formatBytes((user.limits?.memory || 2048) * 1024 * 1024)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Max Disk</span>
                <span class="info-value">${formatBytes((user.limits?.disk || 10240) * 1024 * 1024)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Max CPU</span>
                <span class="info-value">${user.limits?.cpu || 200}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">Max Allocations</span>
                <span class="info-value">${user.limits?.allocations || 5}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Max Backups</span>
                <span class="info-value">${user.limits?.backups ?? 3}</span>
              </div>
            </div>
          </div>
        
        <div class="detail-card danger-card" style="margin-top: 24px;">
          <h3>Danger Zone</h3>
          <div class="danger-actions">
            <div class="danger-action">
              <div class="danger-info">
                <span class="danger-title">Delete User</span>
                <span class="danger-desc">Permanently delete this user and all their servers. This action cannot be undone.</span>
              </div>
              <button class="btn btn-danger btn-sm" id="delete-user-btn">Delete User</button>
            </div>
          </div>
        </div>
      `;
      
      document.getElementById('delete-user-btn')?.addEventListener('click', async () => {
        const confirmUsername = await prompt(`Type "${user.username}" to confirm deletion:`, { title: 'Delete User', placeholder: user.username });
        if (confirmUsername !== user.username) {
          if (confirmUsername !== null) error('Username does not match');
          return;
        }
        
        const btn = document.getElementById('delete-user-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="round-icon spinning">sync</span> Deleting...';
        
        try {
          const res = await api('/api/admin/users/' + user.id, { method: 'DELETE' });
          const data = await res.json();
          
          if (data.success) {
            success('User deleted. ' + data.deletedServers + ' server(s) removed.');
            navigateTo$a('users');
          } else {
            error(data.error || 'Failed to delete user');
            btn.disabled = false;
            btn.textContent = 'Delete User';
          }
        } catch (e) {
          error('Failed to delete user');
          btn.disabled = false;
          btn.textContent = 'Delete User';
        }
      });
      break;
      
    case 'servers':
      content.innerHTML = '<div class="loading-spinner"></div>';
      try {
        const serversRes = await api('/api/admin/servers?per_page=100');
        const serversData = await serversRes.json();
        const userServers = serversData.servers.filter(s => s.user_id === user.id);
        
        content.innerHTML = `
          <div class="detail-card detail-card-wide">
            <h3>User Servers</h3>
            ${userServers.length === 0 ? `
              <div class="empty-state small">
                <span class="round-icon">storage</span>
                <p>This user has no servers</p>
              </div>
            ` : `
              <div class="user-servers-list">
                ${userServers.map(s => `
                  <div class="user-server-item" data-server-id="${s.id}">
                    <div class="user-server-info">
                      <span class="round-icon">dns</span>
                      <div class="user-server-details">
                        <span class="user-server-name">${escapeHtml$1(s.name)}</span>
                        <span class="user-server-meta">${s.node_name || 'Unknown Node'} • ${formatBytes((s.limits?.memory || 0) * 1024 * 1024)} RAM</span>
                      </div>
                    </div>
                    <div class="user-server-actions">
                      <span class="server-status-badge ${s.suspended ? 'suspended' : ''}">${s.suspended ? 'Suspended' : 'Active'}</span>
                      <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); adminNavigate('servers', '${s.id}')">
                        <span class="round-icon">settings</span>
                        Manage
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `;
        
        document.querySelectorAll('.user-server-item').forEach(el => {
          el.onclick = () => navigateTo$a('servers', el.dataset.serverId);
        });
      } catch (e) {
        content.innerHTML = '<div class="error">Failed to load servers</div>';
      }
      break;
      
    case 'permissions':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>User Permissions</h3>
          <form id="user-permissions-form" class="settings-form">
            <div class="form-toggles">
              <label class="toggle-item">
                <input type="checkbox" name="isAdmin" ${user.isAdmin ? 'checked' : ''} />
                <span class="toggle-content">
                  <span class="toggle-title">Administrator</span>
                  <span class="toggle-desc">Grant full administrative access to the panel</span>
                </span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" name="allowSubusers" ${user.allowSubusers !== false ? 'checked' : ''} />
                <span class="toggle-content">
                  <span class="toggle-title">Allow Subusers</span>
                  <span class="toggle-desc">Allow this user to add subusers to their servers</span>
                </span>
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save Permissions</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('user-permissions-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const updates = {
          isAdmin: form.get('isAdmin') === 'on',
          allowSubusers: form.get('allowSubusers') === 'on'
        };
        
        try {
          await api(`/api/admin/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
          });
          success('Permissions updated');
          navigateTo$a('users', user.id, 'permissions');
        } catch (e) {
          error('Failed to update permissions');
        }
      };
      break;
      
    case 'limits':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Resource Limits</h3>
          <p class="card-description">Set the maximum resources this user can allocate across all their servers.</p>
          <form id="user-limits-form" class="settings-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Max Servers</label>
                <input type="number" name="servers" value="${user.limits?.servers || 2}" min="0" required />
              </div>
              <div class="form-group">
                <label>Max Memory (MB)</label>
                <input type="number" name="memory" value="${user.limits?.memory || 2048}" min="0" required />
              </div>
              <div class="form-group">
                <label>Max Disk (MB)</label>
                <input type="number" name="disk" value="${user.limits?.disk || 10240}" min="0" required />
              </div>
              <div class="form-group">
                <label>Max CPU (%)</label>
                <input type="number" name="cpu" value="${user.limits?.cpu || 200}" min="0" required />
              </div>
              <div class="form-group">
                <label>Max Allocations</label>
                <input type="number" name="allocations" value="${user.limits?.allocations || 5}" min="0" required />
              </div>
              <div class="form-group">
                <label>Max Backups</label>
                <input type="number" name="backups" value="${user.limits?.backups ?? 3}" min="0" required />
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Update Limits</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('user-limits-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const limits = {
          servers: parseInt(form.get('servers')),
          memory: parseInt(form.get('memory')),
          disk: parseInt(form.get('disk')),
          cpu: parseInt(form.get('cpu')),
          allocations: parseInt(form.get('allocations')),
          backups: parseInt(form.get('backups'))
        };
        
        try {
          await api(`/api/admin/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: { limits } })
          });
          success('Limits updated');
          navigateTo$a('users', user.id, 'limits');
        } catch (e) {
          error('Failed to update limits');
        }
      };
      break;
  }
}

const navigateTo$9 = (...args) => window.adminNavigate(...args);

function renderAdminEggIcon(egg) {
  if (!egg.icon) {
    return '<span class="round-icon">egg_alt</span>';
  }
  
  // Check if it's a Material Icon name (no slashes, no dots)
  if (!egg.icon.includes('/') && !egg.icon.includes('.')) {
    return `<span class="round-icon">${escapeHtml$1(egg.icon)}</span>`;
  }
  
  // It's a URL (image)
  if (egg.icon.startsWith('http') || egg.icon.startsWith('/') || egg.icon.includes('.')) {
    return `<img src="${escapeHtml$1(egg.icon)}" alt="${escapeHtml$1(egg.name)}" onerror="this.outerHTML='<span class=\\'round-icon\\'>egg_alt</span>'" />`;
  }
  
  return '<span class="round-icon">egg_alt</span>';
}

async function renderNestsList(container, username, loadView) {
  try {
    const res = await api('/api/admin/nests');
    const data = await res.json();
    const nests = data.nests || [];
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Nests & Eggs' }])}
        <div class="admin-header-actions">
          <button class="btn btn-ghost" id="create-nest-btn">
            <span class="round-icon">create_new_folder</span>
            Create Nest
          </button>
          ${nests.length > 0 ? `
            <button class="btn btn-ghost" id="create-egg-btn">
              <span class="round-icon">add</span>
              New Egg
            </button>
            <button class="btn btn-primary" id="import-egg-btn">
              <span class="round-icon">upload</span>
              Import Egg
            </button>
          ` : ''}
        </div>
      </div>
      
      <div class="admin-list">
        ${nests.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">egg</span>
            <p>No nests yet. Create one to organize your eggs.</p>
          </div>
        ` : `
          <div class="nests-list">
            ${nests.map(nest => `
              <div class="nest-card">
                <div class="nest-header">
                  <div class="nest-info">
                    <h3>${escapeHtml$1(nest.name)}</h3>
                    <p>${escapeHtml$1(nest.description || 'No description')}</p>
                  </div>
                  <div class="nest-actions">
                    <button class="btn btn-sm btn-ghost" onclick="editNestAdmin('${nest.id}')" title="Edit Nest">
                      <span class="round-icon">edit</span>
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="addEggToNestAdmin('${nest.id}')" title="Add Egg">
                      <span class="round-icon">add</span>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteNestAdmin('${nest.id}')" title="Delete Nest">
                      <span class="round-icon">delete</span>
                    </button>
                  </div>
                </div>
                <div class="eggs-grid">
                  ${(nest.eggs || []).length === 0 ? `
                    <div class="empty-eggs">No eggs in this nest</div>
                  ` : (nest.eggs || []).map(egg => `
                    <div class="egg-card clickable" data-egg-id="${egg.id}">
                      <div class="egg-icon">
                        ${renderAdminEggIcon(egg)}
                      </div>
                      <div class="egg-info">
                        <h4>${escapeHtml$1(egg.name)}${egg.admin_only ? '<span class="admin-badge">Admin</span>' : ''}</h4>
                        <span class="egg-author">${escapeHtml$1(egg.author || 'Unknown')}</span>
                      </div>
                      <div class="egg-meta">
                        <span class="egg-vars-count" title="Variables">${(egg.variables || []).length} vars</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$9);
    
    document.getElementById('create-nest-btn').onclick = () => showNestModal(username, null, loadView);
    
    const createEggBtn = document.getElementById('create-egg-btn');
    if (createEggBtn) {
      createEggBtn.onclick = () => createNewEgg();
    }
    
    const importBtn = document.getElementById('import-egg-btn');
    if (importBtn) {
      importBtn.onclick = () => showImportEggModal(username, nests, loadView);
    }
    
    // Click on egg card to open detail view
    document.querySelectorAll('.egg-card.clickable').forEach(card => {
      card.onclick = () => navigateTo$9('eggs', card.dataset.eggId);
    });
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load nests</div>`;
  }
}

function showNestModal(username, nest = null, loadView) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>${nest ? 'Edit Nest' : 'Create Nest'}</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="nest-form" class="modal-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${nest ? escapeHtml$1(nest.name) : ''}" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3">${nest ? escapeHtml$1(nest.description || '') : ''}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">${nest ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('nest-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const nestData = {
      name: form.get('name'),
      description: form.get('description')
    };
    
    try {
      if (nest) {
        await api(`/api/admin/nests/${nest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nest: nestData })
        });
      } else {
        await api('/api/admin/nests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nest: nestData })
        });
      }
      modal.remove();
      // If loadView is passed, use it, otherwise assume global loadView works via window or we are in a context where reload happens
      if (typeof loadView === 'function') loadView();
      else if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
    } catch (e) {
      error('Failed to save nest');
    }
  };
}

function showImportEggModal(username, nests, loadView) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h2>Import Egg</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="import-egg-form" class="modal-form">
        <div class="form-group">
          <label>Target Nest</label>
          <select name="nest_id" required>
            ${nests.map(n => `<option value="${n.id}">${escapeHtml$1(n.name)}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>Import Method</label>
          <div class="import-method-tabs">
            <button type="button" class="import-tab active" data-method="file">
              <span class="round-icon">upload_file</span>
              Upload File
            </button>
            <button type="button" class="import-tab" data-method="paste">
              <span class="round-icon">content_paste</span>
              Paste JSON
            </button>
          </div>
        </div>
        
        <div id="import-file-section" class="form-group">
          <label>Egg File (.json)</label>
          <div class="file-upload-area" id="file-upload-area">
            <input type="file" name="eggFile" id="egg-file-input" accept=".json" hidden />
            <span class="round-icon">cloud_upload</span>
            <p>Click to select or drag & drop egg file</p>
            <span class="file-name" id="selected-file-name"></span>
          </div>
        </div>
        
        <div id="import-paste-section" class="form-group" style="display: none;">
          <label>Egg JSON</label>
          <textarea name="eggJson" rows="12" placeholder="Paste Pterodactyl egg JSON here..."></textarea>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Import</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  const fileSection = modal.querySelector('#import-file-section');
  const pasteSection = modal.querySelector('#import-paste-section');
  const fileInput = modal.querySelector('#egg-file-input');
  const uploadArea = modal.querySelector('#file-upload-area');
  const fileNameSpan = modal.querySelector('#selected-file-name');
  const tabs = modal.querySelectorAll('.import-tab');
  
  let currentMethod = 'file';
  let fileContent = null;
  
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMethod = tab.dataset.method;
      
      if (currentMethod === 'file') {
        fileSection.style.display = '';
        pasteSection.style.display = 'none';
      } else {
        fileSection.style.display = 'none';
        pasteSection.style.display = '';
      }
    };
  });
  
  uploadArea.onclick = () => fileInput.click();
  
  uploadArea.ondragover = (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  };
  
  uploadArea.ondragleave = () => {
    uploadArea.classList.remove('dragover');
  };
  
  uploadArea.ondrop = (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      handleFileSelect(file);
    } else {
      error('Please select a .json file');
    }
  };
  
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };
  
  function handleFileSelect(file) {
    fileNameSpan.textContent = file.name;
    uploadArea.classList.add('has-file');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      fileContent = e.target.result;
    };
    reader.onerror = () => {
      error('Failed to read file');
      fileContent = null;
    };
    reader.readAsText(file);
  }
  
  document.getElementById('import-egg-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    let eggJson;
    if (currentMethod === 'file') {
      if (!fileContent) {
        error('Please select a file');
        return;
      }
      eggJson = fileContent;
    } else {
      eggJson = form.get('eggJson');
      if (!eggJson || !eggJson.trim()) {
        error('Please paste egg JSON');
        return;
      }
    }
    
    try {
      JSON.parse(eggJson);
    } catch {
      error('Invalid JSON format');
      return;
    }
    
    try {
      const res = await api('/api/admin/eggs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          nest_id: form.get('nest_id'),
          eggJson
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        modal.remove();
        if (typeof loadView === 'function') loadView();
        else if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
        success('Egg imported successfully');
      } else {
        error(data.error || 'Failed to import egg');
      }
    } catch (e) {
      error('Failed to import egg');
    }
  };
}

window.editNestAdmin = async function(nestId) {
  const res = await api('/api/admin/nests');
  const data = await res.json();
  const nest = data.nests.find(n => n.id === nestId);
  if (nest) {
    // We need to trigger showNestModal. Since we don't have loadView reference here easily,
    // we rely on the modal's save function using adminNavigate or we pass a dummy.
    showNestModal(state$1.username, nest, () => navigateTo$9('nests'));
  }
};

window.deleteNestAdmin = async function(nestId) {
  const confirmed = await confirm({ title: 'Delete Nest', message: 'Delete this nest and all its eggs?', danger: true });
  if (!confirmed) return;
  
  try {
    await api(`/api/admin/nests/${nestId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    navigateTo$9('nests');
  } catch (e) {
    error('Failed to delete nest');
  }
};

window.addEggToNestAdmin = async function(nestId) {
  await createNewEgg(nestId);
};

async function createNewEgg(nestId = null) {
  try {
    const res = await api('/api/admin/nests');
    const data = await res.json();
    
    if (!data.nests?.length) {
      error('Create a nest first');
      return;
    }
    
    const targetNestId = nestId || data.nests[0].id;
    
    const egg = {
      name: 'Untitled Egg',
      nest_id: targetNestId,
      description: '',
      author: 'admin@sodium.local',
      docker_images: { 'Default': 'ghcr.io/pterodactyl/yolks:java_17' },
      docker_image: 'ghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar',
      config: { stop: 'stop' }
    };
    
    const createRes = await api('/api/admin/eggs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ egg })
    });
    
    const createData = await createRes.json();
    if (createData.egg?.id) {
      navigateTo$9('eggs', createData.egg.id, 'about');
      info('Configure your new egg');
    } else {
      error(createData.error || 'Failed to create egg');
    }
  } catch (e) {
    error('Failed to create egg');
  }
}

window.editEggAdmin = function(eggId) {
  navigateTo$9('eggs', eggId);
};

window.deleteEggAdmin = async function(eggId) {
  const confirmed = await confirm({ title: 'Delete Egg', message: 'Delete this egg?', danger: true });
  if (!confirmed) return;
  
  try {
    await api(`/api/admin/eggs/${eggId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    navigateTo$9('nests');
  } catch (e) {
    error('Failed to delete egg');
  }
};

async function renderEggDetail(container, username, eggId) {
  try {
    const res = await api(`/api/admin/eggs/${eggId}`);
    const data = await res.json();
    const egg = data.egg;
    
    if (!egg) {
      container.innerHTML = `<div class="error">Egg not found</div>`;
      return;
    }
    
    const nestsRes = await api('/api/admin/nests');
    const nestsData = await nestsRes.json();
    const nests = nestsData.nests || [];
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Nests & Eggs', onClick: 'list-nests' },
          { label: egg.name }
        ])}
        <div class="admin-header-actions">
          <button class="btn btn-ghost" id="export-egg-btn">
            <span class="round-icon">download</span>
            Export
          </button>
          <button class="btn btn-danger" id="delete-egg-btn">
            <span class="round-icon">delete</span>
            Delete
          </button>
        </div>
      </div>
      
      <div class="detail-tabs">
        <button class="detail-tab ${state.currentView.subTab === 'about' ? 'active' : ''}" data-subtab="about">About</button>
        <button class="detail-tab ${state.currentView.subTab === 'configuration' ? 'active' : ''}" data-subtab="configuration">Configuration</button>
        <button class="detail-tab ${state.currentView.subTab === 'variables' ? 'active' : ''}" data-subtab="variables">Variables</button>
        <button class="detail-tab ${state.currentView.subTab === 'install' ? 'active' : ''}" data-subtab="install">Install Script</button>
      </div>
      
      <div class="detail-content" id="egg-detail-content"></div>
    `;
    
    setupBreadcrumbListeners(navigateTo$9);
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.onclick = () => {
        state.currentView.subTab = tab.dataset.subtab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderEggSubTab(egg, nests, username);
      };
    });
    
    document.getElementById('delete-egg-btn').onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Egg', message: 'Are you sure you want to delete this egg? This cannot be undone.', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/eggs/${eggId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        navigateTo$9('nests');
      } catch (e) {
        error('Failed to delete egg');
      }
    };
    
    document.getElementById('export-egg-btn').onclick = () => {
      const exportData = {
        "_comment": "Exported from Sodium Panel",
        "meta": { "version": "PTDL_v2" },
        "exported_at": new Date().toISOString(),
        "name": egg.name,
        "author": egg.author || "admin@sodium.local",
        "description": egg.description || "",
        "docker_images": egg.docker_images || {},
        "startup": egg.startup,
        "config": egg.config || {},
        "scripts": {
          "installation": {
            "script": egg.install_script || "#!/bin/bash\necho 'No install script'",
            "container": egg.install_container || "alpine:3.18",
            "entrypoint": egg.install_entrypoint || "bash"
          }
        },
        "variables": (egg.variables || []).map(v => ({
          "name": v.name,
          "description": v.description || "",
          "env_variable": v.env_variable,
          "default_value": v.default_value || "",
          "user_viewable": v.user_viewable !== false,
          "user_editable": v.user_editable !== false,
          "rules": v.rules || "nullable|string"
        }))
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `egg-${egg.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      success('Egg exported');
    };
    
    renderEggSubTab(egg, nests, username);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load egg</div>`;
  }
}

function renderEggSubTab(egg, nests, username) {
  const content = document.getElementById('egg-detail-content');
  
  switch (state.currentView.subTab) {
    case 'about':
      renderEggAboutTab(content, egg, nests, username);
      break;
    case 'configuration':
      renderEggConfigTab(content, egg, username);
      break;
    case 'variables':
      renderEggVariablesTab(content, egg, username);
      break;
    case 'install':
      renderEggInstallTab(content, egg, username);
      break;
    default:
      renderEggAboutTab(content, egg, nests, username);
  }
}

function renderEggAboutTab(content, egg, nests, username) {
  const dockerImagesText = egg.docker_images && typeof egg.docker_images === 'object'
    ? Object.entries(egg.docker_images).map(([k, v]) => `${k}|${v}`).join('\n')
    : egg.docker_image || '';
  
  content.innerHTML = `
    <div class="detail-card detail-card-wide">
      <h3>Egg Information</h3>
      <form id="egg-about-form" class="settings-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" value="${escapeHtml$1(egg.name)}" required />
          </div>
          <div class="form-group">
            <label>Nest</label>
            <select name="nest_id" required>
              ${nests.map(n => `<option value="${n.id}" ${n.id === egg.nest_id ? 'selected' : ''}>${escapeHtml$1(n.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3">${escapeHtml$1(egg.description || '')}</textarea>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Author</label>
            <input type="text" name="author" value="${escapeHtml$1(egg.author || '')}" />
          </div>
          <div class="form-group">
            <label>Icon</label>
            <input type="text" name="icon" value="${escapeHtml$1(egg.icon || '')}" placeholder="egg_alt, terminal, or image URL" />
            <p class="form-hint">Material Icon name, image URL, or leave empty for default</p>
          </div>
        </div>
        <div class="form-group">
          <label>UUID</label>
          <input type="text" value="${egg.id}" readonly class="input-readonly" />
        </div>
        <div class="form-group">
          <label>Docker Images</label>
          <p class="form-hint">One per line. Format: Label|image:tag (e.g., Java 17|ghcr.io/pterodactyl/yolks:java_17)</p>
          <textarea name="docker_images" rows="4">${dockerImagesText}</textarea>
        </div>
        <div class="form-toggles">
          <label class="toggle-item">
            <input type="checkbox" name="admin_only" ${egg.admin_only ? 'checked' : ''} />
            <span class="toggle-content">
              <span class="toggle-title">Admin Only</span>
              <span class="toggle-desc">Only administrators can use this egg to create servers</span>
            </span>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('egg-about-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    const dockerImagesRaw = form.get('docker_images');
    const docker_images = {};
    dockerImagesRaw.split('\n').filter(l => l.trim()).forEach(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 2) {
        docker_images[parts[0]] = parts[1];
      } else if (parts[0]) {
        docker_images[parts[0]] = parts[0];
      }
    });
    
    try {
      await api(`/api/admin/eggs/${egg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg: {
            name: form.get('name'),
            nest_id: form.get('nest_id'),
            description: form.get('description'),
            author: form.get('author'),
            icon: form.get('icon') || null,
            admin_only: form.get('admin_only') === 'on',
            docker_images,
            docker_image: Object.values(docker_images)[0] || egg.docker_image
          }
        })
      });
      success('Egg updated');
      navigateTo$9('eggs', egg.id, 'about');
    } catch (e) {
      error('Failed to update egg');
    }
  };
}

function renderEggConfigTab(content, egg, username) {
  const config = egg.config || {};
  const filesConfig = typeof config.files === 'string' ? config.files : JSON.stringify(config.files || {}, null, 2);
  const startupConfig = typeof config.startup === 'string' ? config.startup : JSON.stringify(config.startup || {}, null, 2);
  const logsConfig = typeof config.logs === 'string' ? config.logs : JSON.stringify(config.logs || {}, null, 2);
  
  content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card detail-card-wide">
        <h3>Startup Configuration</h3>
        <form id="egg-startup-form" class="settings-form">
          <div class="form-group">
            <label>Startup Command</label>
            <p class="form-hint">Use {{VARIABLE}} syntax for environment variables</p>
            <textarea name="startup" rows="3" class="code-textarea">${escapeHtml$1(egg.startup || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Stop Command</label>
            <p class="form-hint">Command sent to stop the server (e.g., ^C, stop, quit)</p>
            <input type="text" name="stop" value="${escapeHtml$1(config.stop || '^C')}" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Startup Config</button>
          </div>
        </form>
      </div>
      
      <div class="detail-card detail-card-wide">
        <h3>Advanced Configuration (JSON)</h3>
        <form id="egg-advanced-form" class="settings-form">
          <div class="form-group">
            <label>Files Configuration</label>
            <p class="form-hint">Configuration file parsing rules</p>
            <textarea name="files" rows="6" class="code-textarea">${escapeHtml$1(filesConfig)}</textarea>
          </div>
          <div class="form-group">
            <label>Startup Detection</label>
            <p class="form-hint">Pattern to detect when server has started</p>
            <textarea name="startup_config" rows="4" class="code-textarea">${escapeHtml$1(startupConfig)}</textarea>
          </div>
          <div class="form-group">
            <label>Logs Configuration</label>
            <textarea name="logs" rows="4" class="code-textarea">${escapeHtml$1(logsConfig)}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Advanced Config</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.getElementById('egg-startup-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    try {
      await api(`/api/admin/eggs/${egg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg: {
            startup: form.get('startup'),
            config: { ...egg.config, stop: form.get('stop') }
          }
        })
      });
      success('Startup config updated');
      navigateTo$9('eggs', egg.id, 'configuration');
    } catch (e) {
      error('Failed to update config');
    }
  };
  
  document.getElementById('egg-advanced-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    let files, startup_config, logs;
    try {
      files = JSON.parse(form.get('files') || '{}');
      startup_config = JSON.parse(form.get('startup_config') || '{}');
      logs = JSON.parse(form.get('logs') || '{}');
    } catch (err) {
      error('Invalid JSON in configuration');
      return;
    }
    
    try {
      await api(`/api/admin/eggs/${egg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg: {
            config: {
              ...egg.config,
              files: JSON.stringify(files),
              startup: JSON.stringify(startup_config),
              logs: JSON.stringify(logs)
            }
          }
        })
      });
      success('Advanced config updated');
      navigateTo$9('eggs', egg.id, 'configuration');
    } catch (e) {
      error('Failed to update config');
    }
  };
}

function renderEggVariablesTab(content, egg, username) {
  const variables = egg.variables || [];
  
  content.innerHTML = `
    <div class="detail-card detail-card-wide">
      <div class="card-header-flex">
        <h3>Environment Variables</h3>
        <button class="btn btn-primary btn-sm" id="add-variable-btn">
          <span class="round-icon">add</span>
          Add Variable
        </button>
      </div>
      <p class="card-description">Variables are passed to the server as environment variables and can be used in the startup command with {{VARIABLE}} syntax.</p>
      
      <div class="variables-list" id="variables-list">
        ${variables.length === 0 ? `
          <div class="empty-state small">
            <span class="round-icon">code</span>
            <p>No variables defined</p>
          </div>
        ` : variables.map((v, idx) => `
          <div class="variable-card" data-index="${idx}">
            <div class="variable-header">
              <div class="variable-title">
                <span class="variable-name">${escapeHtml$1(v.name)}</span>
                <code class="variable-env">\${${escapeHtml$1(v.env_variable)}}</code>
              </div>
              <div class="variable-actions">
                <button class="btn btn-xs btn-ghost edit-var-btn" data-index="${idx}">
                  <span class="round-icon">edit</span>
                </button>
                <button class="btn btn-xs btn-danger delete-var-btn" data-index="${idx}">
                  <span class="round-icon">delete</span>
                </button>
              </div>
            </div>
            <div class="variable-details">
              <p class="variable-desc">${escapeHtml$1(v.description || 'No description')}</p>
              <div class="variable-meta">
                <span><strong>Default:</strong> ${escapeHtml$1(v.default_value || '(empty)')}</span>
                <span><strong>Rules:</strong> ${escapeHtml$1(v.rules || 'nullable|string')}</span>
              </div>
              <div class="variable-flags">
                ${v.user_viewable !== false ? '<span class="flag success">Viewable</span>' : '<span class="flag">Hidden</span>'}
                ${v.user_editable !== false ? '<span class="flag success">Editable</span>' : '<span class="flag">Locked</span>'}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  document.getElementById('add-variable-btn').onclick = () => showVariableModal(egg, null, username);
  
  document.querySelectorAll('.edit-var-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      showVariableModal(egg, idx, username);
    };
  });
  
  document.querySelectorAll('.delete-var-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const confirmed = await confirm({ title: 'Delete Variable', message: 'Delete this variable?', danger: true });
      if (!confirmed) return;
      const idx = parseInt(btn.dataset.index);
      const newVars = [...variables];
      newVars.splice(idx, 1);
      
      try {
        await api(`/api/admin/eggs/${egg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ egg: { variables: newVars } })
        });
        success('Variable deleted');
        navigateTo$9('eggs', egg.id, 'variables');
      } catch (e) {
        error('Failed to delete variable');
      }
    };
  });
}

function showVariableModal(egg, editIndex, username) {
  const isEdit = editIndex !== null;
  const variable = isEdit ? egg.variables[editIndex] : {};
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Variable' : 'Add Variable'}</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="variable-form" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" value="${escapeHtml$1(variable.name || '')}" placeholder="Server Memory" required />
          </div>
          <div class="form-group">
            <label>Environment Variable</label>
            <input type="text" name="env_variable" value="${escapeHtml$1(variable.env_variable || '')}" placeholder="SERVER_MEMORY" required pattern="[A-Z0-9_]+" title="Uppercase letters, numbers and underscores only" />
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="2" placeholder="Memory allocated to the server in MB">${escapeHtml$1(variable.description || '')}</textarea>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Default Value</label>
            <input type="text" name="default_value" value="${escapeHtml$1(variable.default_value || '')}" placeholder="1024" />
          </div>
          <div class="form-group">
            <label>Validation Rules</label>
            <input type="text" name="rules" value="${escapeHtml$1(variable.rules || 'nullable|string')}" placeholder="required|integer|min:128" />
          </div>
        </div>
        <div class="form-toggles">
          <label class="toggle-item">
            <input type="checkbox" name="user_viewable" ${variable.user_viewable !== false ? 'checked' : ''} />
            <span class="toggle-content">
              <span class="toggle-title">User Viewable</span>
              <span class="toggle-desc">Users can see this variable's value</span>
            </span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" name="user_editable" ${variable.user_editable !== false ? 'checked' : ''} />
            <span class="toggle-content">
              <span class="toggle-title">User Editable</span>
              <span class="toggle-desc">Users can modify this variable's value</span>
            </span>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('variable-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    const newVar = {
      name: form.get('name'),
      env_variable: form.get('env_variable').toUpperCase(),
      description: form.get('description'),
      default_value: form.get('default_value'),
      rules: form.get('rules') || 'nullable|string',
      user_viewable: form.get('user_viewable') === 'on',
      user_editable: form.get('user_editable') === 'on'
    };
    
    const newVars = [...(egg.variables || [])];
    if (isEdit) {
      newVars[editIndex] = newVar;
    } else {
      newVars.push(newVar);
    }
    
    try {
      await api(`/api/admin/eggs/${egg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ egg: { variables: newVars } })
      });
      modal.remove();
      success(isEdit ? 'Variable updated' : 'Variable added');
      navigateTo$9('eggs', egg.id, 'variables');
    } catch (e) {
      error('Failed to save variable');
    }
  };
}

function renderEggInstallTab(content, egg, username) {
  content.innerHTML = `
    <div class="detail-card detail-card-wide">
      <h3>Install Script</h3>
      <p class="card-description">This script runs when a server is first created to set up the environment.</p>
      <form id="egg-install-form" class="settings-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Install Container</label>
            <p class="form-hint">Docker image used to run the install script</p>
            <input type="text" name="install_container" value="${escapeHtml$1(egg.install_container || 'alpine:3.18')}" />
          </div>
          <div class="form-group">
            <label>Install Entrypoint</label>
            <p class="form-hint">Command used to run the script (e.g., bash, ash, sh)</p>
            <input type="text" name="install_entrypoint" value="${escapeHtml$1(egg.install_entrypoint || 'bash')}" />
          </div>
        </div>
        <div class="form-group">
          <label>Install Script</label>
          <p class="form-hint">Shell script executed during server installation. Files are stored in /mnt/server</p>
          <textarea name="install_script" rows="20" class="code-textarea">${escapeHtml$1(egg.install_script || '#!/bin/bash\ncd /mnt/server\necho "No install script configured"')}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Install Script</button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('egg-install-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    try {
      await api(`/api/admin/eggs/${egg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg: {
            install_container: form.get('install_container'),
            install_entrypoint: form.get('install_entrypoint'),
            install_script: form.get('install_script')
          }
        })
      });
      success('Install script updated');
      navigateTo$9('eggs', egg.id, 'install');
    } catch (e) {
      error('Failed to update install script');
    }
  };
}

const navigateTo$8 = (...args) => window.adminNavigate(...args);

async function renderLocationsList(container, username, loadView) {
  try {
    const res = await api('/api/admin/locations');
    const data = await res.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Locations' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-location-btn">
            <span class="round-icon">add</span>
            Create Location
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${data.locations.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">location_on</span>
            <p>No locations yet</p>
          </div>
        ` : `
          <div class="locations-grid">
            ${data.locations.map(l => `
              <div class="location-card">
                <div class="location-icon">
                  <span class="round-icon">location_on</span>
                </div>
                <div class="location-info">
                  <h3>${escapeHtml$1(l.short)}</h3>
                  <p>${escapeHtml$1(l.long)}</p>
                </div>
                <div class="location-actions">
                  <button class="btn btn-sm btn-danger" onclick="deleteLocationAdmin('${l.id}')">
                    <span class="round-icon">delete</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$8);
    
    document.getElementById('create-location-btn').onclick = () => showLocationModal(username, loadView);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load locations</div>`;
  }
}

function showLocationModal(username, loadView) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Location</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="location-form" class="modal-form">
        <div class="form-group">
          <label>Short Code</label>
          <input type="text" name="short" placeholder="e.g., us, eu, asia" required />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="long" placeholder="e.g., United States, Europe" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('location-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    try {
      await api('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          location: {
            short: form.get('short'),
            long: form.get('long')
          }
        })
      });
      modal.remove();
      if (typeof loadView === 'function') loadView();
      else if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
    } catch (e) {
      error('Failed to create location');
    }
  };
}

window.deleteLocationAdmin = async function(locationId) {
  const confirmed = await confirm({ title: 'Delete Location', message: 'Delete this location?', danger: true });
  if (!confirmed) return;
  
  try {
    await api(`/api/admin/locations/${locationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    // Assume adminNavigate is available to refresh
    if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
  } catch (e) {
    error('Failed to delete location');
  }
};

const navigateTo$7 = (...args) => window.adminNavigate(...args);

let currentSettingsTab = 'general';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'branding', label: 'Branding', icon: 'palette' },
  { id: 'registration', label: 'Registration', icon: 'person_add' },
  { id: 'defaults', label: 'User Defaults', icon: 'tune' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'oauth', label: 'OAuth Providers', icon: 'login' },
  { id: 'api-keys', label: 'API Keys', icon: 'vpn_key' },
  { id: 'mail', label: 'Mail', icon: 'email' },
  { id: 'maintenance', label: 'Maintenance', icon: 'construction' },
  { id: 'advanced', label: 'Advanced', icon: 'code' }
];

let mailConfigured = false;

async function renderSettingsPage(container, username, loadView) {
  const urlParams = new URLSearchParams(window.location.search);
  currentSettingsTab = urlParams.get('tab') || 'general';
  
  try {
    const res = await api(`/api/admin/settings`);
    const data = await res.json();
    const config = data.config || {};
    mailConfigured = data.mailConfigured || false;
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Settings' }])}
      </div>
      
      <div class="settings-layout">
        <aside class="settings-sidebar">
          <nav class="settings-nav">
            ${SETTINGS_TABS.map(tab => `
              <button class="settings-nav-item ${currentSettingsTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
                <span class="round-icon">${tab.icon}</span>
                <span>${tab.label}</span>
              </button>
            `).join('')}
          </nav>
        </aside>
        
        <div class="settings-content" id="settings-content">
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$7);
    
    container.querySelectorAll('.settings-nav-item').forEach(btn => {
      btn.onclick = () => {
        currentSettingsTab = btn.dataset.tab;
        container.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        history.replaceState(null, '', `/admin/settings?tab=${currentSettingsTab}`);
        renderSettingsContent(config);
      };
    });
    
    renderSettingsContent(config);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load settings</div>`;
  }
}

async function renderSettingsContent(config) {
  const content = document.getElementById('settings-content');
  if (!content) return;
  
  switch (currentSettingsTab) {
    case 'general':
      renderGeneralSettings(content, config);
      break;
    case 'branding':
      renderBrandingSettings(content, config);
      break;
    case 'registration':
      renderRegistrationSettings(content, config);
      break;
    case 'defaults':
      renderDefaultsSettings(content, config);
      break;
    case 'security':
      renderSecuritySettings(content, config);
      break;
    case 'oauth':
      renderOAuthSettings(content, config);
      break;
    case 'api-keys':
      renderApiKeysSettings(content, config);
      break;
    case 'mail':
      renderMailSettings(content, config);
      break;
    case 'maintenance':
      renderMaintenanceSettings(content, config);
      break;
    case 'advanced':
      renderAdvancedSettings(content, config);
      break;
    default:
      renderGeneralSettings(content, config);
  }
}

// ==================== GENERAL SETTINGS ====================

function renderGeneralSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>General Settings</h2>
        <p>Configure basic panel information and branding.</p>
      </div>
      
      <form id="general-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>Panel Information</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Panel Name</label>
              <input type="text" name="panel_name" value="${escapeHtml$1(config.panel?.name || 'Sodium Panel')}" />
              <small class="form-hint">Displayed in the browser title and navigation</small>
            </div>
            <div class="form-group">
              <label>Panel URL</label>
              <input type="url" name="panel_url" value="${escapeHtml$1(config.panel?.url || '')}" placeholder="https://panel.example.com" />
              <small class="form-hint">Used for OAuth callbacks and email links</small>
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Features</h3>
          <div class="form-toggles">
            <label class="toggle-item">
              <input type="checkbox" name="subusers_enabled" ${config.features?.subusers !== false ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Subusers</span>
                <span class="toggle-desc">Allow users to share server access with others</span>
              </span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" name="disable_user_server_creation" ${config.features?.disableUserServerCreation ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Disable User Server Creation</span>
                <span class="toggle-desc">Prevent non-admin users from creating new servers</span>
              </span>
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('general-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const newConfig = {
      panel: {
        name: form.panel_name.value,
        url: form.panel_url.value
      },
      features: {
        subusers: form.subusers_enabled.checked,
        disableUserServerCreation: form.disable_user_server_creation.checked
      }
    };
    
    await saveSettings(newConfig);
  };
}

// ==================== BRANDING SETTINGS ====================

function renderBrandingSettings(content, config) {
  const branding = config.branding || {};
  const colorInputStyle = 'width: 48px; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer; padding: 2px;';
  
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>Branding</h2>
        <p>Customize the look and feel of your panel.</p>
      </div>
      
      <form id="branding-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>Accent Colors</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Primary</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <input type="color" data-sync="accent_color" value="${escapeHtml$1(branding.accentColor || '#d97339')}" style="${colorInputStyle}" />
                <input type="text" name="accent_color" value="${escapeHtml$1(branding.accentColor || '#d97339')}" placeholder="#d97339" style="max-width: 140px;" />
              </div>
              <small class="form-hint">Buttons, links, and highlights</small>
            </div>
            <div class="form-group">
              <label>Hover</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <input type="color" data-sync="accent_hover" value="${escapeHtml$1(branding.accentHover || '#e88a4d')}" style="${colorInputStyle}" />
                <input type="text" name="accent_hover" value="${escapeHtml$1(branding.accentHover || '#e88a4d')}" placeholder="#e88a4d" style="max-width: 140px;" />
              </div>
              <small class="form-hint">Hover state for accented elements</small>
            </div>
            <div class="form-group">
              <label>Muted</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <input type="text" name="accent_muted" value="${escapeHtml$1(branding.accentMuted || 'rgba(217, 115, 57, 0.1)')}" placeholder="rgba(217, 115, 57, 0.1)" />
              </div>
              <small class="form-hint">Subtle backgrounds (supports rgba)</small>
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Logo</h3>
          <p class="form-hint" style="margin-bottom: 12px;">Displayed in the navigation bar and sidebar. Recommended: square image, PNG or SVG.</p>
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
            <img id="logo-preview" src="${branding.logo || '/favicon.svg'}" alt="Logo" style="width: 48px; height: 48px; border-radius: var(--radius-md); border: 1px solid var(--border); object-fit: contain; padding: 4px; background: var(--bg-secondary);" />
            <div style="display: flex; gap: 8px;">
              <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
                <span class="round-icon" style="font-size: 16px;">upload</span>
                Upload Logo
                <input type="file" id="logo-upload" accept="image/png,image/jpeg,image/svg+xml,image/webp" style="display: none;" />
              </label>
              ${branding.logo ? `<button type="button" class="btn btn-danger btn-sm" id="remove-logo-btn">
                <span class="round-icon" style="font-size: 16px;">delete</span>
                Remove
              </button>` : ''}
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Favicon</h3>
          <p class="form-hint" style="margin-bottom: 12px;">Browser tab icon. Recommended: square image, ICO, PNG or SVG.</p>
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
            <img id="favicon-preview" src="${branding.favicon || '/favicon.svg'}" alt="Favicon" style="width: 32px; height: 32px; border-radius: var(--radius-sm); border: 1px solid var(--border); object-fit: contain; padding: 2px; background: var(--bg-secondary);" />
            <div style="display: flex; gap: 8px;">
              <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
                <span class="round-icon" style="font-size: 16px;">upload</span>
                Upload Favicon
                <input type="file" id="favicon-upload" accept="image/png,image/svg+xml,image/x-icon,image/webp" style="display: none;" />
              </label>
              ${branding.favicon ? `<button type="button" class="btn btn-danger btn-sm" id="remove-favicon-btn">
                <span class="round-icon" style="font-size: 16px;">delete</span>
                Remove
              </button>` : ''}
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Open Graph</h3>
          <p class="form-hint" style="margin-bottom: 12px;">Controls how your panel appears when shared on social media and messaging apps.</p>
          <div class="form-grid">
            <div class="form-group">
              <label>OG Title</label>
              <input type="text" name="og_title" value="${escapeHtml$1(branding.ogTitle || '')}" placeholder="${escapeHtml$1(config.panel?.name || 'Sodium')}" />
              <small class="form-hint">Defaults to panel name if empty</small>
            </div>
            <div class="form-group">
              <label>OG Description</label>
              <input type="text" name="og_description" value="${escapeHtml$1(branding.ogDescription || '')}" placeholder="Modern game server management panel." />
              <small class="form-hint">Short description for link previews</small>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; margin-top: 12px;">
            <img id="ogImage-preview" src="${branding.ogImage || '/banner.png'}" alt="OG Image" style="width: 120px; height: 63px; border-radius: var(--radius-md); border: 1px solid var(--border); object-fit: cover; background: var(--bg-secondary);" />
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
                <span class="round-icon" style="font-size: 16px;">upload</span>
                Upload OG Image
                <input type="file" id="og-image-upload" accept="image/png,image/jpeg,image/webp" style="display: none;" />
              </label>
              ${branding.ogImage ? `<button type="button" class="btn btn-danger btn-sm" id="remove-ogImage-btn">
                <span class="round-icon" style="font-size: 16px;">delete</span>
                Remove
              </button>` : ''}
              <small class="form-hint">Recommended: 1200×630px</small>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  // Sync color pickers with text inputs
  content.querySelectorAll('input[type="color"][data-sync]').forEach(picker => {
    const textInput = content.querySelector(`input[name="${picker.dataset.sync}"]`);
    if (!textInput) return;
    picker.addEventListener('input', () => { textInput.value = picker.value; });
    textInput.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) picker.value = textInput.value;
    });
  });
  
  // File uploads
  document.getElementById('logo-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await uploadBrandingFile(file, 'logo');
  });
  document.getElementById('favicon-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await uploadBrandingFile(file, 'favicon');
  });
  document.getElementById('og-image-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await uploadBrandingFile(file, 'ogImage');
  });
  
  // Remove buttons
  document.getElementById('remove-logo-btn')?.addEventListener('click', () => removeBrandingFile('logo'));
  document.getElementById('remove-favicon-btn')?.addEventListener('click', () => removeBrandingFile('favicon'));
  document.getElementById('remove-ogImage-btn')?.addEventListener('click', () => removeBrandingFile('ogImage'));
  
  // Save all branding settings
  document.getElementById('branding-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await saveSettings({
      branding: {
        accentColor: form.accent_color.value,
        accentHover: form.accent_hover.value,
        accentMuted: form.accent_muted.value,
        ogTitle: form.og_title.value,
        ogDescription: form.og_description.value
      }
    });
  };
}

async function uploadBrandingFile(file, type) {
  try {
    const res = await api(`/api/admin/branding/upload?type=${type}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file
    });
    const data = await res.json();
    if (data.success) {
      const labels = { logo: 'Logo', favicon: 'Favicon', ogImage: 'OG Image' };
      success(`${labels[type] || type} uploaded`);
      const preview = document.getElementById(`${type}-preview`);
      if (preview) preview.src = data.url + '?t=' + Date.now();
      localStorage.removeItem('branding');
    } else {
      error(data.error || 'Upload failed');
    }
  } catch {
    error('Failed to upload file');
  }
}

async function removeBrandingFile(type) {
  try {
    const res = await api(`/api/admin/branding/${type}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const labels = { logo: 'Logo', favicon: 'Favicon', ogImage: 'OG Image' };
      success(`${labels[type] || type} removed`);
      const preview = document.getElementById(`${type}-preview`);
      if (preview) preview.src = type === 'ogImage' ? '/banner.png' : '/favicon.svg';
      localStorage.removeItem('branding');
    } else {
      error(data.error || 'Failed to remove');
    }
  } catch {
    error('Failed to remove file');
  }
}

// ==================== REGISTRATION SETTINGS ====================

function renderRegistrationSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>Registration Settings</h2>
        <p>Control how new users can register on the panel.</p>
      </div>
      
      <form id="registration-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>User Registration</h3>
          <div class="form-toggles">
            <label class="toggle-item">
              <input type="checkbox" name="registration_enabled" ${config.registration?.enabled ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Allow Registrations</span>
                <span class="toggle-desc">Allow new users to create accounts on the panel</span>
              </span>
            </label>
            <label class="toggle-item ${!mailConfigured ? 'disabled' : ''}">
              <input type="checkbox" name="email_verification" ${config.registration?.emailVerification ? 'checked' : ''} ${!mailConfigured ? 'disabled' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Email Verification</span>
                <span class="toggle-desc">${mailConfigured ? 'Require users to verify their email address' : 'Configure mail settings first'}</span>
              </span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" name="captcha_enabled" id="captcha_enabled" ${config.registration?.captcha ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Captcha Protection</span>
                <span class="toggle-desc">Require captcha verification on registration</span>
              </span>
            </label>
          </div>
        </div>
        
        <div class="detail-card" id="captcha-config-card" style="display: ${config.registration?.captcha ? 'block' : 'none'};">
          <h3>Captcha Configuration</h3>
          <div class="form-group">
            <label>Provider</label>
            <select name="captcha_provider" disabled>
              <option value="turnstile" selected>Cloudflare Turnstile</option>
            </select>
            <small class="form-hint">Captcha provider to use for verification</small>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Site Key</label>
              <input type="text" name="captcha_site_key" value="${escapeHtml$1(config.registration?.captchaSiteKey || '')}" placeholder="0x..." />
              <small class="form-hint">Public site key from Cloudflare Turnstile dashboard</small>
            </div>
            <div class="form-group">
              <label>Secret Key</label>
              <input type="password" name="captcha_secret_key" value="${escapeHtml$1(config.registration?.captchaSecretKey || '')}" placeholder="0x..." />
              <small class="form-hint">Secret key for server-side verification</small>
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Restrictions</h3>
          <div class="form-group">
            <label>Allowed Email Domains</label>
            <input type="text" name="allowed_domains" value="${escapeHtml$1(config.registration?.allowedDomains || '')}" placeholder="example.com, company.org" />
            <small class="form-hint">Comma-separated list. Leave empty to allow all domains.</small>
          </div>
          <div class="form-group">
            <label>Blocked Email Domains</label>
            <input type="text" name="blocked_domains" value="${escapeHtml$1(config.registration?.blockedDomains || '')}" placeholder="tempmail.com, disposable.org" />
            <small class="form-hint">Comma-separated list of domains to block.</small>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  const captchaToggle = document.getElementById('captcha_enabled');
  const captchaCard = document.getElementById('captcha-config-card');
  captchaToggle.addEventListener('change', () => {
    captchaCard.style.display = captchaToggle.checked ? 'block' : 'none';
  });
  
  document.getElementById('registration-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const newConfig = {
      registration: {
        enabled: form.registration_enabled.checked,
        emailVerification: form.email_verification.checked,
        captcha: form.captcha_enabled.checked,
        captchaProvider: form.captcha_provider.value,
        captchaSiteKey: form.captcha_site_key.value,
        captchaSecretKey: form.captcha_secret_key.value,
        allowedDomains: form.allowed_domains.value,
        blockedDomains: form.blocked_domains.value
      }
    };
    
    await saveSettings(newConfig);
  };
}

// ==================== DEFAULTS SETTINGS ====================

function renderDefaultsSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>User Defaults</h2>
        <p>Default resource limits applied to new users when they register.</p>
      </div>
      
      <form id="defaults-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>Resource Limits</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Max Servers</label>
              <input type="number" name="default_servers" value="${config.defaults?.servers || 2}" min="0" />
              <small class="form-hint">Maximum number of servers a user can create</small>
            </div>
            <div class="form-group">
              <label>Max Memory (MB)</label>
              <input type="number" name="default_memory" value="${config.defaults?.memory || 2048}" min="0" step="1" />
              <small class="form-hint">Total memory allocation across new users</small>
            </div>
            <div class="form-group">
              <label>Max Disk (MB)</label>
              <input type="number" name="default_disk" value="${config.defaults?.disk || 10240}" min="0" step="1" />
              <small class="form-hint">Total disk space across new users</small>
            </div>
            <div class="form-group">
              <label>Max CPU (%)</label>
              <input type="number" name="default_cpu" value="${config.defaults?.cpu || 200}" min="0" step="1" />
              <small class="form-hint">Total CPU allocation (100% = 1 core)</small>
            </div>
            <div class="form-group">
              <label>Max Allocations (Ports)</label>
              <input type="number" name="default_allocations" value="${config.defaults?.allocations || 5}" min="0" step="1" />
              <small class="form-hint">Total Ports across new users</small>
            </div>
            <div class="form-group">
              <label>Max Backups</label>
              <input type="number" name="default_backups" value="${config.defaults?.backups || 3}" min="0" />
              <small class="form-hint">Maximum number of backups per user</small>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('defaults-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const newConfig = {
      defaults: {
        servers: parseInt(form.default_servers.value) || 2,
        memory: parseInt(form.default_memory.value) || 2048,
        disk: parseInt(form.default_disk.value) || 10240,
        cpu: parseInt(form.default_cpu.value) || 200,
        allocatipns: parseInt(form.default_allocations.value) || 5,
        backups: parseInt(form.default_backups.value) || 3
      }
    };
    
    await saveSettings(newConfig);
  };
}

// ==================== SECURITY SETTINGS ====================

function renderSecuritySettings(content, config) {
  const ipBlocklist = (config.security?.ipBlocklist || []).join('\n');
  const adminIpAllowlist = (config.security?.adminIpAllowlist || []).join('\n');
  
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>Security Settings</h2>
        <p>Configure IP restrictions and access controls.</p>
      </div>
      
      <form id="security-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>IP Blocklist</h3>
          <p class="form-hint" style="margin-bottom: 0.75rem;">Block specific IPs or CIDR ranges from accessing the panel entirely. One per line.</p>
          <div class="form-group">
            <textarea name="ip_blocklist" rows="5" placeholder="192.168.1.100&#10;10.0.0.0/8&#10;203.0.113.*">${escapeHtml$1(ipBlocklist)}</textarea>
            <small class="form-hint">Supports exact IPs, CIDR notation (10.0.0.0/8), and wildcards (192.168.1.*)</small>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Admin IP Allowlist</h3>
          <p class="form-hint" style="margin-bottom: 0.75rem;">Restrict admin panel access to specific IPs. Leave empty to allow all. One per line.</p>
          <div class="form-group">
            <textarea name="admin_ip_allowlist" rows="5" placeholder="Leave empty to allow all IPs&#10;192.168.1.0/24&#10;10.0.0.1">${escapeHtml$1(adminIpAllowlist)}</textarea>
            <small class="form-hint">When set, only these IPs can access /admin routes. Be careful not to lock yourself out!</small>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('security-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const parseList = (str) => str.split('\n').map(s => s.trim()).filter(Boolean);
    
    const newConfig = {
      security: {
        ipBlocklist: parseList(form.ip_blocklist.value),
        adminIpAllowlist: parseList(form.admin_ip_allowlist.value)
      }
    };
    
    await saveSettings(newConfig);
  };
}

// ==================== OAUTH SETTINGS ====================

function renderOAuthSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-header-row">
          <div>
            <h2>OAuth Providers</h2>
            <p>Configure third-party authentication providers.</p>
          </div>
          <button class="btn btn-primary" id="add-oauth-provider-btn">
            <span class="round-icon">add</span>
            Add Provider
          </button>
        </div>
      </div>
      
      <div class="oauth-providers-grid" id="oauth-providers-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  
  loadOAuthProviders();
  setupOAuthHandlers();
}

const providerIcons = {
  discord: 'chat',
  google: 'mail',
  github: 'code',
  gitlab: 'source',
  microsoft: 'window',
  twitter: 'tag',
  facebook: 'people',
  apple: 'phone_iphone',
  twitch: 'videogame_asset',
  slack: 'forum',
  linkedin: 'work',
  spotify: 'music_note',
  reddit: 'forum',
  bitbucket: 'code',
  custom: 'key'
};

const providerColors = {
  discord: '#5865F2',
  google: '#4285F4',
  github: '#24292e',
  gitlab: '#FC6D26',
  microsoft: '#00a4ef',
  twitter: '#000',
  facebook: '#1877f2',
  apple: '#000',
  twitch: '#9146ff',
  slack: '#4a154b',
  linkedin: '#0a66c2',
  spotify: '#1db954',
  reddit: '#ff4500',
  bitbucket: '#0052cc',
  custom: '#6366f1'
};

async function loadOAuthProviders() {
  const list = document.getElementById('oauth-providers-list');
  if (!list) return;
  
  try {
    const res = await api('/api/admin/oauth/providers');
    const data = await res.json();
    const providers = data.providers || [];
    
    if (providers.length === 0) {
      list.innerHTML = `
        <div class="empty-state-card">
          <span class="round-icon">login</span>
          <h3>No OAuth Providers</h3>
          <p>Add a provider to allow users to sign in with their existing accounts.</p>
          <button class="btn btn-primary" onclick="document.getElementById('add-oauth-provider-btn').click()">
            <span class="round-icon">add</span>
            Add Your First Provider
          </button>
        </div>
      `;
      return;
    }
    
    list.innerHTML = providers.map(p => `
      <div class="oauth-provider-card" data-id="${p.id}">
        <div class="oauth-provider-card-header" style="border-left-color: ${providerColors[p.type] || '#6366f1'}">
          <div class="oauth-provider-icon" style="background: ${providerColors[p.type] || '#6366f1'}">
            <span class="round-icon">${providerIcons[p.type] || 'key'}</span>
          </div>
          <div class="oauth-provider-info">
            <span class="oauth-provider-name">${escapeHtml$1(p.name)}</span>
            <span class="oauth-provider-type">${p.type.charAt(0).toUpperCase() + p.type.slice(1)}</span>
          </div>
          <span class="status-badge ${p.enabled ? 'active' : 'inactive'}">${p.enabled ? 'Active' : 'Disabled'}</span>
        </div>
        <div class="oauth-provider-card-footer">
          <span class="oauth-provider-meta">
            <span class="round-icon">key</span>
            ${p.client_id ? 'Configured' : 'Not configured'}
          </span>
          <div class="oauth-provider-actions">
            <button class="btn btn-sm btn-ghost edit-oauth-btn" data-id="${p.id}">
              <span class="round-icon">edit</span>
              Edit
            </button>
            <button class="btn btn-sm btn-ghost btn-danger delete-oauth-btn" data-id="${p.id}">
              <span class="round-icon">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    list.querySelectorAll('.edit-oauth-btn').forEach(btn => {
      btn.onclick = () => showOAuthModal(btn.dataset.id);
    });
    
    list.querySelectorAll('.delete-oauth-btn').forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await confirm({ title: 'Delete OAuth Provider', message: 'Delete this OAuth provider?', danger: true });
        if (!confirmed) return;
        try {
          await api(`/api/admin/oauth/providers/${btn.dataset.id}`, { method: 'DELETE' });
          success('Provider deleted');
          loadOAuthProviders();
        } catch (e) {
          error('Failed to delete provider');
        }
      };
    });
  } catch (e) {
    list.innerHTML = `<div class="error">Failed to load providers</div>`;
  }
}

function setupOAuthHandlers() {
  const addBtn = document.getElementById('add-oauth-provider-btn');
  if (addBtn) {
    addBtn.onclick = () => showOAuthModal(null);
  }
}

function showOAuthModal(editId) {
  const isEdit = !!editId;
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'oauth-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit OAuth Provider' : 'Add OAuth Provider'}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="oauth-form" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Provider Name</label>
            <input type="text" name="name" required placeholder="My Discord Login" />
          </div>
          <div class="form-group">
            <label>Provider Type</label>
            <select name="type" required>
              <option value="discord">Discord</option>
              <option value="google">Google</option>
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="microsoft">Microsoft</option>
              <option value="twitter">Twitter / X</option>
              <option value="facebook">Facebook</option>
              <option value="apple">Apple</option>
              <option value="twitch">Twitch</option>
              <option value="slack">Slack</option>
              <option value="linkedin">LinkedIn</option>
              <option value="spotify">Spotify</option>
              <option value="reddit">Reddit</option>
              <option value="bitbucket">Bitbucket</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label>Client ID</label>
            <input type="text" name="client_id" required placeholder="Your OAuth Client ID" />
          </div>
          <div class="form-group">
            <label>Client Secret</label>
            <input type="password" name="client_secret" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Leave blank to keep current' : 'Your OAuth Client Secret'}" />
          </div>
        </div>
        
        <div id="custom-oauth-fields" style="display: none;">
          <h4>Custom Provider Settings</h4>
          <div class="form-group">
            <label>Authorization URL</label>
            <input type="url" name="authorize_url" placeholder="https://provider.com/oauth/authorize" />
          </div>
          <div class="form-group">
            <label>Token URL</label>
            <input type="url" name="token_url" placeholder="https://provider.com/oauth/token" />
          </div>
          <div class="form-group">
            <label>User Info URL</label>
            <input type="url" name="userinfo_url" placeholder="https://provider.com/api/user" />
          </div>
          <div class="form-group">
            <label>Scopes</label>
            <input type="text" name="scopes" placeholder="openid email profile" />
          </div>
        </div>
        
        <div class="form-toggles">
          <label class="toggle-item">
            <input type="checkbox" name="enabled" checked />
            <span class="toggle-content">
              <span class="toggle-title">Enabled</span>
              <span class="toggle-desc">Allow users to login with this provider</span>
            </span>
          </label>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add Provider'}</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const typeSelect = modal.querySelector('select[name="type"]');
  const customFields = modal.querySelector('#custom-oauth-fields');
  
  typeSelect.onchange = () => {
    customFields.style.display = typeSelect.value === 'custom' ? 'block' : 'none';
  };
  
  modal.querySelector('#oauth-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    const providerData = {
      name: form.get('name'),
      type: form.get('type'),
      client_id: form.get('client_id'),
      enabled: form.get('enabled') === 'on'
    };
    
    if (form.get('client_secret')) {
      providerData.client_secret = form.get('client_secret');
    }
    
    if (form.get('type') === 'custom') {
      providerData.authorize_url = form.get('authorize_url');
      providerData.token_url = form.get('token_url');
      providerData.userinfo_url = form.get('userinfo_url');
      providerData.scopes = form.get('scopes');
    }
    
    try {
      if (isEdit) {
        await api(`/api/admin/oauth/providers/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ provider: providerData })
        });
        success('Provider updated');
      } else {
        await api('/api/admin/oauth/providers', {
          method: 'POST',
          body: JSON.stringify({ provider: providerData })
        });
        success('Provider added');
      }
      modal.remove();
      loadOAuthProviders();
    } catch (e) {
      error('Failed to save provider');
    }
  };
}

// ==================== API KEYS SETTINGS ====================

let appPermissions = [];

function renderApiKeysSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-header-row">
          <div>
            <h2>Application API Keys</h2>
            <p>Create API keys for automation, integrations, and external applications.</p>
          </div>
          <button class="btn btn-primary" id="create-app-key-btn">
            <span class="round-icon">add</span>
            Create Key
          </button>
        </div>
      </div>
      
      <div class="api-keys-list" id="app-api-keys-list">
        <div class="loading-spinner"></div>
      </div>
    </div>
    
    <div class="modal" id="app-api-key-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Application Key</h3>
          <button class="modal-close" id="close-app-key-modal">
            <span class="round-icon">close</span>
          </button>
        </div>
        <form id="app-api-key-form">
          <div class="form-group">
            <label for="app-key-name">Key Name</label>
            <input type="text" id="app-key-name" required maxlength="50" placeholder="CI/CD Integration">
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <div class="permissions-grid" id="app-permissions-grid"></div>
          </div>
          <div class="message" id="app-key-message"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-app-key-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Key</button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="modal" id="app-key-created-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Application Key Created</h3>
          <button class="modal-close" id="close-app-key-created-modal">
            <span class="round-icon">close</span>
          </button>
        </div>
        <div class="api-key-created-content">
          <div class="warning-box">
            <span class="round-icon">warning</span>
            <p>Make sure to copy your API key now. You won't be able to see it again!</p>
          </div>
          <div class="api-key-display">
            <code id="created-app-key-token"></code>
            <button type="button" class="btn btn-icon" id="copy-app-key-btn">
              <span class="round-icon">content_copy</span>
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" id="done-app-key-btn">Done</button>
        </div>
      </div>
    </div>
  `;
  
  loadAppApiKeys();
  setupAppApiKeysHandlers();
}

async function loadAppApiKeys() {
  const list = document.getElementById('app-api-keys-list');
  if (!list) return;
  
  try {
    const [keysRes, permsRes] = await Promise.all([
      api('/api/api-keys/application'),
      api('/api/api-keys/permissions')
    ]);
    
    const keysData = await keysRes.json();
    const permsData = await permsRes.json();
    
    appPermissions = permsData.application || [];
    
    if (!keysData.keys || keysData.keys.length === 0) {
      list.innerHTML = `
        <div class="empty-state-card">
          <span class="round-icon">vpn_key</span>
          <h3>No API Keys</h3>
          <p>Create an API key to integrate external applications with the panel.</p>
          <button class="btn btn-primary" onclick="document.getElementById('create-app-key-btn').click()">
            <span class="round-icon">add</span>
            Create Your First Key
          </button>
        </div>
      `;
      return;
    }
    
    list.innerHTML = keysData.keys.map(key => `
      <div class="api-key-card" data-id="${key.id}">
        <div class="api-key-card-main">
          <div class="api-key-icon">
            <span class="round-icon">vpn_key</span>
          </div>
          <div class="api-key-info">
            <span class="api-key-name">${escapeHtml$1(key.name)}</span>
            <span class="api-key-meta">
              Created by ${escapeHtml$1(key.createdBy)} on ${new Date(key.createdAt).toLocaleDateString()}
              ${key.lastUsedAt ? ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ' • Never used'}
            </span>
          </div>
        </div>
        <div class="api-key-permissions">
          ${key.permissions.slice(0, 3).map(p => `<span class="permission-tag">${escapeHtml$1(p)}</span>`).join('')}
          ${key.permissions.length > 3 ? `<span class="permission-tag">+${key.permissions.length - 3}</span>` : ''}
        </div>
        <button class="btn btn-icon btn-danger delete-app-key-btn" data-id="${key.id}">
          <span class="round-icon">delete</span>
        </button>
      </div>
    `).join('');
    
    list.querySelectorAll('.delete-app-key-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const confirmed = await confirm({ title: 'Delete API Key', message: 'Are you sure you want to delete this application key?', danger: true });
        if (!confirmed) return;
        
        try {
          await api(`/api/api-keys/application/${id}`, { method: 'DELETE' });
          success('API key deleted');
          loadAppApiKeys();
        } catch (err) {
          error('Failed to delete key');
        }
      };
    });
  } catch (err) {
    console.error('Failed to load API keys:', err);
    list.innerHTML = `<div class="error">Failed to load API keys</div>`;
  }
}

function setupAppApiKeysHandlers() {
  const createBtn = document.getElementById('create-app-key-btn');
  const modal = document.getElementById('app-api-key-modal');
  const createdModal = document.getElementById('app-key-created-modal');
  const form = document.getElementById('app-api-key-form');
  const permissionsGrid = document.getElementById('app-permissions-grid');
  
  if (!createBtn || !modal) return;
  
  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
    document.getElementById('app-key-message').textContent = '';
  };
  
  const closeCreatedModal = () => {
    createdModal.classList.remove('active');
    loadAppApiKeys();
  };
  
  createBtn.onclick = () => {
    permissionsGrid.innerHTML = appPermissions.map(p => `
      <label class="permission-checkbox">
        <input type="checkbox" name="permissions" value="${p}">
        <span>${p}</span>
      </label>
    `).join('');
    modal.classList.add('active');
  };
  
  modal.querySelector('#close-app-key-modal').onclick = closeModal;
  modal.querySelector('#cancel-app-key-modal').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  
  createdModal.querySelector('#close-app-key-created-modal').onclick = closeCreatedModal;
  createdModal.querySelector('#done-app-key-btn').onclick = closeCreatedModal;
  createdModal.querySelector('.modal-backdrop').onclick = closeCreatedModal;
  
  createdModal.querySelector('#copy-app-key-btn').onclick = () => {
    const token = document.getElementById('created-app-key-token').textContent;
    navigator.clipboard.writeText(token);
    success('Copied to clipboard');
  };
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('app-key-name').value.trim();
    const checkboxes = form.querySelectorAll('input[name="permissions"]:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);
    const messageEl = document.getElementById('app-key-message');
    const btn = form.querySelector('button[type="submit"]');
    
    if (permissions.length === 0) {
      messageEl.textContent = 'Select at least one permission';
      messageEl.className = 'message error';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await api('/api/api-keys/application', {
        method: 'POST',
        body: JSON.stringify({ name, permissions })
      });
      
      const data = await res.json();
      
      if (data.error) {
        messageEl.textContent = data.error;
        messageEl.className = 'message error';
      } else {
        closeModal();
        document.getElementById('created-app-key-token').textContent = data.token;
        createdModal.classList.add('active');
      }
    } catch (err) {
      messageEl.textContent = 'Failed to create key';
      messageEl.className = 'message error';
    }
    
    btn.disabled = false;
    btn.innerHTML = 'Create Key';
  };
}

// ==================== MAIL SETTINGS ====================

function renderMailSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>Mail Settings</h2>
        <p>Configure email delivery for notifications and password resets.</p>
      </div>
      
      <form id="mail-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>SMTP Configuration</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>SMTP Host</label>
              <input type="text" name="smtp_host" value="${escapeHtml$1(config.mail?.host || '')}" placeholder="smtp.example.com" />
            </div>
            <div class="form-group">
              <label>SMTP Port</label>
              <input type="number" name="smtp_port" value="${config.mail?.port || 587}" placeholder="587" />
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" name="smtp_user" value="${escapeHtml$1(config.mail?.user || '')}" placeholder="user@example.com" />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" name="smtp_pass" placeholder="Leave blank to keep current" />
            </div>
          </div>
          <div class="form-toggles" style="margin-top: 1rem;">
            <label class="toggle-item">
              <input type="checkbox" name="smtp_secure" ${config.mail?.secure ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Use TLS/SSL</span>
                <span class="toggle-desc">Enable secure connection</span>
              </span>
            </label>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Sender Information</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>From Name</label>
              <input type="text" name="mail_from_name" value="${escapeHtml$1(config.mail?.fromName || 'Sodium Panel')}" />
            </div>
            <div class="form-group">
              <label>From Email</label>
              <input type="email" name="mail_from_email" value="${escapeHtml$1(config.mail?.fromEmail || '')}" placeholder="noreply@example.com" />
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="test-mail-btn">
            <span class="round-icon">send</span>
            Send Test Email
          </button>
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('mail-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const newConfig = {
      mail: {
        host: form.smtp_host.value,
        port: parseInt(form.smtp_port.value) || 587,
        user: form.smtp_user.value,
        secure: form.smtp_secure.checked,
        fromName: form.mail_from_name.value,
        fromEmail: form.mail_from_email.value
      }
    };
    
    if (form.smtp_pass.value) {
      newConfig.mail.pass = form.smtp_pass.value;
    }
    
    await saveSettings(newConfig);
  };
  
  document.getElementById('test-mail-btn').onclick = async () => {
    const email = await prompt('Enter email address to send test to:', { title: 'Test Email', placeholder: 'user@example.com' });
    if (!email) return;
    
    const btn = document.getElementById('test-mail-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span> Sending...';
    
    try {
      const res = await api('/api/admin/mail/test', { 
        method: 'POST',
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        success('Test email sent successfully');
      } else {
        error(data.error || 'Failed to send test email');
      }
    } catch (e) {
      error('Failed to send test email');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<span class="round-icon">send</span> Send Test Email';
  };
}

// ==================== MAINTENANCE SETTINGS ====================

function renderMaintenanceSettings(content, config) {
  const allowedIps = (config.maintenance?.allowedIps || []).join('\n');
  
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>Maintenance Mode</h2>
        <p>Enable maintenance mode to temporarily restrict access to the panel.</p>
      </div>
      
      <form id="maintenance-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>Status</h3>
          <div class="form-toggles">
            <label class="toggle-item">
              <input type="checkbox" name="maintenance_enabled" ${config.maintenance?.enabled ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Enable Maintenance Mode</span>
                <span class="toggle-desc">When enabled, non-admin users will see a maintenance page and API requests will return 503</span>
              </span>
            </label>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Maintenance Message</h3>
          <div class="form-group">
            <textarea name="maintenance_message" rows="3" placeholder="The panel is currently under maintenance. Please try again later.">${escapeHtml$1(config.maintenance?.message || '')}</textarea>
            <small class="form-hint">Custom message shown to users during maintenance</small>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Allowed IPs</h3>
          <p class="form-hint" style="margin-bottom: 0.75rem;">These IPs can bypass maintenance mode. Admins always bypass. One per line.</p>
          <div class="form-group">
            <textarea name="maintenance_ips" rows="5" placeholder="192.168.1.100&#10;10.0.0.0/8">${escapeHtml$1(allowedIps)}</textarea>
            <small class="form-hint">Supports exact IPs, CIDR notation, and wildcards</small>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('maintenance-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const parseList = (str) => str.split('\n').map(s => s.trim()).filter(Boolean);
    
    const newConfig = {
      maintenance: {
        enabled: form.maintenance_enabled.checked,
        message: form.maintenance_message.value,
        allowedIps: parseList(form.maintenance_ips.value)
      }
    };
    
    await saveSettings(newConfig);
  };
}

// ==================== ADVANCED SETTINGS ====================

function renderAdvancedSettings(content, config) {
  content.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h2>Advanced Settings</h2>
        <p>Advanced configuration options. Be careful when modifying these settings.</p>
      </div>
      
      <form id="advanced-settings-form" class="settings-form">
        <div class="detail-card">
          <h3>Performance</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Console History Lines</label>
              <input type="number" name="console_lines" value="${config.advanced?.consoleLines || 1000}" min="100" max="10000" />
              <small class="form-hint">Number of console lines to keep in memory</small>
            </div>
            <div class="form-group">
              <label>File Manager Max Size (MB)</label>
              <input type="number" name="max_upload_size" value="${config.advanced?.maxUploadSize || 100}" min="1" />
              <small class="form-hint">Maximum file upload size</small>
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Two-Factor Authentication</h3>
          <div class="form-toggles">
            <label class="toggle-item ${!mailConfigured ? 'disabled' : ''}">
              <input type="checkbox" name="require_2fa" ${config.security?.require2fa ? 'checked' : ''} ${!mailConfigured ? 'disabled' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Require 2FA for All Users</span>
                <span class="toggle-desc">${mailConfigured ? 'Force all users to verify with email code on login' : 'Configure mail settings first'}</span>
              </span>
            </label>
            <label class="toggle-item ${!mailConfigured ? 'disabled' : ''}">
              <input type="checkbox" name="require_2fa_admin" ${config.security?.require2faAdmin ? 'checked' : ''} ${!mailConfigured ? 'disabled' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Require 2FA for Admins Only</span>
                <span class="toggle-desc">${mailConfigured ? 'Force only administrators to verify with email code' : 'Configure mail settings first'}</span>
              </span>
            </label>
          </div>
          ${mailConfigured ? '<small class="form-hint" style="margin-top: 0.75rem; display: block;">Users must have a verified email to use 2FA.</small>' : ''}
        </div>
        
        <div class="detail-card">
          <h3>Logging</h3>
          <div class="form-toggles">
            <label class="toggle-item">
              <input type="checkbox" name="audit_logging" ${config.advanced?.auditLogging !== false ? 'checked' : ''} />
              <span class="toggle-content">
                <span class="toggle-title">Audit Logging</span>
                <span class="toggle-desc">Log all administrative actions</span>
              </span>
            </label>
          </div>
        </div>
        
        <div class="detail-card danger-card">
          <h3>Danger Zone</h3>
          <div class="danger-actions">
            <div class="danger-action">
              <div class="danger-info">
                <span class="danger-title">Clear All Cache</span>
                <span class="danger-desc">Clear all cached data including sessions</span>
              </div>
              <button type="button" class="btn btn-danger btn-sm" id="clear-cache-btn">Clear Cache</button>
            </div>
            <div class="danger-action">
              <div class="danger-info">
                <span class="danger-title">Rebuild Database Indexes</span>
                <span class="danger-desc">Rebuild search indexes for better performance</span>
              </div>
              <button type="button" class="btn btn-danger btn-sm" id="rebuild-indexes-btn">Rebuild</button>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="round-icon">save</span>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('advanced-settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const newConfig = {
      advanced: {
        consoleLines: parseInt(form.console_lines.value) || 1000,
        maxUploadSize: parseInt(form.max_upload_size.value) || 100,
        auditLogging: form.audit_logging.checked
      },
      security: {
        require2fa: form.require_2fa.checked,
        require2faAdmin: form.require_2fa_admin.checked
      }
    };
    
    await saveSettings(newConfig);
  };
  
  document.getElementById('clear-cache-btn').onclick = async () => {
    const confirmed = await confirm({ title: 'Clear Cache', message: 'Clear all cache? Users may need to log in again.', danger: true });
    if (!confirmed) return;
    info('Clearing cache...');
    try {
      await api('/api/admin/cache/clear', { method: 'POST' });
      success('Cache cleared');
    } catch (e) {
      error('Failed to clear cache');
    }
  };
  
  document.getElementById('rebuild-indexes-btn').onclick = async () => {
    const confirmed = await confirm({ title: 'Rebuild Indexes', message: 'Rebuild database indexes? This may take a moment?' });
    if (!confirmed) return;
    info('Rebuilding indexes...');
    try {
      await api('/api/admin/database/rebuild', { method: 'POST' });
      success('Indexes rebuilt');
    } catch (e) {
      error('Failed to rebuild indexes');
    }
  };
}

// ==================== HELPERS ====================

async function saveSettings(newConfig) {
  try {
    const res = await api('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig })
    });
    
    if (res.ok) {
      success('Settings saved');
    } else {
      error('Failed to save settings');
    }
  } catch (e) {
    error('Failed to save settings');
  }
}

const navigateTo$6 = (...args) => window.adminNavigate(...args);

async function renderAnnouncementsList(container, username, loadView) {
  try {
    const res = await api('/api/announcements');
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      container.innerHTML = `<div class="error">${escapeHtml$1(errData.error || 'Failed to load announcements')}</div>`;
      return;
    }
    
    const data = await res.json();
    const announcements = data.announcements || [];
    
    const tableRows = announcements.map(a => {
      const content = a.content || '';
      const title = a.title || 'Untitled';
      const type = a.type || 'info';
      const createdAt = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '--';
      return `
        <tr>
          <td>
            <div class="cell-main">${escapeHtml$1(title)}</div>
            <div class="cell-sub">${escapeHtml$1(content.substring(0, 50))}${content.length > 50 ? '...' : ''}</div>
          </td>
          <td><span class="type-badge type-${type}">${type}</span></td>
          <td><span class="status-badge ${a.active ? 'active' : 'inactive'}">${a.active ? 'Active' : 'Inactive'}</span></td>
          <td>${createdAt}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-xs btn-ghost" onclick="editAnnouncement('${a.id}')">Edit</button>
              <button class="btn btn-xs btn-danger-ghost" onclick="deleteAnnouncement('${a.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Announcements' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-announcement-btn">
            <span class="round-icon">add</span>
            Create Announcement
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${announcements.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">campaign</span>
            <p>No announcements yet</p>
          </div>
        ` : `
          <div class="list-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          
          <div class="list-cards">
            ${announcements.map(a => {
              const content = a.content || '';
              const title = a.title || 'Untitled';
              const type = a.type || 'info';
              return `
              <div class="list-card">
                <div class="list-card-header">
                  <div class="list-card-title">${escapeHtml$1(title)}</div>
                  <span class="type-badge type-${type}">${type}</span>
                </div>
                <div class="list-card-body">
                  <p>${escapeHtml$1(content.substring(0, 100))}${content.length > 100 ? '...' : ''}</p>
                </div>
                <div class="list-card-footer">
                  <span class="status-badge ${a.active ? 'active' : 'inactive'}">${a.active ? 'Active' : 'Inactive'}</span>
                  <div class="action-buttons">
                    <button class="btn btn-xs btn-ghost" onclick="editAnnouncement('${a.id}')">Edit</button>
                    <button class="btn btn-xs btn-danger-ghost" onclick="deleteAnnouncement('${a.id}')">Delete</button>
                  </div>
                </div>
              </div>
            `}).join('')}
          </div>
        `}
      </div>
      
      <div class="modal" id="announcement-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="announcement-modal-title">Create Announcement</h3>
            <button class="modal-close" onclick="closeAnnouncementModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Title</label>
              <input type="text" id="announcement-title" class="form-control" placeholder="Announcement title">
            </div>
            <div class="form-group">
              <label>Content</label>
              <textarea id="announcement-content" class="form-control" rows="4" placeholder="Announcement content"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Type</label>
                <select id="announcement-type" class="form-control">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="announcement-active" class="form-control">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Expires At (optional)</label>
              <input type="datetime-local" id="announcement-expires" class="form-control">
            </div>
            <div class="message" id="announcement-message"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeAnnouncementModal()">Cancel</button>
            <button class="btn btn-primary" id="save-announcement-btn">Save</button>
          </div>
        </div>
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$6);
    
    let editingId = null;
    
    document.getElementById('create-announcement-btn').onclick = () => {
      editingId = null;
      document.getElementById('announcement-modal-title').textContent = 'Create Announcement';
      document.getElementById('announcement-title').value = '';
      document.getElementById('announcement-content').value = '';
      document.getElementById('announcement-type').value = 'info';
      document.getElementById('announcement-active').value = 'true';
      document.getElementById('announcement-expires').value = '';
      document.getElementById('announcement-modal').classList.add('active');
    };
    
    window.closeAnnouncementModal = () => {
      document.getElementById('announcement-modal').classList.remove('active');
    };
    
    window.editAnnouncement = (id) => {
      const announcement = announcements.find(a => a.id === id);
      if (!announcement) return;
      
      editingId = id;
      document.getElementById('announcement-modal-title').textContent = 'Edit Announcement';
      document.getElementById('announcement-title').value = announcement.title;
      document.getElementById('announcement-content').value = announcement.content;
      document.getElementById('announcement-type').value = announcement.type;
      document.getElementById('announcement-active').value = String(announcement.active);
      document.getElementById('announcement-expires').value = announcement.expiresAt ? announcement.expiresAt.slice(0, 16) : '';
      document.getElementById('announcement-modal').classList.add('active');
    };
    
    window.deleteAnnouncement = async (id) => {
      const confirmed = await confirm({ title: 'Delete Announcement', message: 'Are you sure you want to delete this announcement?', danger: true });
      if (!confirmed) return;
      
      try {
        await api(`/api/announcements/${id}`, { method: 'DELETE' });
        // We assume loadView refreshes or adminNavigate does
        if (typeof loadView === 'function') loadView();
        else if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
        success('Announcement deleted');
      } catch (e) {
        error('Failed to delete announcement');
      }
    };
    
    document.getElementById('save-announcement-btn').onclick = async () => {
      const title = document.getElementById('announcement-title').value.trim();
      const content = document.getElementById('announcement-content').value.trim();
      const type = document.getElementById('announcement-type').value;
      const active = document.getElementById('announcement-active').value === 'true';
      const expiresAt = document.getElementById('announcement-expires').value || null;
      const messageEl = document.getElementById('announcement-message');
      
      if (!title || !content) {
        messageEl.textContent = 'Title and content are required';
        messageEl.className = 'message error';
        return;
      }
      
      try {
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
        
        const res = await api(url, {
          method,
          body: JSON.stringify({ title, content, type, active, expiresAt })
        });
        
        const result = await res.json();
        
        if (result.error) {
          messageEl.textContent = result.error;
          messageEl.className = 'message error';
        } else {
          closeAnnouncementModal();
          if (typeof loadView === 'function') loadView();
          else if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
          success(editingId ? 'Announcement updated' : 'Announcement created');
        }
      } catch (e) {
        messageEl.textContent = 'Failed to save announcement';
        messageEl.className = 'message error';
      }
    };
    
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load announcements</div>';
  }
}

const navigateTo$5 = (...args) => window.adminNavigate(...args);

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

function getAuditIcon(action) {
  const icons = {
    'user:create': 'person_add',
    'user:update': 'edit',
    'user:delete': 'person_remove',
    'server:create': 'add_circle',
    'server:update': 'edit',
    'server:delete': 'delete',
    'server:suspend': 'block',
    'server:unsuspend': 'check_circle',
    'node:create': 'dns',
    'node:update': 'edit',
    'node:delete': 'delete',
    'egg:create': 'egg',
    'egg:update': 'edit',
    'egg:delete': 'delete',
    'settings:update': 'settings',
    'announcement:create': 'campaign',
    'announcement:update': 'edit',
    'announcement:delete': 'delete'
  };
  return icons[action] || 'info';
}

function formatAuditAction(action) {
  const labels = {
    'user:create': 'created user',
    'user:update': 'updated user',
    'user:delete': 'deleted user',
    'server:create': 'created server',
    'server:update': 'updated server',
    'server:delete': 'deleted server',
    'server:suspend': 'suspended server',
    'server:unsuspend': 'unsuspended server',
    'node:create': 'created node',
    'node:update': 'updated node',
    'node:delete': 'deleted node',
    'egg:create': 'created egg',
    'egg:update': 'updated egg',
    'egg:delete': 'deleted egg',
    'settings:update': 'updated settings',
    'announcement:create': 'created announcement',
    'announcement:update': 'updated announcement',
    'announcement:delete': 'deleted announcement'
  };
  return labels[action] || action;
}

async function renderAuditLogPage(container, username) {
  try {
    const res = await api('/api/admin/audit-logs?per_page=50');
    const data = await res.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Audit Log' }])}
      </div>
      
      <div class="admin-list">
        ${data.logs.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">history</span>
            <h3>No Audit Logs</h3>
            <p>Admin actions will be logged here</p>
          </div>
        ` : `
          <div class="audit-log-list">
            ${data.logs.map(log => `
              <div class="audit-log-item">
                <div class="audit-log-icon">
                  <span class="round-icon">${getAuditIcon(log.action)}</span>
                </div>
                <div class="audit-log-content">
                  <div class="audit-log-action">
                    <strong>${escapeHtml$1(log.adminUsername)}</strong>
                    <span>${formatAuditAction(log.action)}</span>
                    <span class="audit-target">${escapeHtml$1(log.targetType)}${log.details?.title ? `: ${escapeHtml$1(log.details.title)}` : ''}</span>
                  </div>
                  <div class="audit-log-meta">
                    ${log.ip ? `<span class="ip">${escapeHtml$1(log.ip)}</span>` : ''}
                    <span class="time">${formatTimeAgo(log.createdAt)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${data.meta.total_pages > 1 ? `
            <div class="pagination-info">
              Showing ${data.logs.length} of ${data.meta.total} entries
            </div>
          ` : ''}
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$5);
    
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load audit log</div>';
  }
}

function getActivityIcon(action) {
  const icons = {
    'auth:login': 'login',
    'auth:logout': 'logout',
    'auth:password_change': 'lock',
    'user:profile_update': 'person',
    'api_key:create': 'key',
    'api_key:delete': 'key_off',
    'server:create': 'add_circle',
    'server:delete': 'delete',
    'server:start': 'play_arrow',
    'server:stop': 'stop',
    'server:restart': 'restart_alt',
    'server:console_command': 'terminal',
    'file:edit': 'edit',
    'file:delete': 'delete',
    'file:upload': 'upload',
    'subuser:add': 'person_add',
    'subuser:remove': 'person_remove'
  };
  return icons[action] || 'info';
}

function formatActivityAction(action) {
  const labels = {
    'auth:login': 'logged in',
    'auth:logout': 'logged out',
    'auth:password_change': 'changed password',
    'user:profile_update': 'updated profile',
    'api_key:create': 'created API key',
    'api_key:delete': 'deleted API key',
    'server:create': 'created server',
    'server:delete': 'deleted server',
    'server:start': 'started server',
    'server:stop': 'stopped server',
    'server:restart': 'restarted server',
    'server:console_command': 'sent console command',
    'file:edit': 'edited file',
    'file:delete': 'deleted file',
    'file:upload': 'uploaded file',
    'subuser:add': 'added subuser',
    'subuser:remove': 'removed subuser'
  };
  return labels[action] || action;
}

async function renderActivityLogPage(container, username) {
  try {
    const res = await api('/api/activity?per_page=50');
    const data = await res.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Activity Log' }])}
      </div>
      
      <div class="admin-list">
        ${data.logs.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">timeline</span>
            <h3>No Activity</h3>
            <p>User activity will be logged here</p>
          </div>
        ` : `
          <div class="activity-log-list">
            ${data.logs.map(log => `
              <div class="activity-log-item">
                <div class="activity-log-icon">
                  <span class="round-icon">${getActivityIcon(log.action)}</span>
                </div>
                <div class="activity-log-content">
                  <div class="activity-log-action">
                    <strong>${escapeHtml$1(log.username || 'Unknown')}</strong>
                    <span>${formatActivityAction(log.action)}</span>
                  </div>
                  <div class="activity-log-meta">
                    ${log.ip ? `<span class="ip">${escapeHtml$1(log.ip)}</span>` : ''}
                    <span class="time">${formatTimeAgo(log.createdAt)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${data.meta.total_pages > 1 ? `
            <div class="pagination-info">
              Showing ${data.logs.length} of ${data.meta.total} entries
            </div>
          ` : ''}
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$5);
    
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load activity log</div>';
  }
}

const navigateTo$4 = (...args) => window.adminNavigate(...args);

const WEBHOOK_TYPES = [
  { id: 'discord', label: 'Discord', icon: 'smart_toy' },
  { id: 'slack', label: 'Slack', icon: 'tag' },
  { id: 'generic', label: 'Generic', icon: 'webhook' }
];

const EVENT_CATEGORIES = {
  'Server Events': [
    { id: 'server.created', label: 'Server Created' },
    { id: 'server.deleted', label: 'Server Deleted' },
    { id: 'server.started', label: 'Server Started' },
    { id: 'server.stopped', label: 'Server Stopped' },
    { id: 'server.crashed', label: 'Server Crashed' },
    { id: 'server.suspended', label: 'Server Suspended' },
    { id: 'server.unsuspended', label: 'Server Unsuspended' }
  ],
  'User Events': [
    { id: 'user.created', label: 'User Created' },
    { id: 'user.deleted', label: 'User Deleted' },
    { id: 'user.login', label: 'User Login' }
  ],
  'Admin Events': [
    { id: 'node.created', label: 'Node Created' },
    { id: 'node.deleted', label: 'Node Deleted' },
    { id: 'announcement.created', label: 'Announcement Created' }
  ]
};

async function renderWebhooksList(container, username, loadView) {
  try {
    const res = await api('/api/webhooks/admin/all');
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      container.innerHTML = `<div class="error">${escapeHtml$1(errData.error || 'Failed to load webhooks')}</div>`;
      return;
    }
    
    const data = await res.json();
    const webhooks = data.webhooks || [];
    
    const globalWebhooks = webhooks.filter(w => w.global || !w.user_id);
    const userWebhooks = webhooks.filter(w => w.user_id && !w.global);
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Webhooks' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-webhook-btn">
            <span class="round-icon">add</span>
            Create Global Webhook
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        <div class="webhooks-section">
          <h3 class="section-title">
            <span class="round-icon">public</span>
            Global Webhooks
          </h3>
          ${globalWebhooks.length === 0 ? `
            <div class="empty-state small">
              <span class="round-icon">webhook</span>
              <p>No global webhooks configured</p>
            </div>
          ` : `
            <div class="webhook-cards">
              ${globalWebhooks.map(w => renderWebhookCard(w, true)).join('')}
            </div>
          `}
        </div>
        
        <div class="webhooks-section">
          <h3 class="section-title">
            <span class="round-icon">person</span>
            User Webhooks
          </h3>
          ${userWebhooks.length === 0 ? `
            <div class="empty-state small">
              <span class="round-icon">webhook</span>
              <p>No user webhooks</p>
            </div>
          ` : `
            <div class="webhook-cards">
              ${userWebhooks.map(w => renderWebhookCard(w, false)).join('')}
            </div>
          `}
        </div>
      </div>
      
      ${renderWebhookModal()}
    `;
    
    setupBreadcrumbListeners(navigateTo$4);
    setupWebhookListeners(webhooks, loadView);
    
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load webhooks</div>';
  }
}

function renderWebhookCard(webhook, isGlobal) {
  const typeInfo = WEBHOOK_TYPES.find(t => t.id === webhook.type) || WEBHOOK_TYPES[2];
  const eventsDisplay = webhook.events.includes('*') 
    ? 'All Events' 
    : `${webhook.events.length} event${webhook.events.length !== 1 ? 's' : ''}`;
  
  return `
    <div class="webhook-card ${!webhook.enabled ? 'disabled' : ''}">
      <div class="webhook-card-header">
        <div class="webhook-info">
          <span class="webhook-type-icon round-icon">${typeInfo.icon}</span>
          <div class="webhook-details">
            <span class="webhook-name">${escapeHtml$1(webhook.name)}</span>
            <span class="webhook-url">${escapeHtml$1(webhook.url)}</span>
          </div>
        </div>
        <div class="webhook-status">
          <span class="status-badge ${webhook.enabled ? 'active' : 'inactive'}">
            ${webhook.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
      <div class="webhook-card-body">
        <div class="webhook-meta">
          <span class="meta-item">
            <span class="round-icon">category</span>
            ${typeInfo.label}
          </span>
          <span class="meta-item">
            <span class="round-icon">notifications</span>
            ${eventsDisplay}
          </span>
          ${!isGlobal && webhook.user_id ? `
            <span class="meta-item">
              <span class="round-icon">person</span>
              User: ${escapeHtml$1(webhook.user_id.substring(0, 8))}
            </span>
          ` : ''}
        </div>
      </div>
      <div class="webhook-card-footer">
        <button class="btn btn-xs btn-ghost" onclick="testWebhook('${webhook.id}')">
          <span class="round-icon">send</span>
          Test
        </button>
        ${isGlobal ? `
          <button class="btn btn-xs btn-ghost" onclick="editWebhook('${webhook.id}')">
            <span class="round-icon">edit</span>
            Edit
          </button>
        ` : ''}
        <button class="btn btn-xs btn-danger-ghost" onclick="deleteWebhook('${webhook.id}')">
          <span class="round-icon">delete</span>
          Delete
        </button>
      </div>
    </div>
  `;
}

function renderWebhookModal() {
  return `
    <div class="modal" id="webhook-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3 id="webhook-modal-title">Create Global Webhook</h3>
          <button class="modal-close" onclick="closeWebhookModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="webhook-name" class="form-control" placeholder="My Webhook">
            </div>
            <div class="form-group">
              <label>Type</label>
              <select id="webhook-type" class="form-control">
                ${WEBHOOK_TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Webhook URL</label>
            <input type="url" id="webhook-url" class="form-control" placeholder="https://discord.com/api/webhooks/...">
            <small class="form-hint">For Discord, use the webhook URL from channel settings</small>
          </div>
          
          <div class="form-group">
            <label>Secret (optional)</label>
            <input type="password" id="webhook-secret" class="form-control" placeholder="Leave blank for no secret">
            <small class="form-hint">Sent as X-Webhook-Secret header (not used for Discord/Slack)</small>
          </div>
          
          <div class="form-group">
            <label>Events</label>
            <div class="events-selector">
              <label class="toggle-item all-events">
                <input type="checkbox" id="webhook-all-events">
                <span class="toggle-content">
                  <span class="toggle-title">All Events</span>
                  <span class="toggle-desc">Subscribe to all current and future events</span>
                </span>
              </label>
              
              <div class="events-grid" id="events-grid">
                ${Object.entries(EVENT_CATEGORIES).map(([category, events]) => `
                  <div class="event-category">
                    <h4>${category}</h4>
                    ${events.map(e => `
                      <label class="event-checkbox">
                        <input type="checkbox" name="webhook-event" value="${e.id}">
                        <span>${e.label}</span>
                      </label>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="toggle-item">
              <input type="checkbox" id="webhook-enabled" checked>
              <span class="toggle-content">
                <span class="toggle-title">Enabled</span>
                <span class="toggle-desc">Webhook will receive events when enabled</span>
              </span>
            </label>
          </div>
          
          <div class="message" id="webhook-message"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeWebhookModal()">Cancel</button>
          <button class="btn btn-primary" id="save-webhook-btn">Save Webhook</button>
        </div>
      </div>
    </div>
  `;
}

function setupWebhookListeners(webhooks, loadView) {
  let editingId = null;
  
  document.getElementById('create-webhook-btn').onclick = () => {
    editingId = null;
    document.getElementById('webhook-modal-title').textContent = 'Create Global Webhook';
    document.getElementById('webhook-name').value = '';
    document.getElementById('webhook-type').value = 'discord';
    document.getElementById('webhook-url').value = '';
    document.getElementById('webhook-secret').value = '';
    document.getElementById('webhook-enabled').checked = true;
    document.getElementById('webhook-all-events').checked = false;
    document.querySelectorAll('input[name="webhook-event"]').forEach(cb => cb.checked = false);
    document.getElementById('events-grid').classList.remove('disabled');
    document.getElementById('webhook-modal').classList.add('active');
  };
  
  document.getElementById('webhook-all-events').onchange = (e) => {
    const eventsGrid = document.getElementById('events-grid');
    if (e.target.checked) {
      eventsGrid.classList.add('disabled');
      document.querySelectorAll('input[name="webhook-event"]').forEach(cb => cb.checked = false);
    } else {
      eventsGrid.classList.remove('disabled');
    }
  };
  
  window.closeWebhookModal = () => {
    document.getElementById('webhook-modal').classList.remove('active');
  };
  
  window.editWebhook = (id) => {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    
    editingId = id;
    document.getElementById('webhook-modal-title').textContent = 'Edit Webhook';
    document.getElementById('webhook-name').value = webhook.name;
    document.getElementById('webhook-type').value = webhook.type;
    document.getElementById('webhook-url').value = '';
    document.getElementById('webhook-secret').value = '';
    document.getElementById('webhook-enabled').checked = webhook.enabled;
    
    const allEvents = webhook.events.includes('*');
    document.getElementById('webhook-all-events').checked = allEvents;
    document.getElementById('events-grid').classList.toggle('disabled', allEvents);
    
    document.querySelectorAll('input[name="webhook-event"]').forEach(cb => {
      cb.checked = webhook.events.includes(cb.value);
    });
    
    document.getElementById('webhook-modal').classList.add('active');
  };
  
  window.deleteWebhook = async (id) => {
    const confirmed = await confirm({ title: 'Delete Webhook', message: 'Are you sure you want to delete this webhook?', danger: true });
    if (!confirmed) return;
    
    try {
      const res = await api(`/api/webhooks/admin/${id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Webhook deleted');
        if (typeof loadView === 'function') loadView();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to delete webhook');
      }
    } catch (e) {
      error('Failed to delete webhook');
    }
  };
  
  window.testWebhook = async (id) => {
    info('Sending test webhook...');
    try {
      const res = await api(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Test webhook sent');
      } else {
        error(data.error || 'Test failed');
      }
    } catch (e) {
      error('Failed to send test webhook');
    }
  };
  
  document.getElementById('save-webhook-btn').onclick = async () => {
    const name = document.getElementById('webhook-name').value.trim();
    const type = document.getElementById('webhook-type').value;
    const url = document.getElementById('webhook-url').value.trim();
    const secret = document.getElementById('webhook-secret').value;
    const enabled = document.getElementById('webhook-enabled').checked;
    const allEvents = document.getElementById('webhook-all-events').checked;
    const messageEl = document.getElementById('webhook-message');
    
    const selectedEvents = allEvents 
      ? ['*'] 
      : Array.from(document.querySelectorAll('input[name="webhook-event"]:checked')).map(cb => cb.value);
    
    if (!name) {
      messageEl.textContent = 'Name is required';
      messageEl.className = 'message error';
      return;
    }
    
    if (!editingId && !url) {
      messageEl.textContent = 'URL is required';
      messageEl.className = 'message error';
      return;
    }
    
    if (selectedEvents.length === 0) {
      messageEl.textContent = 'Select at least one event';
      messageEl.className = 'message error';
      return;
    }
    
    try {
      const body = { name, type, events: selectedEvents, enabled };
      if (url) body.url = url;
      if (secret) body.secret = secret;
      
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `/api/webhooks/${editingId}` : '/api/webhooks/admin';
      
      const res = await api(endpoint, {
        method,
        body: JSON.stringify(body)
      });
      
      const result = await res.json();
      
      if (result.error) {
        messageEl.textContent = result.error;
        messageEl.className = 'message error';
      } else {
        closeWebhookModal();
        if (typeof loadView === 'function') loadView();
        success(editingId ? 'Webhook updated' : 'Webhook created');
      }
    } catch (e) {
      messageEl.textContent = 'Failed to save webhook';
      messageEl.className = 'message error';
    }
  };
}

async function renderPluginsList(container) {
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await api('/api/admin/plugins');
    const data = await res.json();
    const plugins = data.plugins || [];

    container.innerHTML = `
      <div class="admin-section">
        <div class="section-header">
          ${renderBreadcrumb([{ label: "Plugins" }])}
        </div>
      </div>
      <div class="admin-list">
        ${plugins.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">extension_off</span>
            <p>No plugins installed</p>
            <small>Place plugin folders in <code>data/plugins/</code> and restart the panel</small>
          </div>
        ` : `
          <div class="list-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${plugins.map(p => `
                  <tr>
                    <td>
                      <div class="plugin-name">
                        <strong>${escapeHtml$1(p.name)}</strong>
                        <small>${escapeHtml$1(p.description || '')}</small>
                      </div>
                    </td>
                    <td><span class="badge badge-${p.type}">${escapeHtml$1(p.type)}</span></td>
                    <td>${escapeHtml$1(p.version)}</td>
                    <td>${escapeHtml$1(p.author || 'Unknown')}</td>
                    <td>
                      <span class="status-badge ${p.active ? 'online' : 'offline'}">
                        ${p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}" onclick="togglePlugin('${escapeHtml$1(p.id)}', ${p.active})">
                        <span class="round-icon">${p.active ? 'stop' : 'play_arrow'}</span>
                        ${p.active ? 'Disable' : 'Enable'}
                      </button>
                      ${Object.keys(p.settings || {}).length > 0 ? `
                        <button class="btn btn-sm btn-secondary" onclick="configurePlugin('${escapeHtml$1(p.id)}')">
                          <span class="round-icon">settings</span>
                          Configure
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    window.togglePlugin = async (id, isActive) => {
      try {
        const action = isActive ? 'deactivate' : 'activate';
        const res = await api(`/api/admin/plugins/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        const data = await res.json();
        if (data.error) {
          error(data.error);
        } else {
          success(`Plugin ${isActive ? 'disabled' : 'enabled'}`);
          renderPluginsList(container);
        }
      } catch (e) {
        error('Failed to toggle plugin');
      }
    };

    window.configurePlugin = async (id) => {
      try {
        const res = await api(`/api/admin/plugins/${encodeURIComponent(id)}/settings`);
        const data = await res.json();
        if (data.error) return error(data.error);

        const schema = data.schema || {};
        const values = data.values || {};

        const fields = Object.entries(schema).map(([key, field]) => {
          const val = values[key] !== undefined ? values[key] : (field.default || '');
          if (field.type === 'boolean') {
            return `<div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" name="${escapeHtml$1(key)}" ${val ? 'checked' : ''}>
                <span>${escapeHtml$1(field.label || key)}</span>
              </label>
            </div>`;
          }
          if (field.type === 'select') {
            return `<div class="form-group">
              <label>${escapeHtml$1(field.label || key)}</label>
              <select name="${escapeHtml$1(key)}" class="form-control">
                ${(field.options || []).map(o => `<option value="${escapeHtml$1(o)}" ${o === val ? 'selected' : ''}>${escapeHtml$1(o)}</option>`).join('')}
              </select>
            </div>`;
          }
          return `<div class="form-group">
            <label>${escapeHtml$1(field.label || key)}</label>
            <input type="${field.secret ? 'password' : 'text'}" name="${escapeHtml$1(key)}" value="${escapeHtml$1(String(val))}" class="form-control" placeholder="${escapeHtml$1(field.label || key)}">
          </div>`;
        }).join('');

        const { closeModal } = show({
          title: 'Plugin Settings',
          content: `<form id="plugin-settings-form">${fields}</form>`,
          buttons: [
            { label: 'Cancel', action: 'close' },
            { label: 'Save', className: 'btn-primary', action: 'save' }
          ],
          onAction: async (action, el, close) => {
            if (action !== 'save') return close();
            const form = el.querySelector('#plugin-settings-form');
            const newValues = {};
            for (const [key, field] of Object.entries(schema)) {
              const input = form.querySelector(`[name="${key}"]`);
              if (!input) continue;
              if (field.type === 'boolean') {
                newValues[key] = input.checked;
              } else {
                newValues[key] = input.value;
              }
            }
            try {
              await api(`/api/admin/plugins/${encodeURIComponent(id)}/settings`, {
                method: 'PUT',
                body: JSON.stringify({ values: newValues })
              });
              success('Settings saved');
              close();
            } catch {
              error('Failed to save settings');
            }
          }
        });
      } catch (e) {
        error('Failed to load plugin settings');
      }
    };
  } catch (e) {
    container.innerHTML = '<div class="error-state">Failed to load plugins</div>';
  }
}

const navigateTo$3 = (...args) => window.adminNavigate(...args);

const AVAILABLE_PERMISSIONS = [
  { id: 'server.create', label: 'Create Servers' },
  { id: 'server.delete', label: 'Delete Servers' },
  { id: 'server.update', label: 'Update Servers' },
  { id: 'server.console', label: 'Access Console' },
  { id: 'server.files', label: 'File Manager' },
  { id: 'server.backup', label: 'Manage Backups' },
  { id: 'schedule.create', label: 'Create Schedules' },
  { id: 'schedule.update', label: 'Update Schedules' },
  { id: 'schedule.delete', label: 'Delete Schedules' },
  { id: '*', label: 'All Permissions (Wildcard)' }
];

async function renderGroupsList(container, username, loadView) {
  try {
    const res = await api('/api/admin/groups');
    const data = await res.json();
    const groups = data.groups || [];
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Groups' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-group-btn">
            <span class="round-icon">add</span>
            Create Group
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${groups.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">group</span>
            <h3>No Groups</h3>
            <p>Create user groups to manage permissions and resource limits</p>
          </div>
        ` : `
          <div class="list-grid">
            ${groups.map(group => `
              <div class="list-card" data-id="${group.id}">
                <div class="list-card-header">
                  <div class="list-card-icon">
                    <span class="round-icon">group</span>
                  </div>
                  <div class="list-card-title">
                    <h3>${escapeHtml$1(group.name)}</h3>
                    <span class="list-card-subtitle">${escapeHtml$1(group.description || 'No description')}</span>
                  </div>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Members</span>
                    <span class="stat-value">${(group.members || []).length}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Permissions</span>
                    <span class="stat-value">${(group.permissions || []).length}</span>
                  </div>
                </div>
                <div class="list-card-footer">
                  <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); adminNavigate('groups', '${group.id}')">
                    <span class="round-icon">settings</span>
                    Manage
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo$3);
    
    document.getElementById('create-group-btn').onclick = () => showCreateGroupModal(loadView);
    
    document.querySelectorAll('.list-card[data-id]').forEach(card => {
      card.onclick = () => navigateTo$3('groups', card.dataset.id);
    });
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load groups</div>`;
  }
}

function showCreateGroupModal(loadView) {
  const existing = document.getElementById('create-group-modal');
  if (existing) existing.remove();
  
  const m = document.createElement('div');
  m.id = 'create-group-modal';
  m.className = 'modal-overlay';
  m.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Create Group</h3>
        <button class="modal-close" id="close-group-modal">
          <span class="round-icon">close</span>
        </button>
      </div>
      <form id="create-group-form" class="modal-body">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" name="name" required placeholder="e.g. Moderators" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" name="description" placeholder="Group description" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="cancel-group-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Group</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(m);
  
  document.getElementById('close-group-modal').onclick = () => m.remove();
  document.getElementById('cancel-group-modal').onclick = () => m.remove();
  m.onclick = (e) => { if (e.target === m) m.remove(); };
  
  document.getElementById('create-group-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="round-icon spinning">sync</span>';
    
    try {
      const res = await api('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: {
            name: form.name.value,
            description: form.description.value || undefined
          }
        })
      });
      const data = await res.json();
      
      if (data.success || data.group) {
        success('Group created');
        m.remove();
        loadView();
      } else {
        error(data.error || 'Failed to create group');
        btn.disabled = false;
        btn.textContent = 'Create Group';
      }
    } catch (err) {
      error('Failed to create group');
      btn.disabled = false;
      btn.textContent = 'Create Group';
    }
  };
}

async function renderGroupDetail(container, username, groupId) {
  try {
    const [groupsRes, usersRes] = await Promise.all([
      api('/api/admin/groups'),
      api('/api/admin/users?per_page=1000')
    ]);
    const groupsData = await groupsRes.json();
    const usersData = await usersRes.json();
    const groups = groupsData.groups || [];
    const users = usersData.users || [];
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      container.innerHTML = `<div class="error">Group not found</div>`;
      return;
    }
    
    const memberUsers = users.filter(u => (group.members || []).includes(u.id));
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Groups', onClick: 'list-groups' },
          { label: group.name }
        ])}
        <div class="admin-header-actions">
          <button class="btn btn-danger" id="delete-group-btn">
            <span class="round-icon">delete</span>
            Delete
          </button>
        </div>
      </div>
      
      <div class="detail-tabs">
        <button class="detail-tab ${state.currentView.subTab === 'settings' ? 'active' : ''}" data-subtab="settings">Settings</button>
        <button class="detail-tab ${state.currentView.subTab === 'members' ? 'active' : ''}" data-subtab="members">Members (${memberUsers.length})</button>
      </div>
      
      <div class="detail-content" id="group-detail-content"></div>
    `;
    
    setupBreadcrumbListeners(navigateTo$3);
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.onclick = () => {
        state.currentView.subTab = tab.dataset.subtab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderGroupSubTab(group, users, memberUsers);
      };
    });
    
    document.getElementById('delete-group-btn').onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Group', message: `Are you sure you want to delete "${group.name}"? This cannot be undone.`, danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/groups/${groupId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        success('Group deleted');
        navigateTo$3('groups');
      } catch (e) {
        error('Failed to delete group');
      }
    };
    
    renderGroupSubTab(group, users, memberUsers);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load group</div>`;
  }
}

function renderGroupSubTab(group, users, memberUsers) {
  const content = document.getElementById('group-detail-content');
  
  switch (state.currentView.subTab) {
    case 'settings':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Group Settings</h3>
          <form id="group-settings-form" class="settings-form">
            <div class="form-section">
              <h4>General</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" name="name" value="${escapeHtml$1(group.name)}" required />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input type="text" name="description" value="${escapeHtml$1(group.description || '')}" />
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Permissions</h4>
              <div class="form-toggles">
                ${AVAILABLE_PERMISSIONS.map(perm => `
                  <label class="toggle-item">
                    <input type="checkbox" name="perm" value="${perm.id}" ${(group.permissions || []).includes(perm.id) ? 'checked' : ''} />
                    <span class="toggle-content">
                      <span class="toggle-title">${perm.label}</span>
                      <span class="toggle-desc">${perm.id}</span>
                    </span>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="form-section">
              <h4>Resource Limits</h4>
              <p class="form-hint">Leave empty or 0 to use user defaults.</p>
              <div class="form-grid">
                <div class="form-group">
                  <label>Max Servers</label>
                  <input type="number" name="limit_servers" value="${group.limits?.servers ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max Memory (MB)</label>
                  <input type="number" name="limit_memory" value="${group.limits?.memory ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max Disk (MB)</label>
                  <input type="number" name="limit_disk" value="${group.limits?.disk ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max CPU (%)</label>
                  <input type="number" name="limit_cpu" value="${group.limits?.cpu ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max Backups</label>
                  <input type="number" name="limit_backups" value="${group.limits?.backups ?? ''}" min="0" />
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('group-settings-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        
        const permissions = Array.from(
          e.target.querySelectorAll('input[name="perm"]:checked')
        ).map(cb => cb.value);
        
        const groupData = {
          name: form.get('name'),
          description: form.get('description'),
          permissions,
          limits: {
            servers: parseInt(form.get('limit_servers')) || null,
            memory: parseInt(form.get('limit_memory')) || null,
            disk: parseInt(form.get('limit_disk')) || null,
            cpu: parseInt(form.get('limit_cpu')) || null,
            backups: parseInt(form.get('limit_backups')) || null
          }
        };
        
        try {
          await api(`/api/admin/groups/${group.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group: groupData })
          });
          success('Group updated successfully');
          navigateTo$3('groups', group.id, 'settings');
        } catch (e) {
          error('Failed to update group');
        }
      };
      break;
      
    case 'members':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Members</h3>
            <button class="btn btn-primary btn-sm" id="add-member-btn">
              <span class="round-icon">person_add</span>
              Add Member
            </button>
          </div>
          ${memberUsers.length === 0 ? `
            <div class="empty-state small">
              <span class="round-icon">people</span>
              <p>No members in this group</p>
            </div>
          ` : `
            <div class="user-servers-list" style="margin-top: 1rem;">
              ${memberUsers.map(u => `
                <div class="user-server-item">
                  <div class="user-server-info">
                    <div class="user-avatar">${(u.username || 'U')[0].toUpperCase()}</div>
                    <div class="user-server-details">
                      <span class="user-server-name">${escapeHtml$1(u.displayName || u.username)}</span>
                      <span class="user-server-meta">@${escapeHtml$1(u.username)}${u.email ? ' • ' + escapeHtml$1(u.email) : ''}</span>
                    </div>
                  </div>
                  <div class="user-server-actions">
                    <button class="btn btn-sm btn-danger-ghost remove-member-btn" data-user-id="${u.id}">
                      <span class="round-icon">close</span>
                      Remove
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
      
      document.getElementById('add-member-btn').onclick = async () => {
        const nonMembers = users.filter(u => !(group.members || []).includes(u.id));
        if (nonMembers.length === 0) {
          info('All users are already members');
          return;
        }
        const username = await prompt('Enter username to add:', { title: 'Add Member' });
        if (!username) return;
        const user = nonMembers.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
          error('User not found or already a member');
          return;
        }
        try {
          await api(`/api/admin/groups/${group.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
          });
          success(`Added ${user.username}`);
          navigateTo$3('groups', group.id, 'members');
        } catch {
          error('Failed to add member');
        }
      };
      
      document.querySelectorAll('.remove-member-btn').forEach(btn => {
        btn.onclick = async () => {
          const confirmed = await confirm({ title: 'Remove Member', message: 'Remove this user from the group?', danger: true });
          if (!confirmed) return;
          try {
            await api(`/api/admin/groups/${group.id}/members/${btn.dataset.userId}`, { method: 'DELETE' });
            success('Member removed');
            navigateTo$3('groups', group.id, 'members');
          } catch {
            error('Failed to remove member');
          }
        };
      });
      break;
  }
}

const navigateTo$2 = (...args) => window.adminNavigate(...args);

const STATUS_LABELS = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved'
};

const IMPACT_LABELS = {
  none: 'None',
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical'
};

const IMPACT_COLORS = {
  none: 'var(--text-tertiary)',
  minor: 'var(--warning, #f59e0b)',
  major: '#f97316',
  critical: 'var(--danger)'
};

const STATUS_COLORS = {
  investigating: 'var(--warning, #f59e0b)',
  identified: '#f97316',
  monitoring: 'var(--info, #3b82f6)',
  resolved: 'var(--success)'
};

async function renderIncidentsList(container, username, loadView) {
  try {
    const [incRes, nodesRes] = await Promise.all([
      api('/api/admin/incidents'),
      api('/api/admin/nodes')
    ]);
    const incData = await incRes.json();
    const nodesData = await nodesRes.json();
    const incidents = incData.incidents || [];
    const nodes = nodesData.nodes || [];

    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Incidents' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-incident-btn">
            <span class="round-icon">add</span>
            Create Incident
          </button>
        </div>
      </div>

      <div class="admin-list">
        ${incidents.length === 0 ? `
          <div class="empty-state">
            <span class="round-icon">check_circle</span>
            <h3>No Incidents</h3>
            <p>No incidents have been reported. That's a good thing!</p>
          </div>
        ` : `
          <div class="list-grid">
            ${incidents.map(inc => `
              <div class="list-card" data-id="${inc.id}" style="cursor:pointer;">
                <div class="list-card-header">
                  <div class="list-card-icon">
                    <span class="round-icon" style="color: ${IMPACT_COLORS[inc.impact] || 'inherit'}">
                      ${inc.status === 'resolved' ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                  <div class="list-card-title">
                    <h3>${escapeHtml$1(inc.title)}</h3>
                    <span class="list-card-subtitle">${new Date(inc.created_at).toLocaleString()}${inc.created_by ? ' by ' + escapeHtml$1(inc.created_by) : ''}</span>
                  </div>
                  <span class="sp-status-tag" style="background: ${STATUS_COLORS[inc.status]}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                    ${STATUS_LABELS[inc.status] || inc.status}
                  </span>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Impact</span>
                    <span class="stat-value" style="color: ${IMPACT_COLORS[inc.impact]}">${IMPACT_LABELS[inc.impact] || inc.impact}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Updates</span>
                    <span class="stat-value">${(inc.updates || []).length}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Nodes</span>
                    <span class="stat-value">${(inc.affected_nodes || []).length || '—'}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    setupBreadcrumbListeners(navigateTo$2);

    document.getElementById('create-incident-btn').onclick = () => showCreateModal(nodes, loadView);

    container.querySelectorAll('.list-card[data-id]').forEach(card => {
      card.onclick = () => navigateTo$2('incidents', card.dataset.id);
    });

  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load incidents</div>`;
  }
}

async function showCreateModal(nodes, loadView) {
  const nodesHtml = nodes.map(n => `<option value="${n.id}">${escapeHtml$1(n.name)}</option>`).join('');

  const title = await prompt('Incident title:', { title: 'Create Incident', placeholder: 'e.g. Node outage in EU region' });
  if (!title) return;

  try {
    const res = await api('/api/admin/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident: {
          title,
          status: 'investigating',
          impact: 'minor'
        }
      })
    });
    const data = await res.json();
    if (data.success && data.incident) {
      success('Incident created');
      navigateTo$2('incidents', data.incident.id);
    } else {
      error(data.error || 'Failed to create incident');
    }
  } catch {
    error('Failed to create incident');
  }
}

async function renderIncidentDetail(container, username, incidentId) {
  try {
    const [incRes, nodesRes] = await Promise.all([
      api('/api/admin/incidents'),
      api('/api/admin/nodes')
    ]);
    const incData = await incRes.json();
    const nodesData = await nodesRes.json();
    const incident = (incData.incidents || []).find(i => i.id === incidentId);
    const nodes = nodesData.nodes || [];

    if (!incident) {
      container.innerHTML = `<div class="error">Incident not found</div>`;
      return;
    }

    const updates = (incident.updates || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const affectedNodeNames = (incident.affected_nodes || [])
      .map(id => nodes.find(n => n.id === id)?.name || id.slice(0, 8))
      .join(', ');

    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Incidents', onClick: 'list-incidents' },
          { label: incident.title }
        ])}
        <div class="admin-header-actions">
          <button class="btn btn-danger" id="delete-incident-btn">
            <span class="round-icon">delete</span>
            Delete
          </button>
        </div>
      </div>

      <div class="detail-grid" style="gap: 1.5rem;">
        <div class="detail-card detail-card-wide">
          <h3>Incident Details</h3>
          <form id="incident-edit-form" class="settings-form" style="margin-top: 1rem;">
            <div class="form-grid">
              <div class="form-group">
                <label>Title</label>
                <input type="text" name="title" value="${escapeHtml$1(incident.title)}" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <input type="text" name="description" value="${escapeHtml$1(incident.description || '')}" />
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  ${Object.entries(STATUS_LABELS).map(([v, l]) =>
                    `<option value="${v}" ${incident.status === v ? 'selected' : ''}>${l}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Impact</label>
                <select name="impact">
                  ${Object.entries(IMPACT_LABELS).map(([v, l]) =>
                    `<option value="${v}" ${incident.impact === v ? 'selected' : ''}>${l}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Affected Nodes</label>
              <div class="form-toggles">
                ${nodes.map(n => `
                  <label class="toggle-item">
                    <input type="checkbox" name="node_${n.id}" value="${n.id}" ${(incident.affected_nodes || []).includes(n.id) ? 'checked' : ''} />
                    <span class="toggle-content">
                      <span class="toggle-title">${escapeHtml$1(n.name)}</span>
                    </span>
                  </label>
                `).join('')}
                ${nodes.length === 0 ? '<p class="form-hint">No nodes configured</p>' : ''}
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                <span class="round-icon">save</span>
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div class="detail-card detail-card-wide">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Updates Timeline</h3>
            <button class="btn btn-sm btn-primary" id="add-update-btn">
              <span class="round-icon">add</span>
              Add Update
            </button>
          </div>

          <div id="updates-timeline" style="margin-top: 1rem;">
            ${updates.length === 0 ? '<p class="form-hint">No updates yet</p>' : updates.map(u => `
              <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="background: ${STATUS_COLORS[u.status]}; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
                    ${STATUS_LABELS[u.status] || u.status}
                  </span>
                  <span style="font-size: 12px; color: var(--text-tertiary);">
                    ${new Date(u.created_at).toLocaleString()}${u.created_by ? ' — ' + escapeHtml$1(u.created_by) : ''}
                  </span>
                </div>
                <p style="margin: 0; font-size: 13px; color: var(--text-primary);">${escapeHtml$1(u.message)}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="detail-card">
          <h3>Info</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">${new Date(incident.created_at).toLocaleString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created By</span>
              <span class="info-value">${escapeHtml$1(incident.created_by || '—')}</span>
            </div>
            ${incident.resolved_at ? `
            <div class="info-item">
              <span class="info-label">Resolved</span>
              <span class="info-value">${new Date(incident.resolved_at).toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="info-item">
              <span class="info-label">Affected Nodes</span>
              <span class="info-value">${affectedNodeNames || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    setupBreadcrumbListeners(navigateTo$2);

    document.getElementById('delete-incident-btn').onclick = async () => {
      const confirmed = await confirm({ title: 'Delete Incident', message: 'Delete this incident? This cannot be undone.', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/incidents/${incidentId}`, { method: 'DELETE' });
        success('Incident deleted');
        navigateTo$2('incidents');
      } catch {
        error('Failed to delete');
      }
    };

    document.getElementById('incident-edit-form').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const affected = nodes.filter(n => form.querySelector(`[name="node_${n.id}"]`)?.checked).map(n => n.id);

      try {
        await api(`/api/admin/incidents/${incidentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incident: {
              title: form.title.value,
              description: form.description.value,
              status: form.status.value,
              impact: form.impact.value,
              affected_nodes: affected
            }
          })
        });
        success('Incident updated');
        navigateTo$2('incidents', incidentId);
      } catch {
        error('Failed to update');
      }
    };

    document.getElementById('add-update-btn').onclick = async () => {
      const message = await prompt('Update message:', { title: 'Add Incident Update', placeholder: 'Describe the current situation...' });
      if (!message) return;

      try {
        await api(`/api/admin/incidents/${incidentId}/updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, status: incident.status })
        });
        success('Update added');
        navigateTo$2('incidents', incidentId);
      } catch {
        error('Failed to add update');
      }
    };

  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load incident</div>`;
  }
}

const navigateTo$1 = (...args) => window.adminNavigate(...args);

async function renderOverview(container, username, loadView) {
  try {
    const displayName = state.user?.displayName || state.username;
    
    container.innerHTML = `
      <div class="dashboard-container">
        <header class="dashboard-header">
          <div class="greeting">
            <div class="greeting-icon">
              <span class="round-icon">manage_accounts</span>
            </div>
            <div class="greeting-text">
              <h1>Welcome, <span class="highlight">${escapeHtml$1(username)}!</span></h1>
              <p>Welcome to the admin panel.</p>
            </div>
          </div>
        </header>
        
        <div class="dashboard-grid">
          <div class="dashboard-section">
            <a class="overview-item" href="https://sodiumpanel.github.io/panel/viewer.html">
              <span class="round-icon">article</span>
              <div class="info">
                <div class="title">Documentation</div>
                <div class="description">You can view the documentation clicking here</div>
              </div>
            </a>
          </div>
          <div class="dashboard-section">
            <a class="overview-item" href="https://github.com/sodiumpanel/panel">
              <span class="round-icon">merge</span>
              <div class="info">
                <div class="title">Github</div>
                <div class="description">Leave us an star on our Github repository</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load overview</div>`;
  }
}

let loadViewGeneration = 0;

function navigateTo(tab, id = null, subTab = null) {
  state.currentView = { 
    type: id ? 'detail' : 'list', 
    tab, 
    id, 
    subTab: subTab || getDefaultSubTab(tab) 
  };
  loadView();
}

function getDefaultSubTab(tab) {
  switch (tab) {
    case 'nodes': return 'about';
    case 'servers': return 'details';
    case 'users': return 'overview';
    case 'eggs': return 'about';
    case 'groups': return 'settings';
    default: return null;
  }
}

window.adminNavigate = navigateTo;

async function renderAdmin(tab = 'nodes', params = {}) {
  const app = document.getElementById('app');
  const user = state$1.user;
  
  app.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    if (!user?.isAdmin) {
      app.innerHTML = `
        <div class="error-page">
          <h1>403</h1>
          <p>Access Denied</p>
          <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
        </div>
      `;
      return;
    }
  } catch (e) {
    app.innerHTML = '<div class="error">Failed to verify permissions</div>';
    return;
  }
  
  state.currentView = {
    type: params.id ? 'detail' : 'list',
    tab,
    id: params.id || null,
    subTab: params.subTab || getDefaultSubTab(tab)
  };
  
  app.innerHTML = `
    <div class="admin-page">
      <div class="admin-content" id="admin-content">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  
  loadView();
}

async function loadView() {
  const parent = document.querySelector('.admin-page');
  if (!parent) return;
  const username = state$1.username;
  const generation = ++loadViewGeneration;
  
  // Replace admin-content element to invalidate any in-flight renders
  const oldContainer = document.getElementById('admin-content');
  if (oldContainer) oldContainer.remove();
  
  const container = document.createElement('div');
  container.id = 'admin-content';
  container.innerHTML = '<div class="loading-spinner"></div>';
  parent.appendChild(container);
  
  if (state.currentView.type === 'detail' && state.currentView.id) {
    switch (state.currentView.tab) {
      case 'nodes':
        await renderNodeDetail(container, username, state.currentView.id);
        break;
      case 'servers':
        await renderServerDetail(container, username, state.currentView.id);
        break;
      case 'users':
        await renderUserDetail(container, username, state.currentView.id);
        break;
      case 'eggs':
        await renderEggDetail(container, username, state.currentView.id);
        break;
      case 'groups':
        await renderGroupDetail(container, username, state.currentView.id);
        break;
      case 'incidents':
        await renderIncidentDetail(container, username, state.currentView.id);
        break;
    }
  } else {
    switch (state.currentView.tab) {
      case 'overview':
        await renderOverview(container, username, loadView);
        break;
      case 'nodes':
        await renderNodesList(container, username, loadView);
        break;
      case 'servers':
        await renderServersList(container, username, loadView);
        break;
      case 'users':
        await renderUsersList(container, username, loadView);
        break;
      case 'nests':
        await renderNestsList(container, username, loadView);
        break;
      case 'locations':
        await renderLocationsList(container, username, loadView);
        break;
      case 'settings':
        await renderSettingsPage(container, username, loadView);
        break;
      case 'announcements':
        await renderAnnouncementsList(container, username, loadView);
        break;
      case 'audit':
        await renderAuditLogPage(container, username);
        break;
      case 'activity':
        await renderActivityLogPage(container, username);
        break;
      case 'webhooks':
        await renderWebhooksList(container, username, loadView);
        break;
      case 'plugins':
        await renderPluginsList(container);
        break;
      case 'groups':
        await renderGroupsList(container, username, loadView);
        break;
      case 'incidents':
        await renderIncidentsList(container, username, loadView);
        break;
      default:
        // Check for plugin admin pages (format: "plugin:pluginId:pageId")
        if (state.currentView.tab.startsWith('plugin:')) {
          const parts = state.currentView.tab.split(':');
          renderPluginAdminPage(parts[1], parts[2], container);
        } else {
          container.innerHTML = `<div class="empty-state"><p>Page not found</p></div>`;
        }
        break;
    }
  }
}

function cleanupAdmin() {
}

const activityLabels = {
  'auth:login': { label: 'Logged in', icon: 'login' },
  'auth:logout': { label: 'Logged out', icon: 'logout' },
  'auth:password_change': { label: 'Changed password', icon: 'lock' },
  'user:profile_update': { label: 'Updated profile', icon: 'person' },
  'api_key:create': { label: 'Created API key', icon: 'key' },
  'api_key:delete': { label: 'Deleted API key', icon: 'key_off' },
  'server:create': { label: 'Created server', icon: 'add_circle' },
  'server:delete': { label: 'Deleted server', icon: 'delete' },
  'server:start': { label: 'Started server', icon: 'play_arrow' },
  'server:stop': { label: 'Stopped server', icon: 'stop' },
  'server:restart': { label: 'Restarted server', icon: 'restart_alt' },
  'server:console_command': { label: 'Sent console command', icon: 'terminal' },
  'file:edit': { label: 'Edited file', icon: 'edit' },
  'file:delete': { label: 'Deleted file', icon: 'delete' },
  'file:upload': { label: 'Uploaded file', icon: 'upload' },
  'subuser:add': { label: 'Added subuser', icon: 'person_add' },
  'subuser:remove': { label: 'Removed subuser', icon: 'person_remove' }
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function getActivityInfo(action) {
  return activityLabels[action] || { label: action, icon: 'info' };
}

async function renderActivityLog() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const res = await api('/api/activity/me?per_page=50');
    const data = await res.json();
    
    app.innerHTML = `
      <div class="activity-page">
        <div class="page-header">
          <h1>Activity Log</h1>
          <p class="page-description">Your recent account activity</p>
        </div>
        
        <div class="activity-list">
          ${data.logs.length === 0 ? `
            <div class="empty-state">
              <span class="round-icon">history</span>
              <p>No activity yet</p>
            </div>
          ` : data.logs.map(log => {
            const info = getActivityInfo(log.action);
            return `
              <div class="activity-item">
                <div class="activity-icon">
                  <span class="round-icon">${info.icon}</span>
                </div>
                <div class="activity-content">
                  <div class="activity-label">${escapeHtml$1(info.label)}</div>
                  ${log.details?.serverName ? `<div class="activity-detail">Server: ${escapeHtml$1(log.details.serverName)}</div>` : ''}
                  ${log.details?.method ? `<div class="activity-detail">Method: ${escapeHtml$1(log.details.method)}</div>` : ''}
                  ${log.ip ? `<div class="activity-detail ip">IP: ${escapeHtml$1(log.ip)}</div>` : ''}
                </div>
                <div class="activity-time">${formatDate(log.createdAt)}</div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${data.meta.total_pages > 1 ? `
          <div class="activity-pagination">
            <span>Showing ${data.logs.length} of ${data.meta.total} activities</span>
          </div>
        ` : ''}
      </div>
    `;
  } catch (e) {
    app.innerHTML = `
      <div class="error-page">
        <h1>Error</h1>
        <p>Failed to load activity log</p>
      </div>
    `;
  }
}

async function renderSetup() {
  const app = document.getElementById('app');
  app.className = 'setup-page';
  
  // Theme handling
  document.documentElement.setAttribute('data-theme', 'dark');
  
  let currentStep = 1;
  const totalSteps = 5;
  
  const config = {
    panel: { name: 'Sodium', url: window.location.origin, port: 3000 },
    database: { type: 'file', host: 'localhost', port: 3306, name: 'sodium', user: 'sodium', password: '' },
    redis: { enabled: false, host: 'localhost', port: 6379, password: '' },
    registration: { enabled: true },
    defaults: { servers: 2, memory: 2048, disk: 10240, cpu: 200, allocations: 5, backups: 3 },
    admin: { username: '', email: '', password: '', confirmPassword: '' }
  };
  
  function render() {
    app.innerHTML = `
      <div class="setup-container">
        <div class="setup-card">
          <div class="setup-header">
            <div class="setup-header-top">
              <div class="setup-logo">
                <img class="brand-icon" src="/favicon.svg" alt="Sodium" width="28" height="28">
                <span>Sodium Setup</span>
              </div>
              <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
                <span class="round-icon">${document.documentElement.getAttribute('data-theme') === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
            </div>
            <div class="setup-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(currentStep / totalSteps) * 100}%"></div>
              </div>
              <span class="progress-text">Step ${currentStep} of ${totalSteps}</span>
            </div>
          </div>
          
          <div class="setup-content" id="setup-content">
            ${renderStep()}
          </div>
          
          <div class="setup-footer">
            ${currentStep > 1 ? `<button class="btn btn-secondary" id="prev-btn">Back</button>` : '<div></div>'}
            ${currentStep < totalSteps 
              ? `<button class="btn btn-primary" id="next-btn">Next</button>`
              : `<button class="btn btn-primary" id="finish-btn">Complete Setup</button>`
            }
          </div>
        </div>
      </div>
    `;
    
    attachListeners();
  }
  
  function renderStep() {
    switch (currentStep) {
      case 1: return renderPanelStep();
      case 2: return renderDatabaseStep();
      case 3: return renderRedisStep();
      case 4: return renderDefaultsStep();
      case 5: return renderAdminStep();
      default: return '';
    }
  }
  
  function renderPanelStep() {
    return `
      <h2>Panel Configuration</h2>
      <p class="text-muted">Configure your Sodium panel settings</p>
      
      <div class="form-group">
        <label class="form-label">Panel Name</label>
        <input type="text" class="form-control" id="panel-name" value="${config.panel.name}" placeholder="Sodium">
        <small class="text-muted">The name displayed in the browser title and header</small>
      </div>
      
      <div class="form-group">
        <label class="form-label">Panel URL</label>
        <input type="text" class="form-control" id="panel-url" value="${config.panel.url}" placeholder="https://panel.example.com">
        <small class="text-muted">The public URL of your panel (used for links and webhooks)</small>
      </div>
      
      <div class="form-group">
        <label class="form-label">Port</label>
        <input type="number" class="form-control" id="panel-port" value="${config.panel.port}" placeholder="3000">
        <small class="text-muted">The port the panel will listen on</small>
      </div>
    `;
  }
  
  function renderDatabaseStep() {
    return `
      <h2>Database Configuration</h2>
      <p class="text-muted">Choose how to store your data</p>
      
      <div class="form-group">
        <label class="form-label">Database Type</label>
        <select class="form-control" id="db-type">
          <option value="file" ${config.database.type === 'file' ? 'selected' : ''}>File (built-in, no setup required)</option>
          <option value="sqlite" ${config.database.type === 'sqlite' ? 'selected' : ''}>SQLite</option>
          <option value="mysql" ${config.database.type === 'mysql' ? 'selected' : ''}>MySQL / MariaDB</option>
          <option value="postgresql" ${config.database.type === 'postgresql' ? 'selected' : ''}>PostgreSQL</option>
        </select>
      </div>
      
      <div id="db-external-config" class="${config.database.type === 'file' || config.database.type === 'sqlite' ? 'hidden' : ''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Host</label>
            <input type="text" class="form-control" id="db-host" value="${config.database.host}">
          </div>
          <div class="form-group">
            <label class="form-label">Port</label>
            <input type="number" class="form-control" id="db-port" value="${config.database.port}">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Database Name</label>
          <input type="text" class="form-control" id="db-name" value="${config.database.name}">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-control" id="db-user" value="${config.database.user}">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" id="db-password" value="${config.database.password}">
          </div>
        </div>
        
        <button class="btn btn-secondary" id="test-db-btn">
          <span class="round-icon">sync</span>
          Test Connection
        </button>
        <span id="db-test-result" class="test-result"></span>
      </div>
    `;
  }
  
  function renderRedisStep() {
    return `
      <h2>Redis Configuration</h2>
      <p class="text-muted">Optional: Enable Redis for better performance at scale</p>
      
      <div class="form-group">
        <label class="toggle-container">
          <input type="checkbox" id="redis-enabled" ${config.redis.enabled ? 'checked' : ''}>
          <span class="toggle-label">Enable Redis</span>
        </label>
        <small class="text-muted">Recommended for large installations with many concurrent users</small>
      </div>
      
      <div id="redis-config" class="${config.redis.enabled ? '' : 'hidden'}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Host</label>
            <input type="text" class="form-control" id="redis-host" value="${config.redis.host}">
          </div>
          <div class="form-group">
            <label class="form-label">Port</label>
            <input type="number" class="form-control" id="redis-port" value="${config.redis.port}">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password (optional)</label>
          <input type="password" class="form-control" id="redis-password" value="${config.redis.password}">
        </div>
        
        <button class="btn btn-secondary" id="test-redis-btn">
          <span class="round-icon">sync</span>
          Test Connection
        </button>
        <span id="redis-test-result" class="test-result"></span>
      </div>
    `;
  }
  
  function renderDefaultsStep() {
    return `
      <h2>Default Limits</h2>
      <p class="text-muted">Set default resource limits for new users</p>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Max Servers</label>
          <input type="number" class="form-control" id="default-servers" value="${config.defaults.servers}">
        </div>
        <div class="form-group">
          <label class="form-label">Max Allocations</label>
          <input type="number" class="form-control" id="default-allocations" value="${config.defaults.allocations}">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Memory (MB)</label>
          <input type="number" class="form-control" id="default-memory" value="${config.defaults.memory}">
        </div>
        <div class="form-group">
          <label class="form-label">Disk (MB)</label>
          <input type="number" class="form-control" id="default-disk" value="${config.defaults.disk}">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">CPU (%)</label>
          <input type="number" class="form-control" id="default-cpu" value="${config.defaults.cpu}">
          <small class="text-muted">100% = 1 CPU core</small>
        </div>
        <div class="form-group">
          <label class="form-label">Max Backups</label>
          <input type="number" class="form-control" id="default-backups" value="${config.defaults.backups}">
          <small class="text-muted">Maximum backups per user</small>
        </div>
      </div>
      
      <div class="form-group">
        <label class="toggle-container">
          <input type="checkbox" id="registration-enabled" ${config.registration.enabled ? 'checked' : ''}>
          <span class="toggle-label">Allow Registration</span>
        </label>
        <small class="text-muted">Allow new users to create accounts</small>
      </div>
    `;
  }
  
  function renderAdminStep() {
    return `
      <h2>Admin Account</h2>
      <p class="text-muted">Create the first administrator account</p>
      
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" class="form-control" id="admin-username" value="${config.admin.username}" placeholder="admin">
      </div>
      
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-control" id="admin-email" value="${config.admin.email}" placeholder="admin@example.com">
      </div>
      
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" class="form-control" id="admin-password" value="${config.admin.password}" placeholder="Minimum 8 characters">
      </div>
      
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <input type="password" class="form-control" id="admin-confirm-password" value="${config.admin.confirmPassword}">
      </div>
    `;
  }
  
  function saveCurrentStep() {
    switch (currentStep) {
      case 1:
        config.panel.name = document.getElementById('panel-name')?.value || 'Sodium';
        config.panel.url = document.getElementById('panel-url')?.value || window.location.origin;
        config.panel.port = parseInt(document.getElementById('panel-port')?.value) || 3000;
        break;
      case 2:
        config.database.type = document.getElementById('db-type')?.value || 'file';
        config.database.host = document.getElementById('db-host')?.value || 'localhost';
        config.database.port = parseInt(document.getElementById('db-port')?.value) || 3306;
        config.database.name = document.getElementById('db-name')?.value || 'sodium';
        config.database.user = document.getElementById('db-user')?.value || 'sodium';
        config.database.password = document.getElementById('db-password')?.value || '';
        break;
      case 3:
        config.redis.enabled = document.getElementById('redis-enabled')?.checked || false;
        config.redis.host = document.getElementById('redis-host')?.value || 'localhost';
        config.redis.port = parseInt(document.getElementById('redis-port')?.value) || 6379;
        config.redis.password = document.getElementById('redis-password')?.value || '';
        break;
      case 4:
        config.defaults.servers = parseInt(document.getElementById('default-servers')?.value) || 2;
        config.defaults.allocations = parseInt(document.getElementById('default-allocations')?.value) || 5;
        config.defaults.memory = parseInt(document.getElementById('default-memory')?.value) || 2048;
        config.defaults.disk = parseInt(document.getElementById('default-disk')?.value) || 10240;
        config.defaults.cpu = parseInt(document.getElementById('default-cpu')?.value) || 200;
        config.defaults.backups = parseInt(document.getElementById('default-backups')?.value) || 3;
        config.registration.enabled = document.getElementById('registration-enabled')?.checked || false;
        break;
      case 5:
        config.admin.username = document.getElementById('admin-username')?.value || '';
        config.admin.email = document.getElementById('admin-email')?.value || '';
        config.admin.password = document.getElementById('admin-password')?.value || '';
        config.admin.confirmPassword = document.getElementById('admin-confirm-password')?.value || '';
        break;
    }
  }
  
  function validateCurrentStep() {
    switch (currentStep) {
      case 1:
        if (!config.panel.name) return 'Panel name is required';
        if (!config.panel.url) return 'Panel URL is required';
        break;
      case 5:
        if (!config.admin.username) return 'Username is required';
        if (!config.admin.email) return 'Email is required';
        if (!config.admin.password) return 'Password is required';
        if (config.admin.password.length < 8) return 'Password must be at least 8 characters';
        if (config.admin.password !== config.admin.confirmPassword) return 'Passwords do not match';
        break;
    }
    return null;
  }
  
  function attachListeners() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      render();
    });
    
    document.getElementById('prev-btn')?.addEventListener('click', () => {
      saveCurrentStep();
      currentStep--;
      render();
    });
    
    document.getElementById('next-btn')?.addEventListener('click', () => {
      saveCurrentStep();
      const error$1 = validateCurrentStep();
      if (error$1) {
        error(error$1);
        return;
      }
      currentStep++;
      render();
    });
    
    document.getElementById('finish-btn')?.addEventListener('click', async () => {
      saveCurrentStep();
      const error$1 = validateCurrentStep();
      if (error$1) {
        error(error$1);
        return;
      }
      
      const btn = document.getElementById('finish-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner-small"></span> Setting up...';
      
      try {
        const res = await fetch('/api/setup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Setup failed');
        }
        
        app.innerHTML = `
          <div class="setup-container">
            <div class="setup-card setup-complete">
              <div class="success-icon">
                <span class="round-icon">check_circle</span>
              </div>
              <h2>Setup Complete!</h2>
              <p>Sodium has been configured successfully.</p>
              <p class="text-muted">Please restart the server for changes to take effect.</p>
              <a href="/auth" class="btn btn-primary">Go to Login</a>
            </div>
          </div>
        `;
      } catch (err) {
        error(err.message);
        btn.disabled = false;
        btn.textContent = 'Complete Setup';
      }
    });
    
    // Database type change
    document.getElementById('db-type')?.addEventListener('change', (e) => {
      const external = document.getElementById('db-external-config');
      if (e.target.value === 'file' || e.target.value === 'sqlite') {
        external?.classList.add('hidden');
      } else {
        external?.classList.remove('hidden');
      }
    });
    
    // Redis toggle
    document.getElementById('redis-enabled')?.addEventListener('change', (e) => {
      const redisConfig = document.getElementById('redis-config');
      if (e.target.checked) {
        redisConfig?.classList.remove('hidden');
      } else {
        redisConfig?.classList.add('hidden');
      }
    });
    
    // Test database connection
    document.getElementById('test-db-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('test-db-btn');
      const result = document.getElementById('db-test-result');
      
      btn.disabled = true;
      result.textContent = 'Testing...';
      result.className = 'test-result';
      
      try {
        const res = await fetch('/api/setup/test-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: document.getElementById('db-type').value,
            host: document.getElementById('db-host').value,
            port: document.getElementById('db-port').value,
            name: document.getElementById('db-name').value,
            user: document.getElementById('db-user').value,
            password: document.getElementById('db-password').value
          })
        });
        
        const data = await res.json();
        result.textContent = res.ok ? '✓ ' + data.message : '✗ ' + data.error;
        result.className = 'test-result ' + (res.ok ? 'success' : 'error');
      } catch (err) {
        result.textContent = '✗ Connection failed';
        result.className = 'test-result error';
      }
      
      btn.disabled = false;
    });
    
    // Test Redis connection
    document.getElementById('test-redis-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('test-redis-btn');
      const result = document.getElementById('redis-test-result');
      
      btn.disabled = true;
      result.textContent = 'Testing...';
      result.className = 'test-result';
      
      try {
        const res = await fetch('/api/setup/test-redis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: document.getElementById('redis-host').value,
            port: document.getElementById('redis-port').value,
            password: document.getElementById('redis-password').value
          })
        });
        
        const data = await res.json();
        result.textContent = res.ok ? '✓ ' + data.message : '✗ ' + data.error;
        result.className = 'test-result ' + (res.ok ? 'success' : 'error');
      } catch (err) {
        result.textContent = '✗ Connection failed';
        result.className = 'test-result error';
      }
      
      btn.disabled = false;
    });
  }
  
  render();
}

const routes = {
  '/': {
    redirect: '/auth'
  },
  '/setup': {
    render: renderSetup,
    options: {
      title: 'Setup',
      sidebar: false
    }
  },
  '/auth': {
    render: renderAuth,
    options: {
      title: 'Sign In',
      sidebar: false
    }
  },
  '/auth/callback': {
    render: renderAuthCallback,
    options: {
      title: 'Signing In',
      sidebar: false
    }
  },
  '/auth/verify-email': {
    render: renderVerifyEmail,
    options: {
      title: 'Verify Email',
      sidebar: false
    }
  },
  '/auth/reset-password': {
    render: renderResetPassword,
    options: {
      title: 'Reset Password',
      sidebar: false
    }
  },
  '/dashboard': {
    render: renderDashboard,
    cleanup: cleanupDashboard,
    options: {
      title: 'Dashboard',
      auth: true,
      sidebar: true
    }
  },
  '/servers': {
    render: renderServers,
    cleanup: cleanupServers,
    options: {
      title: 'Servers',
      auth: true,
      sidebar: true
    }
  },
  '/servers/create': {
    render: renderCreateServer,
    cleanup: cleanupCreateServer,
    options: {
      title: 'Create Server',
      auth: true,
      sidebar: true
    }
  },
  '/status': {
    render: renderStatus,
    cleanup: cleanupStatus,
    options: {
      title: 'Status',
      sidebar: false
    }
  },
  '/admin': {
    redirect: '/admin/overview'
  },
  '/admin/overview': {
    render: (params) => renderAdmin('overview', params),
    cleanup: cleanupAdmin,
    options: { title: 'Overview', auth: true, sidebar: true }
  },
  '/admin/nodes': {
    render: (params) => renderAdmin('nodes', params),
    cleanup: cleanupAdmin,
    options: { title: 'Nodes', auth: true, sidebar: true }
  },
  '/admin/servers': {
    render: (params) => renderAdmin('servers', params),
    cleanup: cleanupAdmin,
    options: { title: 'Admin Servers', auth: true, sidebar: true }
  },
  '/admin/users': {
    render: (params) => renderAdmin('users', params),
    cleanup: cleanupAdmin,
    options: { title: 'Users', auth: true, sidebar: true }
  },
  '/admin/nests': {
    render: (params) => renderAdmin('nests', params),
    cleanup: cleanupAdmin,
    options: { title: 'Nests', auth: true, sidebar: true }
  },
  '/admin/locations': {
    render: (params) => renderAdmin('locations', params),
    cleanup: cleanupAdmin,
    options: { title: 'Locations', auth: true, sidebar: true }
  },
  '/admin/announcements': {
    render: (params) => renderAdmin('announcements', params),
    cleanup: cleanupAdmin,
    options: { title: 'Announcements', auth: true, sidebar: true }
  },
  '/admin/audit': {
    render: (params) => renderAdmin('audit', params),
    cleanup: cleanupAdmin,
    options: { title: 'Audit Log', auth: true, sidebar: true }
  },
  '/admin/settings': {
    render: (params) => renderAdmin('settings', params),
    cleanup: cleanupAdmin,
    options: { title: 'Panel Settings', auth: true, sidebar: true }
  },
  '/admin/webhooks': {
    render: (params) => renderAdmin('webhooks', params),
    cleanup: cleanupAdmin,
    options: { title: 'Webhooks', auth: true, sidebar: true }
  },
  '/admin/plugins': {
    render: (params) => renderAdmin('plugins', params),
    cleanup: cleanupAdmin,
    options: { title: 'Plugins', auth: true, sidebar: true }
  },
  '/admin/groups': {
    render: (params) => renderAdmin('groups', params),
    cleanup: cleanupAdmin,
    options: { title: 'Groups', auth: true, sidebar: true }
  },
  '/admin/incidents': {
    render: (params) => renderAdmin('incidents', params),
    cleanup: cleanupAdmin,
    options: { title: 'Incidents', auth: true, sidebar: true }
  },
  '/profile': {
    render: renderProfile,
    options: {
      title: 'Profile',
      auth: true,
      sidebar: true
    }
  },
  '/settings': {
    render: renderSettings,
    options: {
      title: 'Settings',
      auth: true,
      sidebar: true
    }
  },
  '/activity': {
    render: renderActivityLog,
    options: {
      title: 'Activity Log',
      auth: true,
      sidebar: true
    }
  },
  '/404': {
    render: renderNotFound,
    options: {
      title: 'Not Found',
      sidebar: false
    }
  }
};

function getAdminPluginRoute(tabKey) {
  return {
    render: () => renderAdmin(tabKey),
    cleanup: cleanupAdmin,
    options: {
      title: 'Plugin',
      auth: true,
      sidebar: true
    }
  };
}

function getUserRoute(username) {
  return {
    render: () => renderUser(username),
    options: {
      title: `${username}'s Profile`,
      sidebar: true
    }
  };
}

function getServerRoute(serverId) {
  return {
    render: () => renderServerPage(serverId),
    cleanup: cleanupServerPage,
    options: {
      title: 'Server',
      auth: true,
      sidebar: true
    }
  };
}

function renderNav() {
  const nav = document.createElement('nav');
  nav.id = 'navbar';
  nav.className = 'navbar';
  
  const user = state$1.user;
  const displayName = escapeHtml$1(user?.displayName || user?.username || 'User');
  const isLoggedIn = state$1.isLoggedIn;
  const branding = getBranding();
  
  nav.innerHTML = `
    <div class="nav-content">
      <div class="nav-left">
        <button class="nav-toggle" id="sidebar-toggle">
          <span class="round-icon">menu</span>
        </button>
        <a href="/dashboard" class="nav-brand">
          <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${escapeHtml$1(branding.name)}" width="22" height="22">
          <span class="brand-text">${escapeHtml$1(branding.name)}</span>
        </a>
      </div>
      
      <div class="nav-right">
        ${isLoggedIn ? `
          <div class="user-menu" id="user-menu">
            <button class="user-menu-btn" id="user-menu-btn">
              <div class="user-avatar">
                <img src="/default-avatar.png" alt="Avatar" onerror="this.src='/default-avatar.png'">
              </div>
              <span class="user-display-name">${displayName}</span>
              <span class="round-icon dropdown-icon">expand_more</span>
            </button>
            <div class="user-dropdown" id="user-dropdown">
              <a href="/profile" class="dropdown-item">
                <span class="round-icon">person</span>
                <span>Profile</span>
              </a>
              <a href="/settings" class="dropdown-item">
                <span class="round-icon">settings</span>
                <span>Settings</span>
              </a>
              <hr class="dropdown-divider">
              <button class="dropdown-item logout" id="nav-logout">
                <span class="round-icon">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const toggle = nav.querySelector('#sidebar-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) {
          const isOpen = sidebar.classList.toggle('open');
          if (overlay) {
            overlay.classList.toggle('active', isOpen);
          }
        }
      });
    }
    
    const userMenuBtn = nav.querySelector('#user-menu-btn');
    const userDropdown = nav.querySelector('#user-dropdown');
    
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
      });
      
      document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
      });
    }
    
    const logoutBtn = nav.querySelector('#nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearAuth();
        window.router.navigateTo('/auth');
      });
    }
  }, 0);
  
  return nav;
}

async function updateNav() {
  const avatarEl = document.querySelector('#navbar .user-avatar img');
  const nameEl = document.querySelector('#navbar .user-display-name');
  if (!avatarEl) return;
  
  const username = state$1.username;
  if (!username) return;
  
  try {
    const res = await api(`/api/user/profile?username=${encodeURIComponent(username)}&viewer=${encodeURIComponent(username)}`);
    const data = await res.json();
    
    if (data.user) {
      avatarEl.src = data.user.avatar || '/default-avatar.png';
      if (nameEl) nameEl.textContent = data.user.displayName || username;
    }
  } catch {
    // Keep defaults on error
  }
}

function renderSidebar() {
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  
  const sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  sidebar.className = 'sidebar';
  
  const currentPath = window.location.pathname;
  const user = state$1.user;
  const branding = getBranding();
  
  const sections = [
    {
      label: null,
      items: [
        { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/servers', icon: 'dns', label: 'Servers' }
      ]
    },
    {
      label: 'Monitoring',
      items: [
        { path: '/status', icon: 'monitor_heart', label: 'Status' },
        { path: '/activity', icon: 'timeline', label: 'Activity' }
      ]
    },
    {
      label: 'Account',
      items: [
        { path: '/profile', icon: 'person', label: 'Profile' },
        { path: '/settings', icon: 'settings', label: 'Settings' }
      ]
    }
  ];
  
  const adminSection = {
    label: 'Administration',
    items: [
      { path: '/admin/overview', icon: 'analytics', label: 'Overview' },
      { path: '/admin/nodes', icon: 'dns', label: 'Nodes' },
      { path: '/admin/servers', icon: 'dns', label: 'Servers' },
      { path: '/admin/users', icon: 'people', label: 'Users' },
      { path: '/admin/groups', icon: 'group', label: 'Groups' },
      { path: '/admin/nests', icon: 'egg', label: 'Nests' },
      { path: '/admin/locations', icon: 'location_on', label: 'Locations' },
      { path: '/admin/incidents', icon: 'warning', label: 'Incidents' },
      { path: '/admin/announcements', icon: 'campaign', label: 'Announcements' },
      { path: '/admin/webhooks', icon: 'webhook', label: 'Webhooks' },
      { path: '/admin/audit', icon: 'history', label: 'Audit Log' },
      { path: '/admin/plugins', icon: 'extension', label: 'Plugins' },
      { path: '/admin/settings', icon: 'tune', label: 'Panel Settings' }
    ]
  };
  
  // Plugin sidebar items
  const pluginItems = getPluginSidebarItems();
  if (pluginItems.length > 0) {
    const insertIdx = sections.findIndex(s => s.label === 'Account');
    const pluginSection = {
      label: 'Plugins',
      items: pluginItems.map(item => ({
        path: item.href,
        icon: item.icon || 'extension',
        label: item.label
      }))
    };
    if (insertIdx !== -1) {
      sections.splice(insertIdx, 0, pluginSection);
    } else {
      sections.push(pluginSection);
    }
  }

  if (user?.isAdmin) {
    // Add plugin admin pages to admin section
    const pluginAdminPages = getPluginAdminPages();
    for (const page of pluginAdminPages) {
      adminSection.items.push({
        path: `/admin/plugin:${page.pluginId}:${page.id}`,
        icon: page.icon || 'extension',
        label: page.title || page.id
      });
    }
    sections.push(adminSection);
  }
  
  const renderSection = (section) => {
    const header = section.label 
      ? `<div class="nav-section-label">${section.label}</div>` 
      : '';
    
    const items = section.items.map(item => `
      <li class="nav-item">
        <a href="${item.path}" class="nav-link ${currentPath === item.path || currentPath.startsWith(item.path + '/') ? 'active' : ''}">
          <span class="round-icon">${item.icon}</span>
          <span class="nav-text">${item.label}</span>
        </a>
      </li>
    `).join('');
    
    return `
      <div class="nav-section">
        ${header}
        <ul class="nav-list">${items}</ul>
      </div>
    `;
  };
  
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <a href="/dashboard" class="sidebar-brand">
        <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="22" height="22">
        <span class="brand-text">${branding.name}</span>
      </a>
    </div>
    
    <nav class="sidebar-nav">
      ${sections.map(renderSection).join('')}
    </nav>
    
    <div class="sidebar-footer">
      <div class="footer-content">
        <span>Powered by <a href="https://sodiumpanel.github.io/">Sodium</a></span>
        <br>
        <span><a href="https://github.com/zt3xdv/">zt3xdv</a> and contributors.</span>
      </div>
    </div>
  `;
  
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  };
  
  overlay.addEventListener('click', closeSidebar);
  
  setTimeout(() => {
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeSidebar();
        }
      });
    });
  }, 0);
  
  const fragment = document.createDocumentFragment();
  fragment.appendChild(overlay);
  fragment.appendChild(sidebar);
  
  return fragment;
}

let mounted = false;
let currentCleanup = null;
let routerTimeout = null;

function clearMain() {
  const existing = document.getElementById('app');
  if (existing) existing.innerHTML = '';
}

function mountShell(withSidebar = false) {
  if (!mounted) {
    document.body.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.className = withSidebar ? 'with-sidebar' : '';
    
    if (withSidebar) {
      wrapper.appendChild(renderSidebar());
    }
    
    const contentArea = document.createElement('div');
    contentArea.id = 'content-area';
    
    contentArea.appendChild(renderNav());
    
    const main = document.createElement('main');
    main.id = 'app';
    contentArea.appendChild(main);
    
    wrapper.appendChild(contentArea);
    document.body.appendChild(wrapper);
    
    document.body.addEventListener('click', onBodyClick);
    mounted = true;
  } else {
    const wrapper = document.getElementById('wrapper');
    if (wrapper) {
      wrapper.className = withSidebar ? 'with-sidebar' : '';
      
      const existingSidebar = document.getElementById('sidebar');
      const existingOverlay = document.getElementById('sidebar-overlay');
      if (withSidebar && !existingSidebar) {
        if (existingOverlay) existingOverlay.remove();
        wrapper.insertBefore(renderSidebar(), wrapper.firstChild);
      } else if (!withSidebar && existingSidebar) {
        existingSidebar.remove();
        if (existingOverlay) existingOverlay.remove();
      } else if (withSidebar && existingSidebar) {
        existingSidebar.classList.remove('open');
        if (existingOverlay) existingOverlay.classList.remove('active');
      }
    }
  }
}

function onBodyClick(e) {
  if (e.defaultPrevented) return;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  
  let a = e.target;
  while (a && a.nodeName !== 'A') a = a.parentElement;
  if (!a) return;
  
  const href = a.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  
  e.preventDefault();
  navigate(href);
}

function navigate(path) {
  if (!path.startsWith('/')) {
    const base = window.location.pathname.replace(/\/+$/, '');
    path = base + '/' + path;
  }
  window.history.pushState({}, '', path);
  router();
}

window.router = {
  navigateTo: navigate
};

window.addEventListener('popstate', () => {
  router();
});

function router() {
  const path = window.location.pathname;
  let route = routes[path];
  
  if (!route && path.startsWith('/u/')) {
    const username = path.split('/')[2];
    if (username && /^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      route = getUserRoute(username);
    }
  }
  
  // Handle admin plugin pages (format: /admin/plugin:pluginId:pageId)
  if (!route && path.startsWith('/admin/plugin:')) {
    const tabKey = path.replace('/admin/', '');
    route = getAdminPluginRoute(tabKey);
  }
  
  if (!route && path.startsWith('/server/')) {
    const serverId = path.split('/')[2];
    if (serverId) {
      route = getServerRoute(serverId);
    }
  }
  
  // Check plugin pages
  if (!route) {
    const pluginPages = getPluginPages();
    const pluginPage = pluginPages.find(p => p.path === path);
    if (pluginPage) {
      route = {
        render: () => {
          const app = document.getElementById('app');
          app.className = 'plugin-page';
          renderPluginPage(pluginPage.pluginId, pluginPage.id, app);
        },
        options: {
          title: pluginPage.title || 'Plugin',
          auth: true,
          sidebar: pluginPage.sidebar !== false
        }
      };
    }
  }
  
  if (!route) {
    route = routes['/404'];
  }
  
  const isAuthenticated = !!localStorage.getItem('auth_token'); // only localStorage usage: auth_token
  
  if (route.redirect) {
    window.history.replaceState({}, '', route.redirect);
    return router();
  }
  
  if (route.options?.auth && !isAuthenticated) {
    window.history.replaceState({}, '', '/auth');
    return router();
  }
  
  if (isAuthenticated && path === '/auth') {
    window.history.replaceState({}, '', '/dashboard');
    return router();
  }
  
  if (isAuthenticated && path === '/') {
    window.history.replaceState({}, '', '/dashboard');
    return router();
  }
  
  if (!isAuthenticated && path === '/') {
    window.history.replaceState({}, '', '/auth');
    return router();
  }
  
  document.title = getBranding().name + ' - ' + (route.options?.title || 'App');
  
  if (routerTimeout) {
    clearTimeout(routerTimeout);
    routerTimeout = null;
  }
  
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.add('fade-out');
  
  routerTimeout = setTimeout(() => {
    routerTimeout = null;
    
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    
    mountShell(route.options?.sidebar !== false && isAuthenticated);
    clearMain();
    
    // Update active link in sidebar instead of replacing it
    const existingSidebar = document.getElementById('sidebar');
    if (existingSidebar && route.options?.sidebar !== false && isAuthenticated) {
      updateSidebarActiveLink(path);
    }
    
    updateNav();
    route.render();
    currentCleanup = route.cleanup || null;
    
    const newAppEl = document.getElementById('app');
    if (newAppEl) {
      newAppEl.classList.remove('fade-out');
      newAppEl.classList.add('fade-in');
    }
  }, 150);
}

function updateSidebarActiveLink(currentPath) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  sidebar.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

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

})(__vendor__xterm_xterm, __vendor__xterm_addon_fit, __vendor__xterm_addon_web_links, __vendor_codemirror, __vendor__codemirror_state, __vendor__codemirror_theme_one_dark, __vendor__codemirror_lang_javascript, __vendor__codemirror_lang_json, __vendor__codemirror_lang_html, __vendor__codemirror_lang_css, __vendor__codemirror_lang_python, __vendor__codemirror_lang_java, __vendor__codemirror_lang_php, __vendor__codemirror_lang_xml, __vendor__codemirror_lang_yaml, __vendor__codemirror_lang_markdown, __vendor__codemirror_view);
