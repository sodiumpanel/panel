let currentServerId = null;
let serverData = null;
let eggData = null;

const ALLOWED_DOCKER_IMAGES = [
  { value: 'ghcr.io/pterodactyl/yolks:java_21', label: 'Java 21 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:java_17', label: 'Java 17 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:java_16', label: 'Java 16 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:java_11', label: 'Java 11 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:java_8', label: 'Java 8 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:nodejs_20', label: 'Node.js 20 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:nodejs_18', label: 'Node.js 18 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:nodejs_16', label: 'Node.js 16 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:python_3.12', label: 'Python 3.12 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:python_3.11', label: 'Python 3.11 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:python_3.10', label: 'Python 3.10 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:golang_1.21', label: 'Go 1.21 (Yolks)' },
  { value: 'ghcr.io/pterodactyl/yolks:rust_latest', label: 'Rust Latest (Yolks)' },
  { value: 'ghcr.io/pterodactyl/games:source', label: 'Source Engine (Games)' },
  { value: 'ghcr.io/pterodactyl/games:rust', label: 'Rust Game (Games)' },
  { value: 'ghcr.io/pterodactyl/games:arma3', label: 'Arma 3 (Games)' },
  { value: 'ghcr.io/pterodactyl/installers:debian', label: 'Debian (Installers)' },
  { value: 'ghcr.io/pterodactyl/installers:alpine', label: 'Alpine (Installers)' },
];

export function renderStartupTab() {
  return `
    <div class="startup-tab">
      <div class="card">
        <div class="card-header">
          <h3>Startup Configuration</h3>
        </div>
        <div class="startup-content" id="startup-content">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;
}

export async function initStartupTab(serverId) {
  currentServerId = serverId;
  await loadStartupData(serverId);
}

async function loadStartupData(serverId) {
  const username = localStorage.getItem('username');
  const content = document.getElementById('startup-content');
  
  try {
    const [serverRes, startupRes] = await Promise.all([
      fetch(`/api/servers/${serverId}?username=${encodeURIComponent(username)}`),
      fetch(`/api/servers/${serverId}/startup?username=${encodeURIComponent(username)}`)
    ]);
    
    const serverJson = await serverRes.json();
    const startupJson = await startupRes.json();
    
    if (serverJson.error || startupJson.error) {
      content.innerHTML = `<div class="error">${serverJson.error || startupJson.error}</div>`;
      return;
    }
    
    serverData = serverJson.server;
    eggData = startupJson.egg;
    
    renderStartupForm(serverData, eggData);
  } catch (e) {
    console.error('Failed to load startup data:', e);
    content.innerHTML = '<div class="error">Failed to load startup configuration</div>';
  }
}

function renderStartupForm(server, egg) {
  const content = document.getElementById('startup-content');
  const variables = egg?.variables || [];
  
  content.innerHTML = `
    <form id="startup-form" class="startup-form">
      <div class="form-section">
        <h4>Startup Command</h4>
        <p class="form-hint">This command is executed when the server starts. Use {{VARIABLE}} syntax for variables.</p>
        <div class="form-group">
          <textarea name="startup" id="startup-command" rows="3" spellcheck="false">${escapeHtml(server.startup || egg?.startup || '')}</textarea>
        </div>
        <div class="startup-preview">
          <span class="preview-label">Preview:</span>
          <code id="startup-preview">${escapeHtml(parseStartupCommand(server.startup || egg?.startup || '', server.environment || {}))}</code>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Docker Image</h4>
        <p class="form-hint">Select a Docker image from the approved list.</p>
        <div class="form-group">
          <select name="docker_image" class="select-input">
            ${ALLOWED_DOCKER_IMAGES.map(img => `
              <option value="${escapeHtml(img.value)}" ${(server.docker_image || egg?.docker_image) === img.value ? 'selected' : ''}>
                ${escapeHtml(img.label)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Environment Variables</h4>
        <p class="form-hint">Configure the variables used by the egg for this server.</p>
        
        <div class="variables-list">
          ${variables.length === 0 ? '<div class="empty">No variables defined for this egg</div>' : ''}
          ${variables.map(v => `
            <div class="variable-item">
              <div class="variable-header">
                <label for="var-${v.env_variable}">${escapeHtml(v.name)}</label>
                <code class="variable-key">${escapeHtml(v.env_variable)}</code>
              </div>
              <p class="variable-description">${escapeHtml(v.description || '')}</p>
              <input 
                type="text" 
                id="var-${v.env_variable}"
                name="env_${v.env_variable}" 
                value="${escapeHtml(server.environment?.[v.env_variable] ?? v.default_value ?? '')}"
                placeholder="${escapeHtml(v.default_value || '')}"
                data-var="${v.env_variable}"
              />
              ${v.rules ? `<span class="variable-rules">${escapeHtml(v.rules)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="save-startup">
          <span class="material-icons-outlined">save</span>
          Save Changes
        </button>
        <button type="button" class="btn btn-ghost" id="reset-startup">
          <span class="material-icons-outlined">restart_alt</span>
          Reset to Egg Defaults
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
    previewEl.textContent = parseStartupCommand(cmd, env);
  };
  
  startupInput.addEventListener('input', updatePreview);
  
  document.querySelectorAll('.variable-item input').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
  
  form.onsubmit = (e) => {
    e.preventDefault();
    saveStartup();
  };
  
  document.getElementById('reset-startup').onclick = () => {
    if (confirm('Reset startup configuration to egg defaults?')) {
      resetToDefaults();
    }
  };
}

function getEnvironmentFromForm() {
  const env = {};
  document.querySelectorAll('.variable-item input[data-var]').forEach(input => {
    env[input.dataset.var] = input.value;
  });
  return env;
}

function parseStartupCommand(command, environment) {
  if (!command) return '';
  
  let parsed = command;
  
  for (const [key, value] of Object.entries(environment)) {
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
  const username = localStorage.getItem('username');
  const saveBtn = document.getElementById('save-startup');
  
  const startup = document.getElementById('startup-command').value;
  const dockerImage = document.querySelector('select[name="docker_image"]').value;
  const environment = getEnvironmentFromForm();
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Saving...';
  
  try {
    const res = await fetch(`/api/servers/${currentServerId}/startup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        startup,
        docker_image: dockerImage,
        environment
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      saveBtn.innerHTML = '<span class="material-icons-outlined">check</span> Saved';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="material-icons-outlined">save</span> Save Changes';
      }, 1500);
    } else {
      alert(data.error || 'Failed to save');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons-outlined">save</span> Save Changes';
    }
  } catch (e) {
    console.error('Failed to save startup:', e);
    alert('Failed to save startup configuration');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="material-icons-outlined">save</span> Save Changes';
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
    parseStartupCommand(eggData.startup || '', env);
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function cleanupStartupTab() {
  currentServerId = null;
  serverData = null;
  eggData = null;
}
