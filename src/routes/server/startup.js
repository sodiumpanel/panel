let currentServerId = null;
let serverData = null;
let eggData = null;

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
        <div class="form-group">
          <input type="text" name="docker_image" value="${escapeHtml(server.docker_image || egg?.docker_image || '')}" placeholder="ghcr.io/image:tag" />
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
  const dockerImage = document.querySelector('input[name="docker_image"]').value;
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
  document.querySelector('input[name="docker_image"]').value = eggData.docker_image || '';
  
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
