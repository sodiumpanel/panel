import { escapeHtml } from '../utils/security.js';

let pollInterval = null;
let uptimeData = {};

export function renderStatus() {
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

function formatDate(dateStr) {
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
              <span class="sp-service-name">${escapeHtml(node.name)}</span>
              <span class="sp-service-loc">${escapeHtml(node.location || 'Unknown')}</span>
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
                <strong>${escapeHtml(inc.title)}</strong>
                <small style="margin-left: 6px; text-transform: capitalize;">${inc.status}</small>
              </span>
              ${inc.resolved_at ? `<small style="color: var(--success); font-size: 11px;">Resolved</small>` : ''}
            </div>
            ${inc.description ? `<p style="margin: 0 0 0 26px; font-size: 12px; color: var(--text-secondary);">${escapeHtml(inc.description)}</p>` : ''}
            ${latestUpdate && latestUpdate.message !== inc.description ? `
              <p style="margin: 0 0 0 26px; font-size: 11px; color: var(--text-tertiary);">
                Latest: ${escapeHtml(latestUpdate.message)} <small>(${new Date(latestUpdate.created_at).toLocaleString()})</small>
              </p>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

export function cleanupStatus() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
