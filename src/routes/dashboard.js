import { api, getToken } from '../utils/api.js';
import { state } from '../utils/state.js';
import { escapeHtml } from '../utils/security.js';
import { icons, icon } from '../utils/icons.js';

let pollInterval = null;
let statusSockets = new Map();

export function renderDashboard() {
  const app = document.getElementById('app');
  app.className = 'dashboard-page';

  const displayName = state.user?.displayName || state.username;

  app.innerHTML = `
    <div class="dashboard-container">
      <div id="node-alerts-container"></div>
      <div id="email-verification-banner"></div>
      <div id="announcements-container"></div>

      <header class="dashboard-header">
        <div class="greeting">
          <div class="greeting-text">
            <h1>${escapeHtml(displayName)}</h1>
            <p>Here's what's happening with your servers.</p>
          </div>
        </div>
        <div class="quick-stats" id="quick-stats"></div>
      </header>

      <div class="stats-grid" id="limits-display">
        ${statCard(icons.dns, '-', 'Servers')}
        ${statCard(icons.memory, '-', 'Memory')}
        ${statCard(icons.storage, '-', 'Disk')}
        ${statCard(icons.speed, '-', 'CPU')}
      </div>

      <div class="dashboard-section servers-section">
        <div class="section-header">
          ${icons.dns}
          <h2>Servers</h2>
          <a href="/servers" class="section-link">View All ${icon('chevron_right', 14)}</a>
        </div>
        <div class="servers-list" id="servers-list">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;

  loadLimits();
  loadServers();
  loadAnnouncements();
  checkEmailVerification();

  pollInterval = setInterval(() => {
    loadServers();
    loadLimits();
  }, 10000);
}

function statCard(ic, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-icon">${ic}</div>
      <div class="stat-content">
        <span class="stat-value">${value}</span>
        <span class="stat-label">${label}</span>
      </div>
    </div>
  `;
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
            ${icons.mail}
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
  } catch (e) {}
}

async function loadLimits() {
  const username = state.username;
  const container = document.getElementById('limits-display');
  if (!container) return;

  try {
    const res = await api(`/api/user/limits?username=${encodeURIComponent(username)}`);
    const data = await res.json();

    container.innerHTML = `
      ${statCard(icons.dns, `${data.used.servers}<span class="stat-sep">/</span>${data.limits.servers}`, 'Servers')}
      ${statCard(icons.memory, `${data.used.memory}<span class="stat-sep">/</span>${data.limits.memory} MB`, 'Memory')}
      ${statCard(icons.storage, `${data.used.disk}<span class="stat-sep">/</span>${data.limits.disk} MB`, 'Disk')}
      ${statCard(icons.speed, `${data.used.cpu}<span class="stat-sep">/</span>${data.limits.cpu}%`, 'CPU')}
    `;
  } catch (e) {
    console.error('Failed to load limits:', e);
    container.innerHTML = '';
  }
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
          ${icons.dns}
          <p>No servers yet</p>
        </div>
      `;
      return;
    }

    const downNodes = [...new Set(data.servers.filter(s => s.node_online === false).map(s => s.node_name || 'Unknown'))];
    const alertsContainer = document.getElementById('node-alerts-container');
    if (alertsContainer) {
      alertsContainer.innerHTML = downNodes.length > 0 ? downNodes.map(name => `
        <div class="node-alert-banner">
          ${icons.warning}
          <div>
            <strong>Node "${escapeHtml(name)}" is offline</strong>
            <p>Servers on this node may be unreachable. <a href="/status">View status</a></p>
          </div>
        </div>
      `).join('') : '';
    }

    container.innerHTML = data.servers.map(server => `
      <a href="/server/${server.id}" class="server-item ${server.node_online === false ? 'node-down' : ''}">
        <div class="server-info">
          <span class="server-name">${escapeHtml(server.name)}</span>
          <span class="server-address">${server.node_address || `${server.allocation?.ip}:${server.allocation?.port}`}</span>
        </div>
        <div class="server-meta">
          ${server.node_online === false ? `<span class="node-down-badge">${icon('cloud_off', 14)} Node Down</span>` : ''}
          <span class="server-status" data-status-id="${server.id}"></span>
          ${icon('chevron_right', 14)}
        </div>
      </a>
    `).join('');

    connectStatusSockets(data.servers);
  } catch (e) {
    console.error('Failed to load servers:', e);
    container.innerHTML = `<div class="error-state">Failed to load servers</div>`;
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
          updateServerStatus(server.id, message.args[0]);
        }
      } catch (e) {}
    };

    socket.onclose = () => statusSockets.delete(server.id);
    statusSockets.set(server.id, socket);
  });
}

function updateServerStatus(serverId, status) {
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
    <div class="stat-chip online">${icons.dot_online} <span>${online} online</span></div>
    <div class="stat-chip starting">${icons.dot_starting} <span>${starting} starting</span></div>
    <div class="stat-chip stopping">${icons.dot_stopping} <span>${stopping} stopping</span></div>
    <div class="stat-chip offline">${icons.dot_offline} <span>${offline} offline</span></div>
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
      dismissed = state.user?.settings?.dismissedAnnouncements || [];
    } catch {}
    const activeAnnouncements = data.announcements.filter(a => !dismissed.includes(a.id));

    if (activeAnnouncements.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = activeAnnouncements.map(a => `
      <div class="announcement-banner type-${a.type}" data-id="${a.id}">
        <div class="announcement-icon">${icons.campaign}</div>
        <div class="announcement-content">
          <div class="announcement-title">${escapeHtml(a.title)}</div>
          <div class="announcement-text">${escapeHtml(a.content)}</div>
        </div>
        <button class="announcement-close" onclick="dismissAnnouncement('${a.id}')">${icon('close', 14)}</button>
      </div>
    `).join('');

    window.dismissAnnouncement = async (id) => {
      const banner = document.querySelector(`.announcement-banner[data-id="${id}"]`);
      if (banner) banner.remove();
      try {
        const current = state.user?.settings?.dismissedAnnouncements || [];
        current.push(id);
        await api('/api/user/settings', {
          method: 'PUT',
          body: JSON.stringify({ settings: { dismissedAnnouncements: current } })
        });
        state.update({ settings: { ...state.user?.settings, dismissedAnnouncements: current } });
      } catch {}
    };
  } catch (e) {
    console.error('Failed to load announcements:', e);
    container.innerHTML = '';
  }
}

export function cleanupDashboard() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  statusSockets.forEach(socket => socket.close());
  statusSockets.clear();
}
