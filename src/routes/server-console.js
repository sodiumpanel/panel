import { escapeHtml } from '../utils/security.js';

let pollInterval = null;
let consoleSocket = null;

export function renderServerConsole(serverId) {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="server-console-page">
      <div class="page-header">
        <a href="/servers" class="btn btn-ghost"><span class="material-icons-outlined">arrow_back</span> Back</a>
        <h1 id="server-name">Loading...</h1>
      </div>
      
      <div class="console-layout">
        <div class="console-main">
          <div class="card console-card">
            <div class="console-header">
              <h3>Console</h3>
              <div class="power-buttons">
                <button class="btn btn-success btn-sm" id="btn-start">Start</button>
                <button class="btn btn-warning btn-sm" id="btn-restart">Restart</button>
                <button class="btn btn-danger btn-sm" id="btn-stop">Stop</button>
                <button class="btn btn-danger btn-sm" id="btn-kill">Kill</button>
              </div>
            </div>
            <div class="console-output" id="console-output">
              <div class="console-placeholder">Connecting to server...</div>
            </div>
            <div class="console-input">
              <input type="text" id="command-input" placeholder="Type a command..." />
              <button class="btn btn-primary" id="send-command">Send</button>
            </div>
          </div>
        </div>
        
        <div class="console-sidebar">
          <div class="card">
            <h3>Resources</h3>
            <div id="resources-display">
              <div class="resource-item">
                <span class="label">Status</span>
                <span class="value" id="res-status">--</span>
              </div>
              <div class="resource-item">
                <span class="label">CPU</span>
                <span class="value" id="res-cpu">--</span>
              </div>
              <div class="resource-item">
                <span class="label">Memory</span>
                <span class="value" id="res-memory">--</span>
              </div>
              <div class="resource-item">
                <span class="label">Disk</span>
                <span class="value" id="res-disk">--</span>
              </div>
              <div class="resource-item">
                <span class="label">Network ↑</span>
                <span class="value" id="res-net-tx">--</span>
              </div>
              <div class="resource-item">
                <span class="label">Network ↓</span>
                <span class="value" id="res-net-rx">--</span>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>Server Info</h3>
            <div id="server-info">
              <div class="info-item">
                <span class="label">Address</span>
                <span class="value" id="info-address">--</span>
              </div>
              <div class="info-item">
                <span class="label">Node</span>
                <span class="value" id="info-node">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadServerDetails(serverId);
  connectWebSocket(serverId);
  
  document.getElementById('btn-start').onclick = () => powerAction(serverId, 'start');
  document.getElementById('btn-restart').onclick = () => powerAction(serverId, 'restart');
  document.getElementById('btn-stop').onclick = () => powerAction(serverId, 'stop');
  document.getElementById('btn-kill').onclick = () => powerAction(serverId, 'kill');
  
  document.getElementById('send-command').onclick = () => sendCommand(serverId);
  document.getElementById('command-input').onkeypress = (e) => {
    if (e.key === 'Enter') sendCommand(serverId);
  };
}

