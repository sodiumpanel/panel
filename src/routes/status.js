import { escapeHtml } from '../utils/security.js';

let pollInterval = null;

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
            <span class="material-icons-outlined spinning" id="sp-sync" style="display:none;font-size:14px">sync</span>
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
            <span class="material-icons-outlined">check_circle</span>
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

function getUptimeBars(nodeId, currentStatus) {
  const key = `sp_uptime_${nodeId}`;
  let history = [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) history = JSON.parse(stored);
  } catch {}
  
  const today = new Date().toISOString().slice(0, 10);
  
  if (history.length === 0) {
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      history.push({ date: dateStr, status: i === 0 ? currentStatus : 'online' });
    }
  } else {
    const lastDate = history[history.length - 1]?.date;
    if (lastDate !== today) {
      history.push({ date: today, status: currentStatus });
    } else {
      history[history.length - 1].status = currentStatus;
    }
    history = history.slice(-90);
  }
  
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch {}
  
  return history;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderUptimeBars(history) {
  return history.map(h => {
    const cls = h.status === 'online' ? 'up' : 'down';
    return `<div class="sp-bar ${cls}" title="${formatDate(h.date)}: ${h.status === 'online' ? 'Operational' : 'Outage'}"></div>`;
  }).join('');
}

function calcUptime(history) {
  const up = history.filter(h => h.status === 'online').length;
  return ((up / history.length) * 100).toFixed(2);
}

async function loadStatus() {
  const container = document.getElementById('sp-services');
  const syncIcon = document.getElementById('sp-sync');
  
  if (syncIcon) syncIcon.style.display = 'inline-block';
  
  try {
    const res = await fetch('/api/status/nodes');
    const data = await res.json();
    
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
          <span class="material-icons-outlined">cloud_off</span>
          <p>No services to display</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.nodes.map(node => {
      const history = getUptimeBars(node.id, node.status);
      const uptime = calcUptime(history);
      
      return `
        <div class="sp-service">
          <div class="sp-service-top">
            <div class="sp-service-info">
              <span class="sp-dot ${node.status}"></span>
              <span class="sp-service-name">${escapeHtml(node.name)}</span>
              <span class="sp-service-loc">${escapeHtml(node.location || 'Unknown')}</span>
            </div>
            <div class="sp-service-right">
              <span class="sp-uptime-pct">${uptime}%</span>
              <span class="sp-status-tag ${node.status}">${node.status === 'online' ? 'Operational' : 'Down'}</span>
            </div>
          </div>
          <div class="sp-uptime-track">
            <div class="sp-bars">${renderUptimeBars(history)}</div>
            <div class="sp-bars-legend">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
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
  } catch {
    container.innerHTML = `
      <div class="sp-empty error">
        <span class="material-icons-outlined">error_outline</span>
        <p>Unable to reach monitoring services. Retrying...</p>
      </div>
    `;
  } finally {
    if (syncIcon) {
      setTimeout(() => { syncIcon.style.display = 'none'; }, 500);
    }
  }
}

export function cleanupStatus() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
