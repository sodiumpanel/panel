import { escapeHtml } from '../utils/security.js';
import { icons, icon } from '../utils/icons.js';

let pollInterval = null;
let uptimeData = {};

export function renderStatus() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="status-page">
      <header class="sp-header">
        <div class="sp-header-left">
          <h1>System Status</h1>
          <div class="sp-last-updated">
            ${icon('schedule', 14)}
            <span id="sp-time">Checking...</span>
          </div>
        </div>
        <div class="sp-badge" id="sp-badge">
          <span class="sp-badge-dot"></span>
          <span id="sp-badge-text">Checking</span>
        </div>
      </header>

      <div class="sp-banner" id="sp-banner">
        <div class="sp-banner-icon" id="sp-banner-icon">${icon('pulse', 22)}</div>
        <div class="sp-banner-content">
          <span class="sp-banner-title" id="sp-banner-title">Checking system status...</span>
          <span class="sp-banner-sub" id="sp-banner-sub">Connecting to monitoring services</span>
        </div>
      </div>

      <div class="sp-metrics" id="sp-overview"></div>

      <div class="sp-section">
        <div class="sp-section-head">
          <h2>Infrastructure</h2>
          <span class="sp-section-count" id="sp-node-count"></span>
        </div>
        <div class="sp-grid" id="sp-services">
          <div class="sp-loading"><span class="sp-spinner"></span></div>
        </div>
      </div>

      <div class="sp-section">
        <div class="sp-section-head">
          <h2>Uptime</h2>
          <span class="sp-section-hint">90 days</span>
        </div>
        <div class="sp-uptime-global" id="sp-uptime-global"></div>
      </div>

      <div class="sp-section">
        <div class="sp-section-head">
          <h2>Incidents</h2>
        </div>
        <div id="sp-incidents">
          <div class="sp-incidents-empty">
            ${icon('check_circle', 20)}
            <span>No incidents in the last 90 days</span>
          </div>
        </div>
      </div>

      <footer class="sp-footer">
        <span>Updated every 30s</span>
      </footer>
    </div>
  `;

  loadStatus();
  pollInterval = setInterval(loadStatus, 30000);
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
  const indices = [0, 44, 89].filter(i => i < history.length);
  const labels = indices.map(i => {
    const d = new Date(history[i].date + 'T00:00:00');
    return `<span>${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>`;
  });
  return `<div class="sp-bars-legend">${labels.join('')}</div>`;
}

function calcUptime(history) {
  const withData = history.filter(h => h.status !== 'unknown');
  if (withData.length === 0) return null;
  const up = withData.filter(h => h.status === 'online' || h.status === 'degraded').length;
  return ((up / withData.length) * 100).toFixed(2);
}

function fmtMB(mb) {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb + ' MB';
}

async function loadStatus() {
  const container = document.getElementById('sp-services');

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

    const badge = document.getElementById('sp-badge');
    const badgeText = document.getElementById('sp-badge-text');
    const bannerTitle = document.getElementById('sp-banner-title');
    const bannerSub = document.getElementById('sp-banner-sub');
    const banner = document.getElementById('sp-banner');
    const bannerIcon = document.getElementById('sp-banner-icon');

    if (online === total && total > 0) {
      badge.className = 'sp-badge online';
      badgeText.textContent = 'Operational';
      banner.className = 'sp-banner online';
      bannerIcon.innerHTML = icon('check_circle', 22);
      bannerTitle.textContent = 'All Systems Operational';
      bannerSub.textContent = `All ${total} services running normally`;
    } else if (online > 0) {
      badge.className = 'sp-badge partial';
      badgeText.textContent = 'Degraded';
      banner.className = 'sp-banner partial';
      bannerIcon.innerHTML = icon('warning', 22);
      bannerTitle.textContent = 'Partial System Outage';
      bannerSub.textContent = `${total - online} of ${total} services affected`;
    } else if (total > 0) {
      badge.className = 'sp-badge offline';
      badgeText.textContent = 'Outage';
      banner.className = 'sp-banner offline';
      bannerIcon.innerHTML = icon('error', 22);
      bannerTitle.textContent = 'Major System Outage';
      bannerSub.textContent = 'All services are currently down';
    } else {
      badge.className = 'sp-badge';
      badgeText.textContent = 'No Data';
      banner.className = 'sp-banner';
      bannerIcon.innerHTML = icon('info', 22);
      bannerTitle.textContent = 'No Services Configured';
      bannerSub.textContent = 'No monitored services found';
    }

    const overview = document.getElementById('sp-overview');
    const totalServers = data.nodes.reduce((s, n) => s + n.servers, 0);
    const totalAllocMem = data.nodes.reduce((s, n) => s + n.memory.allocated, 0);
    const totalMem = data.nodes.reduce((s, n) => s + n.memory.total, 0);
    const memPercent = totalMem > 0 ? ((totalAllocMem / totalMem) * 100).toFixed(0) : '0';
    const totalAllocDisk = data.nodes.reduce((s, n) => s + n.disk.allocated, 0);
    const totalDisk = data.nodes.reduce((s, n) => s + n.disk.total, 0);
    const diskPercent = totalDisk > 0 ? ((totalAllocDisk / totalDisk) * 100).toFixed(0) : '0';

    overview.innerHTML = `
      <div class="sp-metric-card">
        <div class="sp-metric-icon">${icon('dns', 18)}</div>
        <div class="sp-metric-body">
          <span class="sp-metric-val">${online}<small>/${total}</small></span>
          <span class="sp-metric-lbl">Nodes Online</span>
        </div>
      </div>
      <div class="sp-metric-card">
        <div class="sp-metric-icon">${icon('storage', 18)}</div>
        <div class="sp-metric-body">
          <span class="sp-metric-val">${totalServers}</span>
          <span class="sp-metric-lbl">Active Servers</span>
        </div>
      </div>
      <div class="sp-metric-card">
        <div class="sp-metric-icon">${icon('memory', 18)}</div>
        <div class="sp-metric-body">
          <span class="sp-metric-val">${memPercent}<small>%</small></span>
          <span class="sp-metric-lbl">Memory · ${fmtMB(totalAllocMem)} / ${fmtMB(totalMem)}</span>
        </div>
      </div>
      <div class="sp-metric-card">
        <div class="sp-metric-icon">${icon('data_usage', 18)}</div>
        <div class="sp-metric-body">
          <span class="sp-metric-val">${diskPercent}<small>%</small></span>
          <span class="sp-metric-lbl">Disk · ${fmtMB(totalAllocDisk)} / ${fmtMB(totalDisk)}</span>
        </div>
      </div>
    `;

    document.getElementById('sp-time').textContent = new Date().toLocaleTimeString();

    const countEl = document.getElementById('sp-node-count');
    if (countEl) countEl.textContent = `${total} node${total !== 1 ? 's' : ''}`;

    if (data.nodes.length === 0) {
      container.innerHTML = `
        <div class="sp-empty-state">
          ${icon('cloud_off', 28)}
          <p>No services configured</p>
        </div>
      `;
    } else {
      container.innerHTML = data.nodes.map(node => {
        const history = uptimeData[node.id] || generateEmptyHistory();
        const uptime = calcUptime(history);
        const uptimeDisplay = uptime !== null ? `${uptime}%` : '—';
        const isUp = node.status === 'online';

        return `
          <div class="sp-node ${node.status}">
            <div class="sp-node-header">
              <div class="sp-node-name">
                <span class="sp-node-dot ${node.status}"></span>
                <span>${escapeHtml(node.name)}</span>
              </div>
              <span class="sp-node-status ${node.status}">${isUp ? 'Operational' : 'Down'}</span>
            </div>
            <div class="sp-node-bars">
              <div class="sp-bars">${renderUptimeBars(history)}</div>
              ${renderTimeScale(history)}
            </div>
            <div class="sp-node-meta">
              <span class="sp-node-tag">${icon('location_on', 12)} ${escapeHtml(node.location || 'Unknown')}</span>
              <span class="sp-node-tag">${icon('arrow_upward', 12)} ${uptimeDisplay} uptime</span>
              <span class="sp-node-tag">${icon('memory', 12)} ${fmtMB(node.memory.allocated)}/${fmtMB(node.memory.total)}</span>
              <span class="sp-node-tag">${icon('dns', 12)} ${node.servers} server${node.servers !== 1 ? 's' : ''}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    const globalContainer = document.getElementById('sp-uptime-global');
    if (globalContainer && data.nodes.length > 0) {
      const allHistories = data.nodes.map(n => uptimeData[n.id] || generateEmptyHistory());
      const merged = mergeHistories(allHistories);
      const globalUptime = calcUptime(merged);
      globalContainer.innerHTML = `
        <div class="sp-uptime-card">
          <div class="sp-uptime-head">
            <span class="sp-uptime-label">Overall Uptime</span>
            <span class="sp-uptime-pct">${globalUptime !== null ? globalUptime + '%' : '—'}</span>
          </div>
          <div class="sp-bars sp-bars-lg">${renderUptimeBars(merged)}</div>
          ${renderTimeScale(merged)}
        </div>
      `;
    }

    renderIncidents(realIncidents);
  } catch {
    container.innerHTML = `
      <div class="sp-empty-state error">
        ${icon('error_outline', 28)}
        <p>Unable to reach monitoring services</p>
        <small>Retrying automatically...</small>
      </div>
    `;
  }
}

