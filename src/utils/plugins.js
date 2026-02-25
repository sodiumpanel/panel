let _pluginData = null;
let _loading = null;

export async function loadPluginData() {
  if (_pluginData) return _pluginData;
  if (_loading) return _loading;

  _loading = fetch('/api/plugins/client-data')
    .then(r => r.json())
    .then(data => {
      _pluginData = data.plugins || [];
      _loading = null;
      return _pluginData;
    })
    .catch(() => {
      _pluginData = [];
      _loading = null;
      return [];
    });

  return _loading;
}

export function getPluginSidebarItems() {
  if (!_pluginData) return [];
  const items = [];
  for (const plugin of _pluginData) {
    if (plugin.sidebarItems) {
      items.push(...plugin.sidebarItems);
    }
  }
  return items;
}

export function getPluginPages() {
  if (!_pluginData) return {};
  const pages = {};
  for (const plugin of _pluginData) {
    if (plugin.pages) {
      Object.assign(pages, plugin.pages);
    }
  }
  return pages;
}

export function getPluginServerTabs() {
  if (!_pluginData) return [];
  const tabs = [];
  for (const plugin of _pluginData) {
    if (plugin.serverTabs) {
      tabs.push(...plugin.serverTabs);
    }
  }
  return tabs;
}

export function getPluginDashboardWidgets() {
  if (!_pluginData) return [];
  const widgets = [];
  for (const plugin of _pluginData) {
    if (plugin.dashboardWidgets) {
      widgets.push(...plugin.dashboardWidgets);
    }
  }
  return widgets;
}

export function clearPluginCache() {
  _pluginData = null;
  _loading = null;
}
