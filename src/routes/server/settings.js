import { api } from '../../utils/api.js';
import { icons, icon } from '../../utils/icons.js';
import * as toast from '../../utils/toast.js';
import { escapeHtml } from '../../utils/security.js';

let currentServerId = null;
let serverData = null;

export function renderSettingsTab() {
  return `
    <div class="settings-tab">
      <div class="settings-content">
        <div class="settings-section">
          <div class="section-header">
            ${icons.dns}
            <h3>Server Details</h3>
          </div>
          <div id="settings-details">
            <div class="loading-spinner"></div>
          </div>
        </div>
        
        <div class="settings-section danger-section">
          <div class="section-header">
            ${icons.warning}
            <h3>Danger Zone</h3>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Reinstall Server</span>
              <span class="setting-description">Delete all server files and reinstall from scratch</span>
            </div>
            <button class="btn btn-warning" id="btn-reinstall">
              ${icons.refresh}
              <span>Reinstall</span>
            </button>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Delete Server</span>
              <span class="setting-description">Permanently delete this server and all its data</span>
            </div>
            <button class="btn btn-danger" id="btn-delete">
              ${icons.delete_forever}
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initSettingsTab(serverId) {
  currentServerId = serverId;
  
  // Attach event listeners immediately (buttons exist from renderSettingsTab)
  const reinstallBtn = document.getElementById('btn-reinstall');
  const deleteBtn = document.getElementById('btn-delete');
  
  if (reinstallBtn) reinstallBtn.onclick = () => confirmReinstall();
  if (deleteBtn) deleteBtn.onclick = () => confirmDelete();
  
  // Load details async (will render the form when ready)
  await loadServerDetails(serverId);
}

async function loadServerDetails(serverId) {
  const content = document.getElementById('settings-details');
  if (!content) {
    console.error('Settings details container not found');
    return;
  }
  
  try {
    const res = await api(`/api/servers/${serverId}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      content.innerHTML = `<div class="error">${escapeHtml(errorData.error || 'Failed to load server')}</div>`;
      return;
    }
    
    const data = await res.json();
    
    if (!data.server) {
      content.innerHTML = '<div class="error">Invalid server response</div>';
      return;
    }
    
    serverData = data.server;
    renderDetailsForm(serverData);
  } catch (e) {
    console.error('Failed to load server details:', e);
    if (content) {
      content.innerHTML = '<div class="error">Failed to load server details</div>';
    }
  }
}

function renderDetailsForm(server) {
  const content = document.getElementById('settings-details');
  
  content.innerHTML = `
    <form id="details-form" class="settings-form">
      <div class="form-group">
        <label for="server-name-input">Server Name</label>
        <div class="input-wrapper">
          ${icons.badge}
          <input type="text" id="server-name-input" name="name" value="${escapeHtml(server.name)}" maxlength="50" required />
        </div>
      </div>
      
      <div class="form-group">
        <label for="server-description-input">Description</label>
        <div class="textarea-wrapper">
          <textarea id="server-description-input" name="description" rows="3" maxlength="200" placeholder="Optional server description...">${escapeHtml(server.description || '')}</textarea>
        </div>
      </div>
      
      <div class="form-info">
        <div class="info-row">
          <span class="info-label">Server ID</span>
          <code class="info-value">${escapeHtml(server.id)}</code>
        </div>
        <div class="info-row">
          <span class="info-label">Created</span>
          <span class="info-value">${formatDate(server.created_at)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Port</span>
          <span class="info-value">${server.allocation?.port || 25565}</span>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="save-details">
          ${icons.save}
          Save Changes
        </button>
      </div>
    </form>
  `;
  
  document.getElementById('details-form').onsubmit = (e) => {
    e.preventDefault();
    saveDetails();
  };
}

