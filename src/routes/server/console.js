let consoleSocket = null;
let statusCallback = null;
let resourcesCallback = null;
let serverIdGetter = null;

export function setConsoleCallbacks(onStatus, onResources, getServerId) {
  statusCallback = onStatus;
  resourcesCallback = onResources;
  serverIdGetter = getServerId;
}

export function renderConsoleTab() {
  return `
    <div class="console-tab">
      <div class="card console-card">
        <div class="console-output" id="console-output">
          <div class="console-placeholder">Connecting to server...</div>
        </div>
        <div class="console-input">
          <input type="text" id="command-input" placeholder="Type a command..." />
          <button class="btn btn-primary" id="send-command">
            <span class="material-icons-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initConsoleTab(serverId) {
  connectWebSocket(serverId);
  
  document.getElementById('send-command').onclick = () => sendCommand(serverId);
  document.getElementById('command-input').onkeypress = (e) => {
    if (e.key === 'Enter') sendCommand(serverId);
  };
}

async function connectWebSocket(serverId) {
  const username = localStorage.getItem('username');
  
  appendConsole('[SYSTEM] Connecting to console...');
  
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/console?server=${serverId}&username=${encodeURIComponent(username)}`;
  
  consoleSocket = new WebSocket(wsUrl);
  
  consoleSocket.onopen = () => {
    appendConsole('[SYSTEM] Connected to console');
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
    if (serverIdGetter && serverIdGetter() === serverId) {
      appendConsole('[SYSTEM] Connection closed, reconnecting...');
      setTimeout(() => connectWebSocket(serverId), 5000);
    }
  };
  
  consoleSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    appendConsole('[ERROR] WebSocket connection failed');
  };
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
      if (args && args[0] && statusCallback) {
        statusCallback(args[0]);
      }
      break;
      
    case 'stats':
      if (args && args[0] && resourcesCallback) {
        resourcesCallback(args[0]);
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
  if (!output) return;
  
  const placeholder = output.querySelector('.console-placeholder');
  if (placeholder) placeholder.remove();
  
  const line = document.createElement('div');
  line.className = 'console-line';
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

export function cleanupConsoleTab() {
  if (consoleSocket) {
    consoleSocket.close();
    consoleSocket = null;
  }
}
