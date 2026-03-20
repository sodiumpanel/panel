import { setToken } from '../utils/api.js';
import { getBranding } from '../utils/branding.js';
import { icons, icon } from '../utils/icons.js';

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

const SVG_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

const IC = {
  arrow: icon('chevron_right', 16),
  check: icon('check', 16),
  send: icon('send', 16),
  info: icon('info', 16),
  mail: icon('mail', 16),
  errBig: icon('error', 24),
  okBig: icon('check_circle', 24),
};

function pwField(id, label, placeholder, attrs = '') {
  return `
    <div class="field">
      <label class="field-label" for="${id}">${label}</label>
      <div class="field-pw-wrap">
        <input type="password" id="${id}" class="field-input" placeholder="${placeholder}" required ${attrs}>
        <button type="button" class="pw-toggle" aria-label="Toggle password visibility">${SVG_EYE}</button>
      </div>
    </div>`;
}

function initPwToggles(container) {
  container.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? SVG_EYE_OFF : SVG_EYE;
    });
  });
}

function spin() {
  return '<span class="spin"></span>';
}

function splitShell(rightContent, branding) {
  return `
    <div class="auth-split">
      <div class="auth-brand">
        <div class="brand-top">
          <img src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="28" height="28">
          <span class="brand-name">${branding.name}</span>
        </div>
        <div class="brand-hero">
          <div class="brand-tagline">Deploy, manage<br>and scale.</div>
          <p class="brand-desc">The modern game server management panel built for speed and simplicity.</p>
        </div>
        <div class="brand-footer">&copy; ${new Date().getFullYear()} ${branding.name}</div>
      </div>
      <div class="auth-main">
        <div class="auth-panel">
          <div class="auth-panel-header">
            <div class="mobile-logo">
              <img src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="22" height="22">
              <span>${branding.name}</span>
            </div>
            ${rightContent}
          </div>
        </div>
      </div>
    </div>
  `;
}

function statusPage(branding, { icon, title, subtitle, btnText, btnHref }) {
  return splitShell(`
    <div class="status-card">
      ${icon}
      <h2>${title}</h2>
      <p>${subtitle}</p>
      <a href="${btnHref}" class="btn-auth btn-fill">${btnText}</a>
    </div>
  `, branding);
}

function loaderPage(branding, title) {
  return splitShell(`
    <div class="status-card">
      <div class="status-loader"></div>
      <h2>${title}</h2>
    </div>
  `, branding);
}

export function renderAuth() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();

  app.innerHTML = splitShell(`
    <h1 id="auth-title">Welcome back</h1>
    <p class="auth-desc" id="auth-desc">Sign in to your account to continue</p>
  </div>

  <form id="login-form" class="auth-form active">
    <div class="field">
      <label class="field-label" for="login-username">Username</label>
      <input type="text" id="login-username" class="field-input" placeholder="your-username" required>
    </div>
    ${pwField('login-password', 'Password', '••••••••')}

    <div class="auth-error" id="login-error"></div>

    <button type="submit" class="btn-auth btn-fill" id="login-submit-btn">
      <span>Continue</span>
      ${IC.arrow}
    </button>

    <div class="auth-footer-links">
      <button type="button" class="foot-link" id="forgot-password-btn">Forgot password?</button>
      <button type="button" class="foot-link" id="switch-to-register">Or sign up ${IC.arrow}</button>
    </div>

    <div class="oauth-block" id="oauth-section" style="display:none;">
      <div class="oauth-line"><span>or</span></div>
      <div class="oauth-grid" id="oauth-buttons"></div>
    </div>
  </form>

  <form id="register-form" class="auth-form">
    <div class="field">
      <label class="field-label" for="register-username">Username</label>
      <input type="text" id="register-username" class="field-input" placeholder="your-username" required minlength="3" maxlength="20">
      <small class="field-hint">3-20 characters, letters, numbers, underscore</small>
    </div>

    <div class="field" id="email-field-group" style="display:none;">
      <label class="field-label" for="register-email">Email</label>
      <input type="email" id="register-email" class="field-input" placeholder="you@example.com">
      <small class="field-hint">Required for verification</small>
    </div>

    ${pwField('register-password', 'Password', '••••••••', 'minlength="8"')}
    ${pwField('register-confirm', 'Confirm Password', '••••••••')}

    <div id="captcha-container" style="display:none;margin-bottom:16px;"></div>

    <div class="auth-error" id="register-error"></div>

    <button type="submit" class="btn-auth btn-fill" id="register-submit-btn">
      <span>Create Account</span>
      ${IC.arrow}
    </button>

    <div class="auth-footer-links">
      <button type="button" class="foot-link" id="switch-to-login">Or sign in ${IC.arrow}</button>
    </div>
  </form>
  `, branding);

  initPwToggles(app);

  const loginForm = app.querySelector('#login-form');
  const registerForm = app.querySelector('#register-form');
  const headerEl = app.querySelector('#auth-title');
  const descEl = app.querySelector('#auth-desc');

  function showLogin() {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    if (headerEl) headerEl.textContent = 'Welcome back';
    if (descEl) descEl.textContent = 'Sign in to your account to continue';
  }

  function showRegister() {
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    if (headerEl) headerEl.textContent = 'Get started';
    if (descEl) descEl.textContent = 'Create a new account';
  }

  app.querySelector('#switch-to-register').addEventListener('click', showRegister);
  app.querySelector('#switch-to-login').addEventListener('click', showLogin);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginForm.querySelector('#login-username').value;
    const password = loginForm.querySelector('#login-password').value;
    const errorEl = loginForm.querySelector('#login-error');
    const btn = loginForm.querySelector('#login-submit-btn');

    btn.disabled = true;
    btn.innerHTML = spin();
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
        btn.innerHTML = `<span>Continue</span>${IC.arrow}`;
        return;
      }
      if (data.requires2FA) { render2FAScreen(username, password); return; }
      setToken(data.token);
      window.router.navigateTo('/dashboard');
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>Continue</span>${IC.arrow}`;
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = registerForm.querySelector('#register-username').value;
    const email = registerForm.querySelector('#register-email').value;
    const password = registerForm.querySelector('#register-password').value;
    const confirm = registerForm.querySelector('#register-confirm').value;
    const errorEl = registerForm.querySelector('#register-error');
    const btn = registerForm.querySelector('#register-submit-btn');

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.style.display = 'block';
      return;
    }
    btn.disabled = true;
    btn.innerHTML = spin();
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
        btn.innerHTML = `<span>Create Account</span>${IC.arrow}`;
        if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
        return;
      }
      setToken(data.token);
      window.router.navigateTo('/dashboard');
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>Create Account</span>${IC.arrow}`;
      if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    }
  });

  loadOAuthProviders();
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
  } catch (e) {}
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

