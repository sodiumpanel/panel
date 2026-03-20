import { state } from '../utils/state.js';
import { icons, icon } from '../utils/icons.js';
import { api } from '../utils/api.js';
import { getPluginSidebarItems, getPluginAdminPages } from '../utils/plugins.js';
import { getBranding } from '../utils/branding.js';

let _adminPermsCache = null;
let _adminPermsFetching = false;

const ADMIN_PATH_PERMS = {
  '/admin/overview': 'admin.overview',
  '/admin/nodes': 'admin.nodes',
  '/admin/servers': 'admin.servers',
  '/admin/users': 'admin.users',
  '/admin/groups': 'admin.groups',
  '/admin/nests': 'admin.nests',
  '/admin/locations': 'admin.locations',
  '/admin/incidents': 'admin.incidents',
  '/admin/announcements': 'admin.announcements',
  '/admin/webhooks': 'admin.webhooks',
  '/admin/audit': 'admin.audit',
  '/admin/activity': 'admin.activity',
  '/admin/plugins': 'admin.plugins',
  '/admin/settings': 'admin.settings',
};

function hasAdminPerm(perms, permission) {
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}

export async function loadAdminPermissions() {
  if (_adminPermsCache) return _adminPermsCache;
  if (_adminPermsFetching) return null;
  _adminPermsFetching = true;
  try {
    const res = await api('/api/admin/permissions');
    if (res.ok) {
      const data = await res.json();
      _adminPermsCache = data;
      return data;
    }
  } catch {}
  _adminPermsFetching = false;
  return null;
}

export function clearAdminPermsCache() {
  _adminPermsCache = null;
  _adminPermsFetching = false;
}

export function renderSidebar() {
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  
  const sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  sidebar.className = 'sidebar';
  
  const currentPath = window.location.pathname;
  const user = state.user;
  const branding = getBranding();
  
  const sections = [
    {
      label: null,
      items: [
        { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/servers', icon: 'dns', label: 'Servers' }
      ]
    },
    {
      label: 'Monitoring',
      items: [
        { path: '/status', icon: 'monitor_heart', label: 'Status' },
        { path: '/activity', icon: 'timeline', label: 'Activity' }
      ]
    },
    {
      label: 'Account',
      items: [
        { path: '/profile', icon: 'person', label: 'Profile' },
        { path: '/settings', icon: 'settings', label: 'Settings' }
      ]
    }
  ];
  
  const adminSection = {
    label: 'Administration',
    items: [
      { path: '/admin/overview', icon: 'analytics', label: 'Overview' },
      { path: '/admin/nodes', icon: 'dns', label: 'Nodes' },
      { path: '/admin/servers', icon: 'dns', label: 'Servers' },
      { path: '/admin/users', icon: 'people', label: 'Users' },
      { path: '/admin/groups', icon: 'group', label: 'Groups' },
      { path: '/admin/nests', icon: 'egg', label: 'Nests' },
      { path: '/admin/locations', icon: 'location_on', label: 'Locations' },
      { path: '/admin/incidents', icon: 'warning', label: 'Incidents' },
      { path: '/admin/announcements', icon: 'campaign', label: 'Announcements' },
      { path: '/admin/webhooks', icon: 'webhook', label: 'Webhooks' },
      { path: '/admin/audit', icon: 'history', label: 'Audit Log' },
      { path: '/admin/plugins', icon: 'extension', label: 'Plugins' },
      { path: '/admin/settings', icon: 'tune', label: 'Panel Settings' }
    ]
  };
  
  // Plugin sidebar items
  const pluginItems = getPluginSidebarItems();
  if (pluginItems.length > 0) {
    const insertIdx = sections.findIndex(s => s.label === 'Account');
    const pluginSection = {
      label: 'Plugins',
      items: pluginItems.map(item => ({
        path: item.href,
        icon: item.icon || 'extension',
        label: item.label
      }))
    };
    if (insertIdx !== -1) {
      sections.splice(insertIdx, 0, pluginSection);
    } else {
      sections.push(pluginSection);
    }
  }

  if (user?.isAdmin) {
    const pluginAdminPages = getPluginAdminPages();
    for (const page of pluginAdminPages) {
      adminSection.items.push({
        path: `/admin/plugin:${page.pluginId}:${page.id}`,
        icon: page.icon || 'extension',
        label: page.title || page.id
      });
    }
    sections.push(adminSection);
  } else if (user && _adminPermsCache?.permissions?.length > 0) {
    const perms = _adminPermsCache.permissions;
    const filtered = adminSection.items.filter(item => {
      const requiredPerm = ADMIN_PATH_PERMS[item.path];
      if (!requiredPerm) return true;
      return hasAdminPerm(perms, requiredPerm);
    });
    if (filtered.length > 0) {
      sections.push({ ...adminSection, items: filtered });
    }
  } else if (user && !_adminPermsCache && !_adminPermsFetching) {
    loadAdminPermissions().then(data => {
      if (data?.permissions?.length > 0) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          const newSidebar = renderSidebar();
          sidebar.parentNode.replaceChild(newSidebar, sidebar);
          const oldOverlay = document.getElementById('sidebar-overlay');
          if (oldOverlay) oldOverlay.remove();
        }
      }
    });
  }
  
  const renderSection = (section) => {
    const header = section.label 
      ? `<div class="nav-section-label">${section.label}</div>` 
      : '';
    
    const items = section.items.map(item => `
      <li class="nav-item">
        <a href="${item.path}" class="nav-link ${currentPath === item.path || currentPath.startsWith(item.path + '/') ? 'active' : ''}">
          ${icons[item.icon] || ""}
          <span class="nav-text">${item.label}</span>
        </a>
      </li>
    `).join('');
    
    return `
      <div class="nav-section">
        ${header}
        <ul class="nav-list">${items}</ul>
      </div>
    `;
  };
  
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <a href="/dashboard" class="sidebar-brand">
        <img class="brand-icon" src="${branding.logo || '/favicon.svg'}" alt="${branding.name}" width="22" height="22">
        <span class="brand-text">${branding.name}</span>
      </a>
    </div>
    
    <nav class="sidebar-nav">
      ${sections.map(renderSection).join('')}
    </nav>
    
    <div class="sidebar-footer">
      <div class="footer-content">
        <span>Powered by <a href="https://sodiumpanel.github.io/">Sodium</a></span>
        <br>
        <span><a href="https://github.com/zt3xdv/">zt3xdv</a> and contributors.</span>
      </div>
    </div>
  `;
  
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  };
  
  overlay.addEventListener('click', closeSidebar);
  
  setTimeout(() => {
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeSidebar();
        }
      });
    });
  }, 0);
  
  const fragment = document.createDocumentFragment();
  fragment.appendChild(overlay);
  fragment.appendChild(sidebar);
  
  return fragment;
}
