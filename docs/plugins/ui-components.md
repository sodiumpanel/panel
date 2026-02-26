# UI Components

Plugins can register various UI elements that the Sodium frontend will render. These are registered server-side and sent to the client via the plugin client data endpoint.

## Dashboard widgets

Add a widget to the main dashboard:

```js
sodium.ui.addDashboardWidget({
  id: 'my-widget',
  title: 'Server Analytics',
  size: 'small'
});
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique widget identifier |
| `title` | `string` | Widget display title |
| `size` | `string` | Widget size: `small`, `medium`, `large` |

You can register multiple widgets:

```js
sodium.ui.addDashboardWidget({ id: 'stats', title: 'Quick Stats', size: 'small' });
sodium.ui.addDashboardWidget({ id: 'chart', title: 'Usage Chart', size: 'large' });
```

## Sidebar items

Add a navigation item to the main sidebar:

```js
sodium.ui.addSidebarItem({
  id: 'analytics',
  label: 'Analytics',
  icon: 'chart-bar',
  path: '/plugins/analytics'
});
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique item identifier |
| `label` | `string` | Display text in the sidebar |
| `icon` | `string` | Icon identifier |
| `path` | `string` | Navigation path when clicked |

## Server tabs

Add a tab to the server detail view:

```js
sodium.ui.addServerTab({
  id: 'monitoring',
  label: 'Monitoring'
});
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique tab identifier |
| `label` | `string` | Tab display text |

## Admin tabs

Add a tab to the admin panel:

```js
sodium.ui.addAdminTab({
  id: 'plugin-settings',
  label: 'Plugin Settings'
});
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique tab identifier |
| `label` | `string` | Tab display text |

## Custom pages

Register custom page definitions:

```js
sodium.ui.registerPages({
  '/plugins/analytics': {
    title: 'Analytics Dashboard',
    component: 'analytics-dashboard'
  },
  '/plugins/analytics/reports': {
    title: 'Reports',
    component: 'analytics-reports'
  }
});
```

The pages object maps URL paths to page metadata. The exact rendering behavior depends on whether the plugin includes a `client.js` module for frontend logic.

## Client-side data flow

When the frontend loads, it fetches plugin data from:

```
GET /api/plugins/client-data
```

This returns an array of active plugins with their registered UI elements:

```json
{
  "plugins": [
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "type": "utility",
      "pages": { "/plugins/my-plugin": { "title": "My Page" } },
      "sidebarItems": [{ "id": "my-item", "label": "My Item" }],
      "serverTabs": [],
      "dashboardWidgets": [{ "id": "my-widget", "title": "Widget" }],
      "adminTabs": [],
      "hasClient": true
    }
  ]
}
```

The frontend uses helper functions to aggregate elements across all plugins:

- `getPluginSidebarItems()` — All sidebar items from all active plugins
- `getPluginPages()` — All page definitions merged into one object
- `getPluginServerTabs()` — All server tabs from all active plugins
- `getPluginDashboardWidgets()` — All dashboard widgets from all active plugins

## Client module (client.js)

If your plugin includes a `client.js` file, the frontend will detect it via the `hasClient` flag. This module can contain custom rendering logic for pages, widgets, or tabs that your plugin registers.

The client module is loaded separately by the frontend and is not processed by the server-side plugin manager.

## Complete example

```js
export default function (sodium) {
  // Add sidebar navigation
  sodium.ui.addSidebarItem({
    id: 'reports',
    label: 'Reports',
    icon: 'file-text',
    path: '/plugins/reports'
  });

  // Add dashboard widget
  sodium.ui.addDashboardWidget({
    id: 'report-summary',
    title: 'Report Summary',
    size: 'medium'
  });

  // Add server-level tab
  sodium.ui.addServerTab({
    id: 'server-report',
    label: 'Reports'
  });

  // Add admin panel tab
  sodium.ui.addAdminTab({
    id: 'report-config',
    label: 'Report Configuration'
  });

  // Register custom pages
  sodium.ui.registerPages({
    '/plugins/reports': {
      title: 'Reports Dashboard',
      component: 'reports-dashboard'
    }
  });
}
```
