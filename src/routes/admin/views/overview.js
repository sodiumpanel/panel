import { escapeHtml } from '../../../utils/security.js';
import { icons, icon } from '../../../utils/icons.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';
import { state } from '../state.js';
import { renderBreadcrumb, setupBreadcrumbListeners, formatBytes } from '../utils/ui.js';

const navigateTo = (...args) => window.adminNavigate(...args);

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActivityIcon(action) {
  if (!action) return 'history';
  if (action.includes('login')) return 'login';
  if (action.includes('logout')) return 'logout';
  if (action.includes('create')) return 'add_circle';
  if (action.includes('delete')) return 'delete';
  if (action.includes('update') || action.includes('edit')) return 'edit';
  if (action.includes('start')) return 'play_arrow';
  if (action.includes('stop')) return 'stop';
  if (action.includes('restart')) return 'restart_alt';
  if (action.includes('backup')) return 'backup';
  if (action.includes('file')) return 'folder';
  if (action.includes('install')) return 'download';
  return 'history';
}

function getAuditIcon(action) {
  if (!action) return 'shield';
  if (action.includes('user')) return 'person';
  if (action.includes('server')) return 'dns';
  if (action.includes('node')) return 'hub';
  if (action.includes('setting')) return 'settings';
  if (action.includes('egg') || action.includes('nest')) return 'egg';
  if (action.includes('suspend')) return 'block';
  if (action.includes('delete')) return 'delete';
  return 'shield';
}

export async function renderOverview(container, username, loadView) {
  container.innerHTML = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="greeting">
          <div class="greeting-icon">
            ${icons.manage_accounts}
          </div>
          <div class="greeting-text">
            <h1>Welcome, <span class="highlight">${escapeHtml(username)}!</span></h1>
            <p>Welcome to the admin panel.</p>
          </div>
        </div>
      </header>

      <div class="stats-grid" id="overview-stats">
        <div class="stat-card">
          <div class="stat-icon">${icons.dns}</div>
          <div class="stat-content">
            <span class="stat-value" id="stat-servers">-</span>
            <span class="stat-label">Servers</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icons.people}</div>
          <div class="stat-content">
            <span class="stat-value" id="stat-users">-</span>
            <span class="stat-label">Users</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icons.hub}</div>
          <div class="stat-content">
            <span class="stat-value" id="stat-nodes">-</span>
            <span class="stat-label">Nodes</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icons.egg}</div>
          <div class="stat-content">
            <span class="stat-value" id="stat-eggs">-</span>
            <span class="stat-label">Eggs</span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-section">
          <span class="round-icon corner-icon">monitor_heart</span>
          <div class="section-header">
            ${icons.monitor_heart}
            <h2>System</h2>
          </div>
          <div id="system-info">
            <div class="loading-spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <span class="round-icon corner-icon">hub</span>
          <div class="section-header">
            ${icons.hub}
            <h2>Nodes</h2>
            <a class="muted" data-navigate="nodes">View All</a>
          </div>
          <div id="nodes-status">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-section">
          <span class="round-icon corner-icon">history</span>
          <div class="section-header">
            ${icons.history}
            <h2>Recent Activity</h2>
            <a class="muted" data-navigate="logs">View All</a>
          </div>
          <div id="recent-activity">
            <div class="loading-spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <span class="round-icon corner-icon">shield</span>
          <div class="section-header">
            ${icons.shield}
            <h2>Audit Log</h2>
            <a class="muted" data-navigate="logs">View All</a>
          </div>
          <div id="recent-audit">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-section">
          <a class="overview-item" href="https://sodiumpanel.github.io/panel/viewer.html">
            ${icons.article}
            <div class="info">
              <div class="title">Documentation</div>
              <div class="description">You can view the documentation clicking here</div>
            </div>
          </a>
        </div>
        <div class="dashboard-section">
          <a class="overview-item" href="https://github.com/sodiumpanel/panel">
            ${icons.merge}
            <div class="info">
              <div class="title">Github</div>
              <div class="description">Leave us an star on our Github repository</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-navigate]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.navigate);
    });
  });

  loadStats();
  loadSystemInfo();
  loadNodesStatus();
  loadRecentActivity();
  loadRecentAudit();
}

async function loadStats() {
  try {
    const res = await api('/api/admin/system/info');
    const health = await api('/api/health');
    const data = await res.json();
    const healthData = await health.json();

    const usersRes = await api('/api/admin/users?per_page=1');
    const serversRes = await api('/api/admin/servers?per_page=1');
    const nodesRes = await api('/api/admin/nodes?per_page=1');
    const [usersData, serversData, nodesData] = await Promise.all([
      usersRes.json(), serversRes.json(), nodesRes.json()
    ]);

    const el = (id) => document.getElementById(id);
    if (el('stat-servers')) el('stat-servers').textContent = serversData.meta?.total ?? 0;
    if (el('stat-users')) el('stat-users').textContent = usersData.meta?.total ?? 0;
    if (el('stat-nodes')) el('stat-nodes').textContent = nodesData.meta?.total ?? 0;
    if (el('stat-eggs')) el('stat-eggs').textContent = data.features ? '—' : '—';

    try {
      const eggsRes = await api('/api/admin/nests');
      const eggsData = await eggsRes.json();
      const totalEggs = (eggsData.nests || []).reduce((sum, n) => sum + (n.eggs?.length || 0), 0);
      if (el('stat-eggs')) el('stat-eggs').textContent = totalEggs;
    } catch {}
  } catch {
    // Stats will show "-" on error
  }
}

