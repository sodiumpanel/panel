import { escapeHtml } from '../../../utils/security.js';
import { icons, icon } from '../../../utils/icons.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';
import { state } from '../state.js';
import { renderBreadcrumb, setupBreadcrumbListeners } from '../utils/ui.js';

const navigateTo = (...args) => window.adminNavigate(...args);

export async function renderLocationsList(container, username, loadView) {
  try {
    const res = await api('/api/admin/locations');
    const data = await res.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Locations' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-location-btn">
            ${icons.add}
            Create Location
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${data.locations.length === 0 ? `
          <div class="empty-state">
            ${icons.location_on}
            <p>No locations yet</p>
          </div>
        ` : `
          <div class="locations-grid">
            ${data.locations.map(l => `
              <div class="location-card">
                <div class="location-icon">
                  ${icons.location_on}
                </div>
                <div class="location-info">
                  <h3>${escapeHtml(l.short)}</h3>
                  <p>${escapeHtml(l.long)}</p>
                </div>
                <div class="location-actions">
                  <button class="btn btn-sm btn-danger" onclick="deleteLocationAdmin('${l.id}')">
                    ${icons.delete}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo);
    
    document.getElementById('create-location-btn').onclick = () => showLocationModal(username, loadView);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load locations</div>`;
  }
}

function showLocationModal(username, loadView) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Location</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          ${icons.close}
        </button>
      </div>
      <form id="location-form" class="modal-form">
        <div class="form-group">
          <label>Short Code</label>
          <input type="text" name="short" placeholder="e.g., us, eu, asia" required />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="long" placeholder="e.g., United States, Europe" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('location-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    
    try {
      await api('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          location: {
            short: form.get('short'),
            long: form.get('long')
          }
        })
      });
      modal.remove();
      if (typeof loadView === 'function') loadView();
      else if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
    } catch (e) {
      toast.error('Failed to create location');
    }
  };
}

window.deleteLocationAdmin = async function(locationId) {
  const confirmed = await modal.confirm({ title: 'Delete Location', message: 'Delete this location?', danger: true });
  if (!confirmed) return;
  
  try {
    await api(`/api/admin/locations/${locationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    // Assume adminNavigate is available to refresh
    if (typeof window.adminNavigate === 'function') window.adminNavigate(state.currentView.tab);
  } catch (e) {
    toast.error('Failed to delete location');
  }
};
