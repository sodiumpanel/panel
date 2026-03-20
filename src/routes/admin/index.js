import { state as appState } from '../../utils/state.js';
import { icons, icon } from '../../utils/icons.js';
import { api } from '../../utils/api.js';
import { loadAdminPermissions } from '../../components/sidebar.js';
import { state } from './state.js';

import { renderNodesList, renderNodeDetail } from './views/nodes.js';
import { renderServersList, renderServerDetail } from './views/servers.js';
import { renderUsersList, renderUserDetail } from './views/users.js';
import { renderNestsList, renderEggDetail } from './views/nests.js';
import { renderLocationsList } from './views/locations.js';
import { renderSettingsPage } from './views/settings.js';
import { renderAnnouncementsList } from './views/announcements.js';
import { renderAuditLogPage, renderActivityLogPage } from './views/logs.js';
import { renderWebhooksList } from './views/webhooks.js';
import { renderPluginsList } from './views/plugins.js';
import { renderGroupsList, renderGroupDetail } from './views/groups.js';
import { renderIncidentsList, renderIncidentDetail } from './views/incidents.js';
import { renderOverview } from './views/overview.js';
import { getPluginAdminPages, renderPluginAdminPage } from '../../utils/plugins.js';

let loadViewGeneration = 0;

function navigateTo(tab, id = null, subTab = null) {
  state.currentView = { 
    type: id ? 'detail' : 'list', 
    tab, 
    id, 
    subTab: subTab || getDefaultSubTab(tab) 
  };
  loadView();
}

function getDefaultSubTab(tab) {
  switch (tab) {
    case 'nodes': return 'about';
    case 'servers': return 'details';
    case 'users': return 'overview';
    case 'eggs': return 'about';
    case 'groups': return 'settings';
    default: return null;
  }
}

window.adminNavigate = navigateTo;

const TAB_PERMISSIONS = {
  overview: 'admin.overview',
  nodes: 'admin.nodes',
  servers: 'admin.servers',
  users: 'admin.users',
  groups: 'admin.groups',
  nests: 'admin.nests',
  eggs: 'admin.nests',
  locations: 'admin.locations',
  settings: 'admin.settings',
  announcements: 'admin.announcements',
  webhooks: 'admin.webhooks',
  audit: 'admin.audit',
  activity: 'admin.activity',
  plugins: 'admin.plugins',
  incidents: 'admin.incidents',
};

export async function renderAdmin(tab = 'nodes', params = {}) {
  const app = document.getElementById('app');
  const user = appState.user;
  
  app.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    if (!user?.isAdmin) {
      const res = await api('/api/admin/permissions');
      if (!res.ok) {
        app.innerHTML = `
          <div class="error-page">
            <h1>403</h1>
            <p>Access Denied</p>
            <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
          </div>
        `;
        return;
      }
    }
  } catch (e) {
    app.innerHTML = '<div class="error">Failed to verify permissions</div>';
    return;
  }
  
  state.currentView = {
    type: params.id ? 'detail' : 'list',
    tab,
    id: params.id || null,
    subTab: params.subTab || getDefaultSubTab(tab)
  };
  
  app.innerHTML = `
    <div class="admin-page">
      <div class="admin-content" id="admin-content">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  
  loadView();
}

export async function loadView() {
  const parent = document.querySelector('.admin-page');
  if (!parent) return;
  const username = appState.username;
  const generation = ++loadViewGeneration;
  
  // Replace admin-content element to invalidate any in-flight renders
  const oldContainer = document.getElementById('admin-content');
  if (oldContainer) oldContainer.remove();
  
  const container = document.createElement('div');
  container.id = 'admin-content';
  container.innerHTML = '<div class="loading-spinner"></div>';
  parent.appendChild(container);
  
  if (!appState.user?.isAdmin) {
    const permData = await loadAdminPermissions();
    const perms = permData?.permissions || [];
    const requiredPerm = TAB_PERMISSIONS[state.currentView.tab];
    if (requiredPerm && !perms.includes('*') && !perms.includes(requiredPerm)) {
      container.innerHTML = `
        <div class="empty-state">
          ${icons.block}
          <h3>Not Found</h3>
          <p>The page you're looking for doesn't exist.</p>
        </div>
      `;
      return;
    }
  }
  
  if (state.currentView.type === 'detail' && state.currentView.id) {
    switch (state.currentView.tab) {
      case 'nodes':
        await renderNodeDetail(container, username, state.currentView.id);
        break;
      case 'servers':
        await renderServerDetail(container, username, state.currentView.id);
        break;
      case 'users':
        await renderUserDetail(container, username, state.currentView.id);
        break;
      case 'eggs':
        await renderEggDetail(container, username, state.currentView.id);
        break;
      case 'groups':
        await renderGroupDetail(container, username, state.currentView.id);
        break;
      case 'incidents':
        await renderIncidentDetail(container, username, state.currentView.id);
        break;
    }
  } else {
    switch (state.currentView.tab) {
      case 'overview':
        await renderOverview(container, username, loadView);
        break;
      case 'nodes':
        await renderNodesList(container, username, loadView);
        break;
      case 'servers':
        await renderServersList(container, username, loadView);
        break;
      case 'users':
        await renderUsersList(container, username, loadView);
        break;
      case 'nests':
        await renderNestsList(container, username, loadView);
        break;
      case 'locations':
        await renderLocationsList(container, username, loadView);
        break;
      case 'settings':
        await renderSettingsPage(container, username, loadView);
        break;
      case 'announcements':
        await renderAnnouncementsList(container, username, loadView);
        break;
      case 'audit':
        await renderAuditLogPage(container, username);
        break;
      case 'activity':
        await renderActivityLogPage(container, username);
        break;
      case 'webhooks':
        await renderWebhooksList(container, username, loadView);
        break;
      case 'plugins':
        await renderPluginsList(container);
        break;
      case 'groups':
        await renderGroupsList(container, username, loadView);
        break;
      case 'incidents':
        await renderIncidentsList(container, username, loadView);
        break;
      default:
        // Check for plugin admin pages (format: "plugin:pluginId:pageId")
        if (state.currentView.tab.startsWith('plugin:')) {
          const parts = state.currentView.tab.split(':');
          renderPluginAdminPage(parts[1], parts[2], container);
        } else {
          container.innerHTML = `<div class="empty-state"><p>Page not found</p></div>`;
        }
        break;
    }
  }
}

export function cleanupAdmin() {
}