async function loadServerDetails(serverId) {
  const username = localStorage.getItem('username');
  
  try {
    const res = await fetch(`/api/servers/${serverId}?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    
    if (data.error) {
      document.getElementById('server-name').textContent = 'Error';
      return;
    }
    
    const server = data.server;
    
    document.getElementById('server-name').textContent = server.name;
    document.getElementById('info-address').textContent = `${server.allocation?.ip}:${server.allocation?.port}`;
    document.getElementById('info-node').textContent = server.node_id?.substring(0, 8) || '--';
  } catch (e) {
    console.error('Failed to load server:', e);
  }
}

async function connectWebSocket(serverId) {
  const username = localStorage.getItem('username');
  
  try {
    const res = await fetch(`/api/servers/${serverId}/websocket?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    
    if (data.error) {
      appendConsole(`[ERROR] ${data.error}`);
      return;
    }
    
    const { token, socket } = data.data;
    
    appendConsole('[SYSTEM] Connecting to console...');
    
    consoleSocket = new WebSocket(socket);
    
    consoleSocket.onopen = () => {
      appendConsole('[SYSTEM] WebSocket connected, authenticating...');
      consoleSocket.send(JSON.stringify({
        event: 'auth',
        args: [token]
      }));
    };
    
    consoleSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSocketMessage(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    consoleSocket.onclose = () => {
      appendConsole('[SYSTEM] Connection closed');
      setTimeout(() => connectWebSocket(serverId), 5000);
    };
    
    consoleSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      appendConsole('[ERROR] WebSocket connection failed');
    };
    
  } catch (e) {
    console.error('Failed to connect WebSocket:', e);
    appendConsole('[ERROR] Failed to connect to console');
  }
}

function handleSocketMessage(message) {
  const { event, args } = message;
  
  switch (event) {
    case 'auth success':
      appendConsole('[SYSTEM] Authenticated successfully');
      consoleSocket.send(JSON.stringify({ event: 'send logs', args: [null] }));
      consoleSocket.send(JSON.stringify({ event: 'send stats', args: [null] }));
      break;
      
    case 'token expiring':
    case 'token expired':
      appendConsole('[SYSTEM] Token expired, reconnecting...');
      break;
      
    case 'console output':
      if (args && args[0]) {
        const lines = args[0].split('\n');
        lines.forEach(line => {
          if (line.trim()) appendConsole(line);
        });
      }
      break;
      
    case 'status':
      if (args && args[0]) {
        const status = args[0];
        const statusEl = document.getElementById('res-status');
        if (statusEl) {
          statusEl.textContent = status;
          statusEl.className = `value status-${status}`;
        }
      }
      break;
      
    case 'stats':
      if (args && args[0]) {
        updateResources(args[0]);
      }
      break;
      
    case 'install output':
      if (args && args[0]) {
        appendConsole(`[INSTALL] ${args[0]}`);
      }
      break;
      
    case 'install started':
      appendConsole('[SYSTEM] Installation started...');
      break;
      
    case 'install completed':
      appendConsole('[SYSTEM] Installation completed');
      break;
      
    case 'daemon error':
      if (args && args[0]) {
        appendConsole(`[DAEMON ERROR] ${args[0]}`);
      }
      break;
      
    default:
      console.log('Unhandled WebSocket event:', event, args);
  }
}

function updateResources(stats) {
  const cpuEl = document.getElementById('res-cpu');
  const memEl = document.getElementById('res-memory');
  const diskEl = document.getElementById('res-disk');
  const netTxEl = document.getElementById('res-net-tx');
  const netRxEl = document.getElementById('res-net-rx');
  
  if (cpuEl) cpuEl.textContent = `${(stats.cpu_absolute || 0).toFixed(1)}%`;
  if (memEl) memEl.textContent = formatBytes(stats.memory_bytes || 0);
  if (diskEl) diskEl.textContent = formatBytes(stats.disk_bytes || 0);
  if (netTxEl) netTxEl.textContent = formatBytes(stats.network?.tx_bytes || 0);
  if (netRxEl) netRxEl.textContent = formatBytes(stats.network?.rx_bytes || 0);
}

async function powerAction(serverId, action) {
  const username = localStorage.getItem('username');
  
  try {
    const res = await fetch(`/api/servers/${serverId}/power`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, action })
    });
    
    if (res.ok) {
      appendConsole(`[SYSTEM] Power action: ${action}`);
      loadServerDetails(serverId);
    } else {
      const data = await res.json();
      appendConsole(`[ERROR] ${data.error}`);
    }
  } catch (e) {
    appendConsole(`[ERROR] Failed to execute power action`);
  }
}

async function sendCommand(serverId) {
  const input = document.getElementById('command-input');
  const command = input.value.trim();
  if (!command) return;
  
  appendConsole(`> ${command}`);
  input.value = '';
  
  if (consoleSocket && consoleSocket.readyState === WebSocket.OPEN) {
    consoleSocket.send(JSON.stringify({
      event: 'send command',
      args: [command]
    }));
  } else {
    const username = localStorage.getItem('username');
    try {
      const res = await fetch(`/api/servers/${serverId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, command })
      });
      
      if (!res.ok) {
        const data = await res.json();
        appendConsole(`[ERROR] ${data.error}`);
      }
    } catch (e) {
      appendConsole(`[ERROR] Failed to send command`);
    }
  }
}

function appendConsole(text) {
  const output = document.getElementById('console-output');
  const placeholder = output.querySelector('.console-placeholder');
  if (placeholder) placeholder.remove();
  
  const line = document.createElement('div');
  line.className = 'console-line';
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function cleanupServerConsole() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (consoleSocket) {
    consoleSocket.close();
    consoleSocket = null;
  }
}
