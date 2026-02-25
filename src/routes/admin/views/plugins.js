import { escapeHtml } from '../../../utils/security.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';

export async function renderPluginsList(container) {
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await api('/api/admin/plugins');
    const data = await res.json();
    const plugins = data.plugins || [];

    container.innerHTML = `
      <div class="admin-section">
        <div class="section-header">
          <h2>Plugins</h2>
          <p class="section-desc">Manage installed plugins</p>
        </div>

        ${plugins.length === 0 ? `
          <div class="empty-state">
            <span class="material-icons-outlined">extension_off</span>
            <p>No plugins installed</p>
            <small>Place plugin folders in <code>data/plugins/</code> and restart the panel</small>
          </div>
        ` : `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${plugins.map(p => `
                  <tr>
                    <td>
                      <div class="plugin-name">
                        <strong>${escapeHtml(p.name)}</strong>
                        <small>${escapeHtml(p.description || '')}</small>
                      </div>
                    </td>
                    <td><span class="badge badge-${p.type}">${escapeHtml(p.type)}</span></td>
                    <td>${escapeHtml(p.version)}</td>
                    <td>${escapeHtml(p.author || 'Unknown')}</td>
                    <td>
                      <span class="status-badge ${p.active ? 'online' : 'offline'}">
                        ${p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}" onclick="togglePlugin('${escapeHtml(p.id)}', ${p.active})">
                        <span class="material-icons-outlined">${p.active ? 'stop' : 'play_arrow'}</span>
                        ${p.active ? 'Disable' : 'Enable'}
                      </button>
                      ${Object.keys(p.settings || {}).length > 0 ? `
                        <button class="btn btn-sm btn-secondary" onclick="configurePlugin('${escapeHtml(p.id)}')">
                          <span class="material-icons-outlined">settings</span>
                          Configure
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    window.togglePlugin = async (id, isActive) => {
      try {
        const action = isActive ? 'deactivate' : 'activate';
        const res = await api(`/api/admin/plugins/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.success(`Plugin ${isActive ? 'disabled' : 'enabled'}`);
          renderPluginsList(container);
        }
      } catch (e) {
        toast.error('Failed to toggle plugin');
      }
    };

    window.configurePlugin = async (id) => {
      try {
        const res = await api(`/api/admin/plugins/${encodeURIComponent(id)}/settings`);
        const data = await res.json();
        if (data.error) return toast.error(data.error);

        const schema = data.schema || {};
        const values = data.values || {};

        const fields = Object.entries(schema).map(([key, field]) => {
          const val = values[key] !== undefined ? values[key] : (field.default || '');
          if (field.type === 'boolean') {
            return `<div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" name="${escapeHtml(key)}" ${val ? 'checked' : ''}>
                <span>${escapeHtml(field.label || key)}</span>
              </label>
            </div>`;
          }
          if (field.type === 'select') {
            return `<div class="form-group">
              <label>${escapeHtml(field.label || key)}</label>
              <select name="${escapeHtml(key)}" class="form-control">
                ${(field.options || []).map(o => `<option value="${escapeHtml(o)}" ${o === val ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
              </select>
            </div>`;
          }
          return `<div class="form-group">
            <label>${escapeHtml(field.label || key)}</label>
            <input type="${field.secret ? 'password' : 'text'}" name="${escapeHtml(key)}" value="${escapeHtml(String(val))}" class="form-control" placeholder="${escapeHtml(field.label || key)}">
          </div>`;
        }).join('');

        const { closeModal } = modal.show({
          title: 'Plugin Settings',
          content: `<form id="plugin-settings-form">${fields}</form>`,
          buttons: [
            { label: 'Cancel', action: 'close' },
            { label: 'Save', className: 'btn-primary', action: 'save' }
          ],
          onAction: async (action, el, close) => {
            if (action !== 'save') return close();
            const form = el.querySelector('#plugin-settings-form');
            const newValues = {};
            for (const [key, field] of Object.entries(schema)) {
              const input = form.querySelector(`[name="${key}"]`);
              if (!input) continue;
              if (field.type === 'boolean') {
                newValues[key] = input.checked;
              } else {
                newValues[key] = input.value;
              }
            }
            try {
              await api(`/api/admin/plugins/${encodeURIComponent(id)}/settings`, {
                method: 'PUT',
                body: JSON.stringify({ values: newValues })
              });
              toast.success('Settings saved');
              close();
            } catch {
              toast.error('Failed to save settings');
            }
          }
        });
      } catch (e) {
        toast.error('Failed to load plugin settings');
      }
    };
  } catch (e) {
    container.innerHTML = '<div class="error-state">Failed to load plugins</div>';
  }
}