function mergeHistories(histories) {
  if (histories.length === 0) return generateEmptyHistory();
  const base = histories[0];
  return base.map((entry, i) => {
    const statuses = histories.map(h => (h[i] || entry).status);
    let merged = 'unknown';
    if (statuses.some(s => s === 'offline')) merged = 'offline';
    else if (statuses.some(s => s === 'degraded')) merged = 'degraded';
    else if (statuses.some(s => s === 'online')) merged = 'online';
    return { ...entry, status: merged };
  });
}

function generateEmptyHistory() {
  const history = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    history.push({ date: d.toISOString().slice(0, 10), status: 'unknown', checks: 0, online: 0 });
  }
  return history;
}

function renderIncidents(incidents) {
  const el = document.getElementById('sp-incidents');
  if (!el) return;

  if (!incidents || incidents.length === 0) {
    el.innerHTML = `
      <div class="sp-incidents-empty">
        ${icon('check_circle', 20)}
        <span>No incidents in the last 90 days</span>
      </div>
    `;
    return;
  }

  const grouped = {};
  for (const inc of incidents) {
    const date = inc.created_at.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(inc);
  }

  const impactCls = { none: 'info', minor: 'warn', major: 'err', critical: 'crit' };
  const statusText = { investigating: 'Investigating', identified: 'Identified', monitoring: 'Monitoring', resolved: 'Resolved' };

  el.innerHTML = `<div class="sp-incidents-list">${Object.entries(grouped).map(([date, incs]) => `
    <div class="sp-inc-group">
      <div class="sp-inc-date">${formatDateFull(date)}</div>
      ${incs.map(inc => {
        const cls = impactCls[inc.impact] || 'warn';
        const latestUpdate = (inc.updates || []).slice(-1)[0];
        return `
          <div class="sp-inc ${cls}">
            <div class="sp-inc-dot"></div>
            <div class="sp-inc-body">
              <div class="sp-inc-top">
                <span class="sp-inc-title">${escapeHtml(inc.title)}</span>
                <span class="sp-inc-status ${inc.status}">${statusText[inc.status] || inc.status}</span>
              </div>
              ${inc.description ? `<p class="sp-inc-desc">${escapeHtml(inc.description)}</p>` : ''}
              ${latestUpdate && latestUpdate.message !== inc.description ? `
                <p class="sp-inc-update">
                  ${escapeHtml(latestUpdate.message)}
                  <time>${new Date(latestUpdate.created_at).toLocaleString()}</time>
                </p>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `).join('')}</div>`;
}

export function cleanupStatus() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