async function loadSystemInfo() {
  const target = document.getElementById('system-info');
  if (!target) return;

  try {
    const [sysRes, healthRes] = await Promise.all([
      api('/api/admin/system/info'),
      api('/api/health')
    ]);
    const sys = await sysRes.json();
    const health = await healthRes.json();

    const memUsedMB = health.memory?.used || Math.round((sys.memory?.heapUsed || 0) / 1024 / 1024);
    const memTotalMB = health.memory?.total || Math.round((sys.memory?.heapTotal || 0) / 1024 / 1024);
    const memPercent = memTotalMB > 0 ? Math.round((memUsedMB / memTotalMB) * 100) : 0;
    const sysMemUsed = (health.memory?.system || 0) - (health.memory?.free || 0);
    const sysMemTotal = health.memory?.system || 0;
    const sysMemPercent = sysMemTotal > 0 ? Math.round((sysMemUsed / sysMemTotal) * 100) : 0;

    target.innerHTML = `
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Version</span>
          <span class="info-value">${escapeHtml(sys.version || '1.0.0')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Node.js</span>
          <span class="info-value">${escapeHtml(sys.node_version || '-')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Platform</span>
          <span class="info-value">${escapeHtml(sys.platform || '-')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Uptime</span>
          <span class="info-value">${formatUptime(Math.floor(sys.uptime || health.uptime || 0))}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Database</span>
          <span class="info-value">${escapeHtml(sys.database?.type || '-')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">DB Status</span>
          <span class="info-value">${health.database?.connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      <div class="resource-bars" style="margin-top: 14px;">
        <div class="resource-bar">
          <div class="resource-header">
            <span>Process Memory</span>
            <span>${memUsedMB} / ${memTotalMB} MB</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${memPercent}%"></div>
          </div>
        </div>
        <div class="resource-bar">
          <div class="resource-header">
            <span>System Memory</span>
            <span>${sysMemUsed} / ${sysMemTotal} MB</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${sysMemPercent}%"></div>
          </div>
        </div>
      </div>
    `;
  } catch {
    target.innerHTML = `<div class="error-state">Failed to load system info</div>`;
  }
}

async function loadNodesStatus() {
  const target = document.getElementById('nodes-status');
  if (!target) return;

  try {
    const res = await api('/api/status/nodes');
    const data = await res.json();
    const nodes = data.nodes || [];

    if (nodes.length === 0) {
      target.innerHTML = `
        <div class="status-grid">
          <div class="status-item info">
            ${icons.info}
            No nodes configured
          </div>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="status-grid">
        ${nodes.map(node => {
          const statusClass = node.status === 'online' ? 'success' : 'danger';
          const statusIcon = node.status === 'online' ? 'check_circle' : 'error';
          const memPercent = node.memory?.total > 0
            ? Math.round((node.memory.allocated / node.memory.total) * 100)
            : 0;
          return `
            <div class="status-item ${statusClass}" style="flex-direction: column; align-items: flex-start; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                ${icons[statusIcon] || ""}
                <span style="font-weight: 600; flex: 1;">${escapeHtml(node.name)}</span>
                <span style="font-size: 11px; opacity: 0.8;">${node.servers || 0} servers</span>
              </div>
              <div style="width: 100%; display: flex; gap: 12px; font-size: 11px; opacity: 0.8; padding-left: 26px;">
                <span>Mem: ${memPercent}% allocated</span>
                <span>Location: ${escapeHtml(node.location || '-')}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch {
    target.innerHTML = `<div class="error-state">Failed to load node status</div>`;
  }
}

async function loadRecentActivity() {
  const target = document.getElementById('recent-activity');
  if (!target) return;

  try {
    const res = await api('/api/activity-logs?per_page=6');
    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      target.innerHTML = `
        <div class="activity-list">
          <div class="activity-item">
            ${icons.info}
            <div class="activity-content">
              <span class="activity-title">No recent activity</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="activity-list">
        ${logs.map(log => `
          <div class="activity-item">
            ${icons[getActivityIcon(log.action)] || ""}
            <div class="activity-content">
              <span class="activity-title">${escapeHtml(log.username || 'Unknown')} — ${escapeHtml(log.action || '-')}</span>
              <span class="activity-time">${log.timestamp ? timeAgo(log.timestamp) : '-'}${log.ip ? ` · ${escapeHtml(log.ip)}` : ''}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch {
    target.innerHTML = `<div class="error-state">Failed to load activity</div>`;
  }
}

async function loadRecentAudit() {
  const target = document.getElementById('recent-audit');
  if (!target) return;

  try {
    const res = await api('/api/admin/audit-logs?per_page=6');
    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      target.innerHTML = `
        <div class="activity-list">
          <div class="activity-item">
            ${icons.info}
            <div class="activity-content">
              <span class="activity-title">No audit logs</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="activity-list">
        ${logs.map(log => `
          <div class="activity-item">
            ${icons[getAuditIcon(log.action)] || ""}
            <div class="activity-content">
              <span class="activity-title">${escapeHtml(log.adminUsername || 'Unknown')} — ${escapeHtml(log.action || '-')}</span>
              <span class="activity-time">${log.timestamp ? timeAgo(log.timestamp) : '-'}${log.targetType ? ` · ${escapeHtml(log.targetType)}` : ''}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch {
    target.innerHTML = `<div class="error-state">Failed to load audit logs</div>`;
  }
}
