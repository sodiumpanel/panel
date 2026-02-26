import { api } from './api.js';
import { escapeHtml } from './security.js';
import * as toast from './toast.js';
import * as modal from './modal.js';

let _pluginData = null;
let _loading = null;
const _clientModules = new Map();
const _renderFns = {
  pages: new Map(),
  serverTabs: new Map(),
  widgets: new Map(),
  adminPages: new Map()
};
const _eventHandlers = {};

// --- Event system for client-side plugins ---

function emitPluginEvent(event, data) {
  const handlers = _eventHandlers[event];
  if (!handlers) return;
  for (const fn of handlers) {
    try { fn(data); } catch (e) { console.warn(`[Plugin event] ${event} error:`, e); }
  }
}

function onPluginEvent(event, handler) {
  if (!_eventHandlers[event]) _eventHandlers[event] = [];
  _eventHandlers[event].push(handler);
}

function offPluginEvent(event, handler) {
  if (!_eventHandlers[event]) return;
  _eventHandlers[event] = _eventHandlers[event].filter(h => h !== handler);
}

// --- Create client-side sodium API for a plugin ---

function createClientApi(pluginMeta) {
  const pluginId = pluginMeta.id;

  return {
    plugin: {
      id: pluginId,
      name: pluginMeta.name,
      version: pluginMeta.version
    },

    api: (path, opts = {}) => {
      const url = `/api/plugins/${pluginId}${path.startsWith('/') ? path : '/' + path}`;
      return api(url, opts);
    },

    ui: {
      onRenderPage(pageId, renderFn) {
        _renderFns.pages.set(`${pluginId}:${pageId}`, renderFn);
      },
      onRenderServerTab(tabId, renderFn) {
        _renderFns.serverTabs.set(`${pluginId}:${tabId}`, renderFn);
      },
      onRenderWidget(widgetId, renderFn) {
        _renderFns.widgets.set(`${pluginId}:${widgetId}`, renderFn);
      },
      onRenderAdminPage(pageId, renderFn) {
        _renderFns.adminPages.set(`${pluginId}:${pageId}`, renderFn);
      }
    },

    events: {
      on: onPluginEvent,
      off: offPluginEvent,
      emit: emitPluginEvent
    },

    navigate(path) {
      if (window.router?.navigateTo) {
        window.router.navigateTo(path);
      }
    },

    toast: {
      success: (msg) => toast.success(msg),
      error: (msg) => toast.error(msg),
      info: (msg) => toast.info?.(msg) || toast.success(msg)
    },

    modal: {
      show: (opts) => modal.show(opts),
      confirm: (opts) => modal.confirm?.(opts) || modal.show(opts)
    },

    escapeHtml
  };
}

// --- Load plugin metadata + client modules ---

export async function loadPluginData() {
  if (_pluginData) return _pluginData;
  if (_loading) return _loading;

  _loading = (async () => {
    try {
      const res = await fetch('/api/plugins/client-data');
      const data = await res.json();
      _pluginData = data.plugins || [];
    } catch {
      _pluginData = [];
    }

    // Load client modules for plugins that have them
    const loadPromises = _pluginData
      .filter(p => p.hasClient)
      .map(async (pluginMeta) => {
        try {
          const mod = await import(`/api/plugins/${pluginMeta.id}/client.js`);
          if (typeof mod.default === 'function') {
            const clientApi = createClientApi(pluginMeta);
            const result = mod.default(clientApi);
            _clientModules.set(pluginMeta.id, result || {});
          }
        } catch (e) {
          console.warn(`[Plugins] Failed to load client for "${pluginMeta.id}":`, e);
        }
      });

    await Promise.allSettled(loadPromises);
    _loading = null;
    return _pluginData;
  })();

  return _loading;
}

// --- Sidebar items ---

