# Manifest Reference (plugin.json)

Every plugin must have a `plugin.json` file in its root directory. This file defines the plugin's identity, declares which hooks it uses, and specifies its configurable settings.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier. Must match the directory name. Use lowercase with hyphens (e.g., `my-plugin`). If omitted, the directory name is used. |
| `name` | `string` | Yes | Human-readable display name shown in the admin panel. |
| `version` | `string` | Yes | Semver version string (e.g., `1.0.0`, `2.3.1`). |
| `type` | `string` | No | Category for organization. Common values: `utility`, `integration`, `security`, `monitoring`, `analytics`. |
| `author` | `string` | No | Author name or organization. |
| `description` | `string` | No | Brief description shown in the admin panel plugin list. |
| `hooks` | `string[]` | No | List of hook events this plugin will subscribe to. Only declared hooks can be registered at runtime. See [Hooks](hooks.md). |
| `permissions` | `string[]` | No | Permissions this plugin requires. Reserved for future use. |
| `settings` | `object` | No | Configurable settings schema. Keys are setting names, values are setting descriptors. See [Settings](settings.md). |

## Minimal example

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0"
}
```

## Complete example

```json
{
  "id": "server-guard",
  "name": "Server Guard",
  "version": "2.1.0",
  "type": "security",
  "author": "sodium-dev",
  "description": "Prevents server creation during maintenance windows.",
  "hooks": [
    "server:beforeCreate",
    "auth:afterLogin"
  ],
  "permissions": [],
  "settings": {
    "maintenanceMode": {
      "type": "boolean",
      "label": "Enable Maintenance Mode",
      "default": false
    },
    "maintenanceMessage": {
      "type": "string",
      "label": "Maintenance Message",
      "default": "Server creation is temporarily disabled."
    },
    "maxServersPerUser": {
      "type": "number",
      "label": "Max Servers Per User",
      "default": 5
    }
  }
}
```

## ID conventions

- Use lowercase letters, numbers, and hyphens only
- Must match the plugin's directory name under `data/plugins/`
- Must be unique across all installed plugins
- Examples: `hello-world`, `server-guard`, `discord-integration`, `backup-manager`

## Hook declaration

The `hooks` array acts as a whitelist. If your `server.js` attempts to register a hook that is not listed in this array, the registration will be silently skipped and a warning will be logged:

```
WARN  [Plugin:my-plugin] Hook "server:onDelete" not declared in manifest, skipping
```

This prevents plugins from subscribing to events they did not declare upfront. Always list every hook your plugin uses.

## Settings schema

Each key in the `settings` object defines a configurable value. The descriptor object supports:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Data type: `string`, `number`, `boolean` |
| `label` | `string` | Human-readable label for the admin UI |
| `default` | `any` | Default value used when no value has been configured |

Settings are persisted in the Sodium configuration under `plugins.settings.<plugin-id>` and can be read/written at runtime via `sodium.config`. See [Settings](settings.md) for details.
