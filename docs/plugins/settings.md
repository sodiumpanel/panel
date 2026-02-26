# Settings

Plugins can define configurable settings with a schema in `plugin.json` and access them at runtime via `sodium.config`. Settings are persisted in the Sodium configuration and can be managed through the admin panel or API.

## Defining settings

Add a `settings` object to your `plugin.json`. Each key is a setting name, and each value is a descriptor:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "settings": {
    "apiUrl": {
      "type": "string",
      "label": "External API URL",
      "default": "https://api.example.com"
    },
    "maxRetries": {
      "type": "number",
      "label": "Maximum Retries",
      "default": 3
    },
    "debugMode": {
      "type": "boolean",
      "label": "Enable Debug Mode",
      "default": false
    }
  }
}
```

### Setting descriptor fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Data type: `string`, `number`, or `boolean` |
| `label` | `string` | Yes | Human-readable label for the admin UI |
| `default` | `any` | No | Default value when the setting has not been configured |

## Reading settings at runtime

### Get a single setting

```js
const apiUrl = sodium.config.get('apiUrl');
// Returns the configured value, or undefined if not set
```

To use a default value when the setting is not configured:

```js
const apiUrl = sodium.config.get('apiUrl') || 'https://api.example.com';
```

### Get all settings

```js
const allSettings = sodium.config.getAll();
// Returns: { apiUrl: "https://...", maxRetries: 3, debugMode: false }
// Returns an empty object {} if no settings have been configured
```

## Writing settings at runtime

Plugins can update their own settings programmatically:

```js
// Set a single value
sodium.config.set('lastSyncTime', Date.now());

// Settings are persisted immediately to the Sodium configuration
```

This is useful for storing runtime state that should survive restarts, such as timestamps, tokens, or cached values.

## Storage

Settings are stored in the Sodium configuration under the path `plugins.settings.<plugin-id>`:

```json
{
  "plugins": {
    "enabled": true,
    "active": ["my-plugin"],
    "settings": {
      "my-plugin": {
        "apiUrl": "https://custom-api.example.com",
        "maxRetries": 5,
        "debugMode": true
      }
    }
  }
}
```

## Admin API

Administrators can read and update plugin settings via the REST API:

### Get settings

```http
GET /api/admin/plugins/:id/settings
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "schema": {
    "apiUrl": { "type": "string", "label": "External API URL", "default": "https://api.example.com" },
    "maxRetries": { "type": "number", "label": "Maximum Retries", "default": 3 }
  },
  "values": {
    "apiUrl": "https://custom-api.example.com",
    "maxRetries": 5
  }
}
```

The response includes both the schema (from `plugin.json`) and the current values.

### Save settings

```http
PUT /api/admin/plugins/:id/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "values": {
    "apiUrl": "https://new-api.example.com",
    "maxRetries": 10,
    "debugMode": false
  }
}
```

## Complete example

```json
// plugin.json
{
  "id": "discord-notify",
  "name": "Discord Notifications",
  "version": "1.0.0",
  "type": "integration",
  "hooks": ["server:onCreate", "server:onDelete"],
  "settings": {
    "webhookUrl": {
      "type": "string",
      "label": "Discord Webhook URL",
      "default": ""
    },
    "notifyOnCreate": {
      "type": "boolean",
      "label": "Notify on Server Create",
      "default": true
    },
    "notifyOnDelete": {
      "type": "boolean",
      "label": "Notify on Server Delete",
      "default": true
    }
  }
}
```

```js
// server.js
export default function (sodium) {
  async function sendDiscordMessage(content) {
    const webhookUrl = sodium.config.get('webhookUrl');
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  }

  sodium.hooks.on('server:onCreate', async (ctx) => {
    if (!sodium.config.get('notifyOnCreate')) return;
    await sendDiscordMessage(`Server "${ctx.server.name}" has been created.`);
  });

  sodium.hooks.on('server:onDelete', async (ctx) => {
    if (!sodium.config.get('notifyOnDelete')) return;
    await sendDiscordMessage(`Server "${ctx.server.name}" has been deleted.`);
  });
}
```