export function getPluginSidebarItems() {
  if (!_pluginData) return [];
  const items = [];
  for (const plugin of _pluginData) {
    if (plugin.sidebarItems) {
      items.push(...plugin.sidebarItems);
    }
    // Auto-add sidebar items for pages that don't have manual sidebar entries
    if (plugin.pages) {
      for (const page of plugin.pages) {
        if (page.sidebar !== false) {
          const alreadyAdded = items.some(i => i.href === page.path);
          if (!alreadyAdded) {
            items.push({
              href: page.path,
              icon: page.icon || 'extension',
              label: page.title || page.id
            });
          }
        }
      }
    }
  }
  return items;
}

// --- Plugin pages (routes) ---

export function getPluginPages() {
  if (!_pluginData) return [];
  const pages = [];
  for (const plugin of _pluginData) {
    if (plugin.pages) {
      for (const page of plugin.pages) {
        pages.push({ ...page, pluginId: plugin.id });
      }
    }
  }
  return pages;
}

export function renderPluginPage(pluginId, pageId, container) {
  const key = `${pluginId}:${pageId}`;
  const renderFn = _renderFns.pages.get(key);
  if (renderFn) {
    renderFn(container);
    emitPluginEvent('page.rendered', { pluginId, pageId });
    return true;
  }
  container.innerHTML = `
    <div class="empty-state">
      <span class="material-icons-outlined">extension_off</span>
      <p>Plugin page not available</p>
    </div>
  `;
  return false;
}

// --- Server tabs ---

export function getPluginServerTabs() {
  if (!_pluginData) return [];
  const tabs = [];
  for (const plugin of _pluginData) {
    if (plugin.serverTabs) {
      for (const tab of plugin.serverTabs) {
        tabs.push({ ...tab, pluginId: plugin.id });
      }
    }
  }
  return tabs;
}

export function renderPluginServerTab(pluginId, tabId, container, serverId) {
  const key = `${pluginId}:${tabId}`;
  const renderFn = _renderFns.serverTabs.get(key);
  if (renderFn) {
    renderFn(container, serverId);
    emitPluginEvent('serverTab.rendered', { pluginId, tabId, serverId });
    return true;
  }
  container.innerHTML = `<div class="empty-state"><p>Tab content not available</p></div>`;
  return false;
}

// --- Dashboard widgets ---

export function getPluginDashboardWidgets() {
  if (!_pluginData) return [];
  const widgets = [];
  for (const plugin of _pluginData) {
    if (plugin.dashboardWidgets) {
      for (const widget of plugin.dashboardWidgets) {
        widgets.push({ ...widget, pluginId: plugin.id });
      }
    }
  }
  return widgets;
}

export function renderPluginWidget(pluginId, widgetId, container) {
  const key = `${pluginId}:${widgetId}`;
  const renderFn = _renderFns.widgets.get(key);
  if (renderFn) {
    renderFn(container);
    return true;
  }
  return false;
}

// --- Admin pages ---

export function getPluginAdminPages() {
  if (!_pluginData) return [];
  const pages = [];
  for (const plugin of _pluginData) {
    if (plugin.adminPages) {
      for (const page of plugin.adminPages) {
        pages.push({ ...page, pluginId: plugin.id });
      }
    }
  }
  return pages;
}

export function renderPluginAdminPage(pluginId, pageId, container) {
  const key = `${pluginId}:${pageId}`;
  const renderFn = _renderFns.adminPages.get(key);
  if (renderFn) {
    renderFn(container);
    emitPluginEvent('adminPage.rendered', { pluginId, pageId });
    return true;
  }
  container.innerHTML = `<div class="empty-state"><p>Admin page not available</p></div>`;
  return false;
}

// --- Emit helper for core system ---

export { emitPluginEvent };

// --- Cache management ---

export function clearPluginCache() {
  _pluginData = null;
  _loading = null;
  _clientModules.clear();
  _renderFns.pages.clear();
  _renderFns.serverTabs.clear();
  _renderFns.widgets.clear();
  _renderFns.adminPages.clear();
  for (const key of Object.keys(_eventHandlers)) {
    delete _eventHandlers[key];
  }
}
