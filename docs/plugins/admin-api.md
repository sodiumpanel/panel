# Admin API

Sodium exposes REST endpoints for managing plugins. All endpoints require admin authentication via a JWT token in the `Authorization` header.

Base path: `/api/admin/plugins`

## List all plugins

Returns all discovered plugins with their metadata and current state.

```http
GET /api/admin/plugins
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "plugins": [
    {
      "id": "hello-world",
      "name": "Hello World",
      "version": "1.0.0",
      "type": "utility",
      "author": "sodium-dev",
      "description": "A test plugin that demonstrates the plugin system.",
      "active": true,
      "hooks": ["server:beforeCreate"],
      "permissions": [],
      "settings": {
        "greeting": {
          "type": "string",
          "label": "Greeting Message",
          "default": "Hello from Sodium!"
        }
      }
    }
  ]
}
```

## Activate a plugin

Activates a discovered plugin by ID. Loads its server module, registers routes, hooks, crons, and UI elements.

```http
POST /api/admin/plugins/:id/activate
Authorization: Bearer <admin-token>
```

Success response:

```json
{ "success": true }
```

Error response (plugin not found):

```json
{ "error": "Plugin \"nonexistent\" not found" }
```

## Deactivate a plugin

Deactivates an active plugin. Removes its routes, hooks, crons, and UI elements. Database data is preserved.

```http
POST /api/admin/plugins/:id/deactivate
Authorization: Bearer <admin-token>
```

Success response:

```json
{ "success": true }
```

Error response:

```json
{ "error": "Plugin \"nonexistent\" not found" }
```

## Get plugin settings

Returns the settings schema (from `plugin.json`) and current configured values.

```http
GET /api/admin/plugins/:id/settings
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "schema": {
    "greeting": {
      "type": "string",
      "label": "Greeting Message",
      "default": "Hello from Sodium!"
    }
  },
  "values": {
    "greeting": "Custom greeting!"
  }
}
```

If the plugin has not been configured yet, `values` will be an empty object `{}`.

Error response (plugin not found):

```json
{ "error": "Plugin not found" }
```

## Save plugin settings

Update the settings values for a plugin. Accepts a `values` object with the new settings.

```http
PUT /api/admin/plugins/:id/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "values": {
    "greeting": "New greeting message!"
  }
}
```

Success response:

```json
{ "success": true }
```

The new values are persisted immediately in the Sodium configuration and are available to the plugin via `sodium.config.get()` on the next call.

## Plugin client data

This endpoint is used internally by the Sodium frontend to load active plugin UI data. It does not require admin authentication.

```http
GET /api/plugins/client-data
```

Response:

```json
{
  "plugins": [
    {
      "id": "hello-world",
      "name": "Hello World",
      "type": "utility",
      "pages": null,
      "sidebarItems": [],
      "serverTabs": [],
      "dashboardWidgets": [
        { "id": "hello-widget", "title": "Hello World", "size": "small" }
      ],
      "adminTabs": [],
      "hasClient": false
    }
  ]
}
```

Only active plugins are included in the response.

## Plugin custom routes

Plugin-registered HTTP routes are accessible at:

```
/api/plugins/:pluginId/<route>
```

These are not admin endpoints — they are the custom routes registered by each plugin via `sodium.http.registerRoutes()`. Authentication depends on the plugin's implementation.

Example:

```http
GET /api/plugins/hello-world/greet
```

```json
{ "message": "Hello from Sodium!", "timestamp": 1740450000000 }
```
