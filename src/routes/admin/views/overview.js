import { escapeHtml } from '../../../utils/security.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';
import { state } from '../state.js';
import { renderBreadcrumb, setupBreadcrumbListeners } from '../utils/ui.js';

const navigateTo = (...args) => window.adminNavigate(...args);

export async function renderOverview(container, username, loadView) {
  try {
    const displayName = state.user?.displayName || state.username;
    
    container.innerHTML = `
      <div class="dashboard-container">
        <header class="dashboard-header">
          <div class="greeting">
            <div class="greeting-icon">
              <span class="round-icon">manage_accounts</span>
            </div>
            <div class="greeting-text">
              <h1>Welcome, <span class="highlight">${escapeHtml(username)}!</span></h1>
              <p>Welcome to the admin panel.</p>
            </div>
          </div>
        </header>
        
        <div class="dashboard-grid">
          <div class="dashboard-section">
            <a class="overview-item" href="https://sodiumpanel.github.io/panel/viewer.html">
              <span class="round-icon">article</span>
              <div class="info">
                <div class="title">Documentation</div>
                <div class="description">You can view the documentation clicking here</div>
              </div>
            </a>
          </div>
          <div class="dashboard-section">
            <a class="overview-item" href="https://github.com/sodiumpanel/panel">
              <span class="round-icon">merge</span>
              <div class="info">
                <div class="title">Github</div>
                <div class="description">Leave us an star on our Github repository</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load overview</div>`;
  }
}
