# Sodium Plugin System

Plugins let developers extend Sodium with custom features, routes, UI elements, and more.

## Plugin Structure

```
data/plugins/my-plugin/
  plugin.json      # Manifest (required)
  server.js        # Server-side code (optional)
  client.js        # Client-side code (optional)
```

## plugin.json (Manifest)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What the plugin does",
  "type": "extension",
  "hooks": ["server.create", "user.login"],
  "permissions": [],
  "settings": {
    "apiKey": {
      "type": "text",
      "label": "API Key",
      "secret": true
    },
    "enabled": {
      "type": "boolean",
      "label": "Enable Feature",
      "default": true
    }
  }
}
```

## server.js — Server-Side API

```js
export default function(sodium) {
  // ── HTTP Routes ──
  // Register API routes under /api/plugins/<plugin-id>/
  sodium.http.registerRoutes(router => {
    router.get('/stats', sodium.auth.requireUser, (req, res) => {
      const data = sodium.db.find('stats');
      res.json({ stats: data });
    });

    router.post('/action', sodium.auth.requireUser, (req, res) => {
      sodium.db.insert('logs', { action: req.body.action, userId: req.user.id });
      res.json({ success: true });
    });
  });

  // ── Middleware ──
  // Runs before all /api routes
  sodium.http.addMiddleware((req, res, next) => {
    sodium.logger.info(`Request: ${req.method} ${req.path}`);
    next();
  });

  // ── Database ──
  // Register custom collections (auto-prefixed with plugins_<id>_)
  sodium.db.registerCollections(['stats', 'logs']);
  sodium.db.insert('stats', { id: 'visits', count: 0 });

  // ── Read Core Data (read-only) ──
  const users = sodium.data.getUsers();
  const servers = sodium.data.getServers();
  const node = sodium.data.findNode('some-id');

  // ── Hooks ──
  // Intercept core events (must be declared in manifest "hooks" array)
  sodium.hooks.on('server.create', async (ctx) => {
    sodium.logger.info(`Server created: ${ctx.serverId}`);
  });

  // ── Cron Jobs ──
  sodium.cron.register('cleanup', '0 */6 * * *', async () => {
    sodium.logger.info('Running cleanup...');
  });

  // ── Plugin Config ──
  const apiKey = sodium.config.get('apiKey');
  sodium.config.set('lastRun', new Date().toISOString());

  // ── Events (plugin-to-plugin) ──
  sodium.events.on('other-plugin:data-ready', (data) => {
    sodium.logger.info('Received data from another plugin');
  });
  sodium.events.emit('my-plugin:initialized', { version: sodium.meta.version });

  // ── Inter-Plugin Calls ──
  // Call methods exported by other plugins
  // const result = sodium.plugins.call('other-plugin', 'methodName', arg1, arg2);

  // ── UI Declarations ──
  // Pages (creates route + optional sidebar entry)
  sodium.ui.addPage({
    id: 'dashboard',
    path: '/plugins/my-plugin',
    title: 'My Plugin',
    icon: 'analytics',
    sidebar: true         // show in sidebar (default: true)
  });

  // Sidebar items (manual, if you need custom ones)
  sodium.ui.addSidebarItem({
    href: '/plugins/my-plugin/stats',
    icon: 'bar_chart',
    label: 'Plugin Stats'
  });

  // Server tabs (shown on individual server pages)
  sodium.ui.addServerTab({
    id: 'analytics',
    label: 'Analytics',
    icon: 'insights'
  });

  // Dashboard widgets
  sodium.ui.addDashboardWidget({
    id: 'overview',
    title: 'Plugin Overview',
    size: 'medium'         // 'small', 'medium', 'large'
  });

  // Admin pages (shown under Administration section)
  sodium.ui.addAdminPage({
    id: 'settings',
    title: 'My Plugin Admin',
    icon: 'admin_panel_settings'
  });

  // ── Export Methods ──
  // Other plugins can call these via sodium.plugins.call()
  return {
    getStats() {
      return sodium.db.find('stats');
    }
  };
}
```

## client.js — Client-Side API

```js
export default function(sodium) {
  // sodium.plugin = { id, name, version }
  // sodium.api(path, opts) — fetch from plugin routes
  // sodium.navigate(path) — SPA navigation
  // sodium.toast.success/error/info(msg)
  // sodium.modal.show(opts) / sodium.modal.confirm(opts)
  // sodium.escapeHtml(str)

  // ── Render Pages ──
  sodium.ui.onRenderPage('dashboard', async (container) => {
    container.innerHTML = '<div class="loading-spinner"></div>';

    const res = await sodium.api('/stats');
    const data = await res.json();

    container.innerHTML = `
      <div class="plugin-dashboard">
        <h1>${sodium.escapeHtml(sodium.plugin.name)}</h1>
        <div class="stats-grid">
          ${data.stats.map(s => `
            <div class="stat-card">
              <span class="stat-value">${s.count}</span>
              <span class="stat-label">${sodium.escapeHtml(s.id)}</span>
            </div>
          `).join('')}
        </div>
        <button id="plugin-action-btn" class="btn btn-primary">
          Run Action
        </button>
      </div>
    `;

    container.querySelector('#plugin-action-btn').onclick = async () => {
      await sodium.api('/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'clicked' })
      });
      sodium.toast.success('Action executed!');
    };
  });

  // ── Render Server Tabs ──
  sodium.ui.onRenderServerTab('analytics', async (container, serverId) => {
    const res = await sodium.api(`/server/${serverId}/analytics`);
    const data = await res.json();

    container.innerHTML = `
      <div class="analytics-tab">
        <h2>Server Analytics</h2>
        <p>Uptime: ${data.uptime || 'N/A'}</p>
      </div>
    `;
  });

  // ── Render Dashboard Widgets ──
  sodium.ui.onRenderWidget('overview', async (container) => {
    const res = await sodium.api('/stats');
    const data = await res.json();

    container.innerHTML = `
      <div class="widget-content">
        <span class="widget-number">${data.stats?.length || 0}</span>
        <span class="widget-label">Total Records</span>
      </div>
    `;
  });

  // ── Render Admin Pages ──
  sodium.ui.onRenderAdminPage('settings', async (container) => {
    container.innerHTML = `
      <div class="admin-section">
        <div class="section-header">
          <h2>My Plugin Settings</h2>
        </div>
        <p>Configure the plugin from here.</p>
      </div>
    `;
  });

  // ── Events ──
  sodium.events.on('page.rendered', (data) => {
    console.log('Page rendered:', data);
  });

  return {
    cleanup() {
      // Called when plugin is deactivated
    }
  };
}
```

## Available Hooks

| Hook | Description | Context |
|------|-------------|---------|
| `server.create` | Server is being created | `{ serverId, userId, name }` |
| `server.delete` | Server is being deleted | `{ serverId, userId }` |
| `server.power` | Power action on server | `{ serverId, action }` |
| `user.login` | User is logging in | `{ userId, username }` |
| `user.register` | User is registering | `{ username, email }` |
| `user.delete` | User is being deleted | `{ userId }` |

Hooks can prevent the action by calling `ctx.deny(reason)`.

## Auth Middlewares

Use these in your route handlers:

- `sodium.auth.requireUser` — Requires valid JWT token, sets `req.user`
- `sodium.auth.requireAdmin` — Requires admin role

## Installation

1. Create a folder in `data/plugins/` with your plugin files
2. Go to **Admin → Plugins** and enable the plugin
3. The plugin loads automatically on next startup
