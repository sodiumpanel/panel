# Sodium Plugin System

Complete plugin system for Sodium, inspired by Blueprint for Pterodactyl.

## Plugin Structure

```
plugins/
├── my-plugin/
│   ├── plugin.json          # Manifest (required)
│   ├── index.js              # JS code (optional)
│   ├── assets/               # Static assets
│   │   ├── style.css
│   │   └── client.js
│   ├── injections/           # HTML templates for injection
│   │   └── my-component.html
│   └── pages/                # Custom pages
│       └── example.html
└── simple-plugin.js          # Single-file plugin
```

## plugin.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Your Name",
  "website": "https://example.com",
  "license": "MIT",
  
  "main": "index.js",
  
  "permissions": ["routes", "hooks", "ui", "websocket", "storage", "injections"],
  
  "sidebar": [
    {
      "path": "/my-page",
      "icon": "extension",
      "label": "My Page",
      "position": "bottom",
      "priority": 50,
      "adminOnly": false
    }
  ],
  
  "injections": [
    {
      "target": "inject-auth-login-providers",
      "file": "injections/oauth-buttons.html",
      "position": "append",
      "priority": 10
    },
    {
      "target": "inject-dashboard-header-after",
      "html": "<div class='banner'>Inline HTML injection</div>",
      "priority": 5
    }
  ],
  
  "styles": ["assets/style.css"],
  "scripts": ["assets/client.js"],
  
  "pages": [
    {
      "path": "/my-page",
      "title": "My Page",
      "template": "pages/my-page.html"
    }
  ],
  
  "settings": {
    "schema": [
      { "key": "api_key", "type": "string", "label": "API Key", "required": false },
      { "key": "enabled", "type": "boolean", "label": "Enable", "default": true }
    ]
  }
}
```

## Injection Points

Injection points allow you to add HTML content at specific UI locations.

### ID Naming Convention

All IDs follow the pattern: `inject-{area}-{location}-{position}`

### Auth Page

| ID | Description |
|----|-------------|
| `inject-auth-container-before` | Before the auth container |
| `inject-auth-header-before` | Before the header |
| `inject-auth-header-after` | After the header |
| `inject-auth-tabs-before` | Before the tabs |
| `inject-auth-tabs-after` | After the tabs |
| `inject-auth-login-before` | Before the login form |
| `inject-auth-login-fields-before` | Before login fields |
| `inject-auth-login-fields-after` | After login fields |
| `inject-auth-login-button-before` | Before the login button |
| `inject-auth-login-button-after` | After the login button |
| `inject-auth-login-providers` | **OAuth buttons (Google, Discord, GitHub)** |
| `inject-auth-login-after` | After the login form |
| `inject-auth-register-before` | Before the register form |
| `inject-auth-register-fields-before` | Before register fields |
| `inject-auth-register-fields-after` | After register fields |
| `inject-auth-register-button-before` | Before the register button |
| `inject-auth-register-button-after` | After the register button |
| `inject-auth-register-providers` | OAuth buttons for registration |
| `inject-auth-register-after` | After the register form |
| `inject-auth-container-after` | After the auth container |

### Dashboard

| ID | Description |
|----|-------------|
| `inject-dashboard-before` | Before the dashboard |
| `inject-dashboard-header-before` | Before the header |
| `inject-dashboard-header-after` | After the header (banners) |
| `inject-dashboard-stats-before` | Before stats |
| `inject-dashboard-stats-after` | After stats |
| `inject-dashboard-servers-before` | Before server list |
| `inject-dashboard-servers-after` | After server list |
| `inject-dashboard-after` | After the dashboard |

### Server View

| ID | Description |
|----|-------------|
| `inject-server-header-before` | Before the server header |
| `inject-server-header-info` | Additional info in header |
| `inject-server-header-actions` | Action buttons |
| `inject-server-header-after` | After the header |
| `inject-server-tabs-start` | Start of tabs (left) |
| `inject-server-tabs-end` | End of tabs (right) |
| `inject-server-console-before` | Before the console |
| `inject-server-console-actions` | Console action buttons |
| `inject-server-console-after` | After the console |
| `inject-server-files-toolbar-actions` | File manager actions |
| `inject-server-backups-actions` | Backup actions |

### Sidebar

| ID | Description |
|----|-------------|
| `inject-sidebar-header-before` | Before the sidebar header |
| `inject-sidebar-header-after` | After the header |
| `inject-sidebar-nav-start` | Start of navigation |
| `inject-sidebar-nav-end` | End of navigation |
| `inject-sidebar-footer-before` | Before the footer |
| `inject-sidebar-footer-after` | After the footer |

### Admin

| ID | Description |
|----|-------------|
| `inject-admin-sidebar-items` | Admin sidebar items |
| `inject-admin-content-before` | Before the content |
| `inject-admin-content-after` | After the content |
| `inject-admin-users-actions` | User actions |
| `inject-admin-servers-actions` | Server actions |
| `inject-admin-nodes-actions` | Node actions |

### Global

| ID | Description |
|----|-------------|
| `inject-global-head` | Inside `<head>` |
| `inject-global-body-start` | Start of `<body>` |
| `inject-global-body-end` | End of `<body>` |

## Plugin API (index.js)

```javascript
export default {
  async init(api) {
    // === INFO ===
    api.name              // Plugin name
    api.version           // Version
    api.manifest          // Full manifest
    api.path              // Plugin path
    
    // === HOOKS ===
    api.hook('server:ready', async (data) => {});
    // Events: server:init, server:routes, server:ready, ws:message
    
    // === ROUTES ===
    api.route.get('/api/my-route', (req, res) => {});
    api.route.post('/api/my-route', handler);
    api.route.put('/api/my-route', handler);
    api.route.delete('/api/my-route', handler);
    
    // === MIDDLEWARE ===
    api.middleware((req, res, next) => next());
    api.middleware('/api/path', handler);
    
    // === WEBSOCKET ===
    api.ws('custom_event', async (args, context) => {
      return { handled: true, data: ['response'] };
    });
    
    // === SIDEBAR ===
    api.sidebar({ path: '/my-page', icon: 'extension', label: 'My Page' });
    
    // === UI / INJECTION ===
    api.ui.style('css string');
    api.ui.styleUrl('/plugins/my-plugin/style.css');
    api.ui.script('js code');
    api.ui.scriptUrl('/plugins/my-plugin/client.js');
    api.ui.slot('auth:login:providers', { html: '<button>OAuth</button>' });
    api.ui.page('/my-page', { title: 'Page', html: '<div>Content</div>' });
    api.ui.component('my-button', { html: '<button>{{label}}</button>' });
    
    // Direct injection by ID
    api.ui.inject('inject-auth-login-providers', '<button>OAuth</button>', 'append', 10);
    
    // === STORAGE ===
    api.storage.set('key', value);
    api.storage.get('key');
    api.storage.delete('key');
    api.storage.getAll();
    
    // === SETTINGS ===
    api.settings.get('api_key');
    api.settings.set('api_key', 'value');
    api.settings.getAll();
    api.settings.getSchema();
    
    // === LOGGING ===
    api.log.info('message');
    api.log.warn('message');
    api.log.error('message');
    
    // === UTILS ===
    api.emit('custom:event', data);
    api.getPlugins();
    api.require('lib/helper.js');
  },
  
  async unload(api) {
    // Cleanup
  }
};
```

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plugins` | List loaded plugins |
| GET | `/api/plugins/available` | List available plugins |
| GET | `/api/plugins/assets` | Client assets (styles, scripts, injections) |
| GET | `/api/plugins/hooks` | Registered hooks |
| GET | `/api/plugins/injection-points` | Available injection points |
| GET | `/api/plugins/:name` | Plugin info |
| GET | `/api/plugins/:name/settings` | Plugin settings |
| PUT | `/api/plugins/:name/settings` | Update settings |
| POST | `/api/plugins/install` | Install plugin |
| POST | `/api/plugins/load/:name` | Load plugin |
| POST | `/api/plugins/unload/:name` | Unload plugin |
| POST | `/api/plugins/reload/:name` | Reload plugin |
| DELETE | `/api/plugins/:name` | Uninstall plugin |
| POST | `/api/plugins/:name/package` | Package as .sodium |

## Example: OAuth Plugin

```json
{
  "id": "oauth-providers",
  "name": "OAuth Providers",
  "version": "1.0.0",
  
  "injections": [
    {
      "target": "inject-auth-login-providers",
      "file": "injections/oauth-buttons.html"
    }
  ],
  
  "styles": ["assets/oauth.css"],
  "scripts": ["assets/oauth.js"],
  
  "settings": {
    "schema": [
      { "key": "google_client_id", "type": "string", "label": "Google Client ID" },
      { "key": "google_enabled", "type": "boolean", "label": "Enable Google", "default": false },
      { "key": "discord_client_id", "type": "string", "label": "Discord Client ID" },
      { "key": "discord_enabled", "type": "boolean", "label": "Enable Discord", "default": false }
    ]
  }
}
```

## .sodium Packages

Distribute plugins as `.sodium` files (tar.gz):

```bash
# Create package
POST /api/plugins/my-plugin/package

# Install from file/URL
POST /api/plugins/install
{ "source": "/path/to/plugin.sodium" }
{ "source": "https://example.com/plugin.sodium" }
```