async function saveDetails() {
  const saveBtn = document.getElementById('save-details');
  
  const nameInput = document.getElementById('server-name-input');
  const descInput = document.getElementById('server-description-input');
  
  if (!nameInput || !descInput) {
    toast.error('Form elements not found');
    return;
  }
  
  const name = nameInput.value.trim();
  const description = descInput.value.trim();
  
  if (!name) {
    toast.warning('Server name is required');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '${icons.hourglass_empty} Saving...';
  
  try {
    const res = await api(`/api/servers/${currentServerId}/details`, {
      method: 'PUT',
      
      body: JSON.stringify({ name, description })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      toast.success('Server details saved');
      saveBtn.innerHTML = '${icons.check} Saved';
      
      // Update server data cache
      if (serverData) {
        serverData.name = name;
        serverData.description = description;
      }
      
      const serverNameEl = document.getElementById('server-name-header');
      if (serverNameEl) serverNameEl.textContent = name;
      
      const headerNameEl = document.querySelector('.server-title h1');
      if (headerNameEl) headerNameEl.textContent = name;
      
      // Also update the main page server name
      const mainServerName = document.getElementById('server-name');
      if (mainServerName) mainServerName.textContent = name;
      
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '${icons.save} Save Changes';
      }, 1500);
    } else {
      toast.error(data.error || 'Failed to save');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '${icons.save} Save Changes';
    }
  } catch (e) {
    console.error('Failed to save details:', e);
    toast.error('Failed to save server details');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '${icons.save} Save Changes';
  }
}

function confirmReinstall() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Reinstall Server</h3>
        <button class="modal-close">
          ${icons.close}
        </button>
      </div>
      <div class="warning-box">
        ${icons.warning}
        <p>This will delete all server files and reinstall the server from scratch. This action cannot be undone!</p>
      </div>
      <p style="margin-bottom: 12px; color: var(--text-secondary);">Type <strong style="color: var(--text-primary);">REINSTALL</strong> to confirm:</p>
      <input type="text" class="text-input" id="confirm-reinstall-input" placeholder="REINSTALL" style="width: 100%; text-align: center;" />
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-reinstall">Cancel</button>
        <button class="btn btn-warning" id="do-reinstall" disabled>Reinstall Server</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
  
  const input = document.getElementById('confirm-reinstall-input');
  const doBtn = document.getElementById('do-reinstall');
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  };
  
  input.oninput = () => {
    doBtn.disabled = input.value !== 'REINSTALL';
  };
  
  modal.querySelector('.modal-close').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  document.getElementById('cancel-reinstall').onclick = closeModal;
  
  doBtn.onclick = async () => {
    doBtn.disabled = true;
    doBtn.innerHTML = '${icons.hourglass_empty} Reinstalling...';
    await reinstallServer();
    closeModal();
  };
}

async function reinstallServer() {
  try {
    const res = await api(`/api/servers/${currentServerId}/reinstall`, {
      method: 'POST',
      
      body: JSON.stringify({})
    });
    
    const data = await res.json();
    
    if (res.ok) {
      toast.success('Server reinstall initiated');
      window.router.navigateTo('/servers');
    } else {
      toast.error(data.error || 'Failed to reinstall');
    }
  } catch (e) {
    console.error('Failed to reinstall server:', e);
    toast.error('Failed to reinstall server');
  }
}

function confirmDelete() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Delete Server</h3>
        <button class="modal-close">
          ${icons.close}
        </button>
      </div>
      <div class="warning-box danger">
        ${icons.error}
        <p>This will permanently delete the server and all its data. This action cannot be undone!</p>
      </div>
      <p style="margin-bottom: 12px; color: var(--text-secondary);">Type <strong style="color: var(--text-primary);">DELETE</strong> to confirm:</p>
      <input type="text" class="text-input" id="confirm-delete-input" placeholder="DELETE" style="width: 100%; text-align: center;" />
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-delete">Cancel</button>
        <button class="btn btn-danger" id="do-delete" disabled>Delete Server</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
  
  const input = document.getElementById('confirm-delete-input');
  const doBtn = document.getElementById('do-delete');
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  };
  
  input.oninput = () => {
    doBtn.disabled = input.value !== 'DELETE';
  };
  
  modal.querySelector('.modal-close').onclick = closeModal;
  modal.querySelector('.modal-backdrop').onclick = closeModal;
  document.getElementById('cancel-delete').onclick = closeModal;
  
  doBtn.onclick = async () => {
    doBtn.disabled = true;
    doBtn.innerHTML = '${icons.hourglass_empty} Deleting...';
    await deleteServer();
    closeModal();
  };
}

async function deleteServer() {
  try {
    const res = await api(`/api/servers/${currentServerId}`, {
      method: 'DELETE',
      
      body: JSON.stringify({})
    });
    
    const data = await res.json();
    
    if (res.ok) {
      toast.success('Server deleted');
      window.router.navigateTo('/servers');
    } else {
      toast.error(data.error || 'Failed to delete');
    }
  } catch (e) {
    console.error('Failed to delete server:', e);
    toast.error('Failed to delete server');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function cleanupSettingsTab() {
  currentServerId = null;
  serverData = null;
}
