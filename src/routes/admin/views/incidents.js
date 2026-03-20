import { escapeHtml } from '../../../utils/security.js';
import { icons, icon } from '../../../utils/icons.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';
import { state } from '../state.js';
import { renderBreadcrumb, setupBreadcrumbListeners } from '../utils/ui.js';

const navigateTo = (...args) => window.adminNavigate(...args);

const STATUS_LABELS = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved'
};

const IMPACT_LABELS = {
  none: 'None',
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical'
};

const IMPACT_COLORS = {
  none: 'var(--text-tertiary)',
  minor: 'var(--warning, #f59e0b)',
  major: '#f97316',
  critical: 'var(--danger)'
};

const STATUS_COLORS = {
  investigating: 'var(--warning, #f59e0b)',
  identified: '#f97316',
  monitoring: 'var(--info, #3b82f6)',
  resolved: 'var(--success)'
};

export async function renderIncidentsList(container, username, loadView) {
  try {
    const [incRes, nodesRes] = await Promise.all([
      api('/api/admin/incidents'),
      api('/api/admin/nodes')
    ]);
    const incData = await incRes.json();
    const nodesData = await nodesRes.json();
    const incidents = incData.incidents || [];
    const nodes = nodesData.nodes || [];

    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Incidents' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-incident-btn">
            ${icons.add}
            Create Incident
          </button>
        </div>
      </div>

      <div class="admin-list">
        ${incidents.length === 0 ? `
          <div class="empty-state">
            ${icons.check_circle}
            <h3>No Incidents</h3>
            <p>No incidents have been reported. That's a good thing!</p>
          </div>
        ` : `
          <div class="list-grid">
            ${incidents.map(inc => `
              <div class="list-card" data-id="${inc.id}" style="cursor:pointer;">
                <div class="list-card-header">
                  <div class="list-card-icon">
                    <span class="round-icon" style="color: ${IMPACT_COLORS[inc.impact] || 'inherit'}">
                      ${inc.status === 'resolved' ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                  <div class="list-card-title">
                    <h3>${escapeHtml(inc.title)}</h3>
                    <span class="list-card-subtitle">${new Date(inc.created_at).toLocaleString()}${inc.created_by ? ' by ' + escapeHtml(inc.created_by) : ''}</span>
                  </div>
                  <span class="sp-status-tag" style="background: ${STATUS_COLORS[inc.status]}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                    ${STATUS_LABELS[inc.status] || inc.status}
                  </span>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Impact</span>
                    <span class="stat-value" style="color: ${IMPACT_COLORS[inc.impact]}">${IMPACT_LABELS[inc.impact] || inc.impact}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Updates</span>
                    <span class="stat-value">${(inc.updates || []).length}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Nodes</span>
                    <span class="stat-value">${(inc.affected_nodes || []).length || '—'}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    setupBreadcrumbListeners(navigateTo);

    document.getElementById('create-incident-btn').onclick = () => showCreateModal(nodes, loadView);

    container.querySelectorAll('.list-card[data-id]').forEach(card => {
      card.onclick = () => navigateTo('incidents', card.dataset.id);
    });

  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load incidents</div>`;
  }
}

async function showCreateModal(nodes, loadView) {
  const nodesHtml = nodes.map(n => `<option value="${n.id}">${escapeHtml(n.name)}</option>`).join('');

  const title = await modal.prompt('Incident title:', { title: 'Create Incident', placeholder: 'e.g. Node outage in EU region' });
  if (!title) return;

  try {
    const res = await api('/api/admin/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident: {
          title,
          status: 'investigating',
          impact: 'minor'
        }
      })
    });
    const data = await res.json();
    if (data.success && data.incident) {
      toast.success('Incident created');
      navigateTo('incidents', data.incident.id);
    } else {
      toast.error(data.error || 'Failed to create incident');
    }
  } catch {
    toast.error('Failed to create incident');
  }
}

export async function renderIncidentDetail(container, username, incidentId) {
  try {
    const [incRes, nodesRes] = await Promise.all([
      api('/api/admin/incidents'),
      api('/api/admin/nodes')
    ]);
    const incData = await incRes.json();
    const nodesData = await nodesRes.json();
    const incident = (incData.incidents || []).find(i => i.id === incidentId);
    const nodes = nodesData.nodes || [];

    if (!incident) {
      container.innerHTML = `<div class="error">Incident not found</div>`;
      return;
    }

    const updates = (incident.updates || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const affectedNodeNames = (incident.affected_nodes || [])
      .map(id => nodes.find(n => n.id === id)?.name || id.slice(0, 8))
      .join(', ');

    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Incidents', onClick: 'list-incidents' },
          { label: incident.title }
        ])}
        <div class="admin-header-actions">
          <button class="btn btn-danger" id="delete-incident-btn">
            ${icons.delete}
            Delete
          </button>
        </div>
      </div>

      <div class="detail-grid" style="gap: 1.5rem;">
        <div class="detail-card detail-card-wide">
          <h3>Incident Details</h3>
          <form id="incident-edit-form" class="settings-form" style="margin-top: 1rem;">
            <div class="form-grid">
              <div class="form-group">
                <label>Title</label>
                <input type="text" name="title" value="${escapeHtml(incident.title)}" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <input type="text" name="description" value="${escapeHtml(incident.description || '')}" />
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  ${Object.entries(STATUS_LABELS).map(([v, l]) =>
                    `<option value="${v}" ${incident.status === v ? 'selected' : ''}>${l}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Impact</label>
                <select name="impact">
                  ${Object.entries(IMPACT_LABELS).map(([v, l]) =>
                    `<option value="${v}" ${incident.impact === v ? 'selected' : ''}>${l}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Affected Nodes</label>
              <div class="form-toggles">
                ${nodes.map(n => `
                  <label class="toggle-item">
                    <input type="checkbox" name="node_${n.id}" value="${n.id}" ${(incident.affected_nodes || []).includes(n.id) ? 'checked' : ''} />
                    <span class="toggle-content">
                      <span class="toggle-title">${escapeHtml(n.name)}</span>
                    </span>
                  </label>
                `).join('')}
                ${nodes.length === 0 ? '<p class="form-hint">No nodes configured</p>' : ''}
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                ${icons.save}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div class="detail-card detail-card-wide">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Updates Timeline</h3>
            <button class="btn btn-sm btn-primary" id="add-update-btn">
              ${icons.add}
              Add Update
            </button>
          </div>

          <div id="updates-timeline" style="margin-top: 1rem;">
            ${updates.length === 0 ? '<p class="form-hint">No updates yet</p>' : updates.map(u => `
              <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="background: ${STATUS_COLORS[u.status]}; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
                    ${STATUS_LABELS[u.status] || u.status}
                  </span>
                  <span style="font-size: 12px; color: var(--text-tertiary);">
                    ${new Date(u.created_at).toLocaleString()}${u.created_by ? ' — ' + escapeHtml(u.created_by) : ''}
                  </span>
                </div>
                <p style="margin: 0; font-size: 13px; color: var(--text-primary);">${escapeHtml(u.message)}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="detail-card">
          <h3>Info</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">${new Date(incident.created_at).toLocaleString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created By</span>
              <span class="info-value">${escapeHtml(incident.created_by || '—')}</span>
            </div>
            ${incident.resolved_at ? `
            <div class="info-item">
              <span class="info-label">Resolved</span>
              <span class="info-value">${new Date(incident.resolved_at).toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="info-item">
              <span class="info-label">Affected Nodes</span>
              <span class="info-value">${affectedNodeNames || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    setupBreadcrumbListeners(navigateTo);

    document.getElementById('delete-incident-btn').onclick = async () => {
      const confirmed = await modal.confirm({ title: 'Delete Incident', message: 'Delete this incident? This cannot be undone.', danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/incidents/${incidentId}`, { method: 'DELETE' });
        toast.success('Incident deleted');
        navigateTo('incidents');
      } catch {
        toast.error('Failed to delete');
      }
    };

    document.getElementById('incident-edit-form').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const affected = nodes.filter(n => form.querySelector(`[name="node_${n.id}"]`)?.checked).map(n => n.id);

      try {
        await api(`/api/admin/incidents/${incidentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incident: {
              title: form.title.value,
              description: form.description.value,
              status: form.status.value,
              impact: form.impact.value,
              affected_nodes: affected
            }
          })
        });
        toast.success('Incident updated');
        navigateTo('incidents', incidentId);
      } catch {
        toast.error('Failed to update');
      }
    };

    document.getElementById('add-update-btn').onclick = async () => {
      const message = await modal.prompt('Update message:', { title: 'Add Incident Update', placeholder: 'Describe the current situation...' });
      if (!message) return;

      try {
        await api(`/api/admin/incidents/${incidentId}/updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, status: incident.status })
        });
        toast.success('Update added');
        navigateTo('incidents', incidentId);
      } catch {
        toast.error('Failed to add update');
      }
    };

  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load incident</div>`;
  }
}