async function loadOAuthProviders() {
  try {
    const res = await fetch('/api/auth/oauth/providers');
    const data = await res.json();
    if (data.providers && data.providers.length > 0) {
      const section = document.getElementById('oauth-section');
      const container = document.getElementById('oauth-buttons');
      if (section && container) {
        section.style.display = 'block';
        container.innerHTML = data.providers.map(p => `
          <button type="button" class="oauth-pill" data-provider="${p.id}">
            ${OAUTH_ICONS[p.type] || ''}
            <span>${p.name}</span>
          </button>
        `).join('');
        container.querySelectorAll('.oauth-pill').forEach(btn => {
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

export function renderAuthCallback() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error');

  if (error) {
    app.innerHTML = statusPage(branding, {
      icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
      title: 'Authentication Failed',
      subtitle: getErrorMessage(error),
      btnText: 'Try Again',
      btnHref: '/auth'
    });
    return;
  }

  if (token) {
    app.innerHTML = loaderPage(branding, 'Signing in...');
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

  app.innerHTML = splitShell(`
    <h1>Two-Factor Auth</h1>
    <p class="auth-desc">Verify your identity to continue</p>
  </div>

  <form id="2fa-form" class="auth-form active">
    <div class="auth-notice">
      ${IC.mail}
      A verification code has been sent to your email.
    </div>

    <div class="field">
      <label class="field-label" for="2fa-code">Verification Code</label>
      <input type="text" id="2fa-code" class="field-input field-code" placeholder="000000"
             required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code">
    </div>

    <div class="auth-error" id="2fa-error"></div>

    <button type="submit" class="btn-auth btn-fill" id="2fa-submit-btn">
      <span>Verify</span>
      ${IC.check}
    </button>

    <div class="auth-footer-links">
      <button type="button" class="foot-link" id="resend-code-btn">Resend Code</button>
      <span class="dot">·</span>
      <button type="button" class="foot-link" id="back-to-login-btn">Back</button>
    </div>
  </form>
  `, branding);

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
    btn.innerHTML = spin();
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
        btn.innerHTML = `<span>Verify</span>${IC.check}`;
        if (data.codeExpired) codeInput.value = '';
        return;
      }
      setToken(data.token);
      window.router.navigateTo('/dashboard');
    } catch (err) {
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>Verify</span>${IC.check}`;
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
        const notice = document.querySelector('.auth-notice');
        if (notice) {
          notice.innerHTML = `${IC.check} New code sent to your email.`;
          notice.classList.add('notice-ok');
        }
      }
    } catch (err) {
      errorEl.textContent = 'Failed to resend code';
      errorEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Resend Code';
  });

  document.getElementById('back-to-login-btn').addEventListener('click', () => renderAuth());
  codeInput.focus();
}

export async function renderVerifyEmail() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    app.innerHTML = statusPage(branding, {
      icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
      title: 'Invalid Link',
      subtitle: 'No verification token provided.',
      btnText: 'Go to Login',
      btnHref: '/auth'
    });
    return;
  }

  app.innerHTML = loaderPage(branding, 'Verifying email...');

  try {
    const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data.success) {
      app.innerHTML = statusPage(branding, {
        icon: `<div class="status-card-icon icon-ok">${IC.okBig}</div>`,
        title: 'Email Verified',
        subtitle: data.message || 'Your email has been verified successfully.',
        btnText: 'Go to Dashboard',
        btnHref: '/dashboard'
      });
    } else {
      app.innerHTML = statusPage(branding, {
        icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
        title: 'Verification Failed',
        subtitle: data.error || 'Unable to verify your email.',
        btnText: 'Go to Dashboard',
        btnHref: '/dashboard'
      });
    }
  } catch (e) {
    app.innerHTML = statusPage(branding, {
      icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
      title: 'Connection Error',
      subtitle: 'Unable to reach the server. Please try again.',
      btnText: 'Try Again',
      btnHref: window.location.href
    });
  }
}

function renderForgotPassword() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();

  app.innerHTML = splitShell(`
    <h1>Reset password</h1>
    <p class="auth-desc">We'll send you a link to reset it</p>
  </div>

  <form id="forgot-form" class="auth-form active">
    <div class="field">
      <label class="field-label" for="forgot-email">Email</label>
      <input type="email" id="forgot-email" class="field-input" placeholder="you@example.com" required>
    </div>

    <div class="auth-error" id="forgot-error"></div>
    <div class="auth-success" id="forgot-success" style="display:none;"></div>

    <button type="submit" class="btn-auth btn-fill" id="forgot-submit-btn">
      <span>Send Reset Link</span>
      ${IC.send}
    </button>

    <div class="auth-footer-links">
      <button type="button" class="foot-link" id="back-to-login-btn">Back to Login</button>
    </div>
  </form>
  `, branding);

  const form = document.getElementById('forgot-form');
  const errorEl = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = document.getElementById('forgot-submit-btn');
    btn.disabled = true;
    btn.innerHTML = spin();
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
    btn.innerHTML = `<span>Send Reset Link</span>${IC.send}`;
  });

  document.getElementById('back-to-login-btn').addEventListener('click', () => renderAuth());
}

export async function renderResetPassword() {
  const app = document.getElementById('app');
  app.className = 'auth-page';
  const branding = getBranding();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    app.innerHTML = statusPage(branding, {
      icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
      title: 'Invalid Link',
      subtitle: 'No reset token provided.',
      btnText: 'Go to Login',
      btnHref: '/auth'
    });
    return;
  }

  app.innerHTML = loaderPage(branding, 'Validating...');

  try {
    const res = await fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!data.valid) {
      app.innerHTML = statusPage(branding, {
        icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
        title: 'Invalid Link',
        subtitle: data.error || 'This reset link is invalid or has expired.',
        btnText: 'Go to Login',
        btnHref: '/auth'
      });
      return;
    }

    app.innerHTML = splitShell(`
      <h1>New password</h1>
      <p class="auth-desc">Reset password for <strong>${data.username}</strong></p>
    </div>

    <form id="reset-form" class="auth-form active">
      ${pwField('new-password', 'New Password', '••••••••', 'minlength="8"')}
      ${pwField('confirm-password', 'Confirm Password', '••••••••')}

      <div class="auth-error" id="reset-error"></div>

      <button type="submit" class="btn-auth btn-fill" id="reset-submit-btn">
        <span>Reset Password</span>
        ${IC.check}
      </button>
    </form>
    `, branding);

    initPwToggles(app);

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
      btn.innerHTML = spin();
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
          btn.innerHTML = `<span>Reset Password</span>${IC.check}`;
        } else {
          app.innerHTML = statusPage(branding, {
            icon: `<div class="status-card-icon icon-ok">${IC.okBig}</div>`,
            title: 'Password Reset',
            subtitle: 'Your password has been reset successfully.',
            btnText: 'Sign In',
            btnHref: '/auth'
          });
        }
      } catch (err) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = `<span>Reset Password</span>${IC.check}`;
      }
    });

  } catch (e) {
    app.innerHTML = statusPage(branding, {
      icon: `<div class="status-card-icon icon-error">${IC.errBig}</div>`,
      title: 'Connection Error',
      subtitle: 'Unable to reach the server. Please try again.',
      btnText: 'Try Again',
      btnHref: window.location.href
    });
  }
}
