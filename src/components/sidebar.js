import { state } from '../utils/state.js';
import { getPluginSidebarItems } from '../utils/plugins.js';

export function renderSidebar() {
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  
  const sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  sidebar.className = 'sidebar';
  
  const currentPath = window.location.pathname;
  const user = state.user;
  
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
      { path: '/admin/nodes', icon: 'dns', label: 'Nodes' },
      { path: '/admin/servers', icon: 'dns', label: 'Servers' },
      { path: '/admin/users', icon: 'people', label: 'Users' },
      { path: '/admin/nests', icon: 'egg', label: 'Nests' },
      { path: '/admin/locations', icon: 'location_on', label: 'Locations' },
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
    sections.push(adminSection);
  }
  
  const renderSection = (section) => {
    const header = section.label 
      ? `<div class="nav-section-label">${section.label}</div>` 
      : '';
    
    const items = section.items.map(item => `
      <li class="nav-item">
        <a href="${item.path}" class="nav-link ${currentPath === item.path || currentPath.startsWith(item.path + '/') ? 'active' : ''}">
          <span class="material-icons-outlined">${item.icon}</span>
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
        <img class="brand-icon" src="/favicon.svg" alt="Sodium" width="22" height="22">
        <span class="brand-text">Sodium</span>
      </a>
    </div>
    
    <nav class="sidebar-nav">
      ${sections.map(renderSection).join('')}
    </nav>
    
    <div class="sidebar-footer">
      <div class="footer-content">
        <span class="version">v1.0.0</span>
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
