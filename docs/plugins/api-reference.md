# API Reference

When a plugin is activated, Sodium creates an API object and passes it to the plugin's `server.js` default export function. This object is conventionally named `sodium` and provides access to all plugin capabilities.

```js
export default function (sodium) {
  // sodium.db       — Database operations
  // sodium.http     — HTTP route registration
  // sodium.hooks    — Event hook subscription
  // sodium.cron     — Scheduled task registration
  // sodium.config   — Plugin settings access
  // sodium.ui       — UI element registration
  // sodium.plugins  — Inter-plugin communication
  // sodium.logger   — Logging utilities
}
```

## Namespaces

### sodium.db

Database operations scoped to the plugin. All collection names are automatically prefixed with `plugins_<plugin-id>_` to prevent collisions.

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerCollections` | `(names: string[]) => void` | Register one or more collections. Creates the backing table if using an external database. |
| `find` | `(collection: string, query?: object) => object[]` | Find all records matching the query. Returns all records if no query is provided. |
| `findOne` | `(collection: string, query?: object) => object \| null` | Find the first record matching the query, or `null`. |
| `insert` | `(collection: string, record: object) => object` | Insert a record. A UUID `id` is auto-generated if not provided. |
| `update` | `(collection: string, id: string, updates: object) => object` | Update a record by ID with partial data. |
| `delete` | `(collection: string, id: string) => boolean` | Delete a record by ID. |

See [Database](database.md) for detailed usage.

### sodium.http

HTTP route registration using Express.js routers.

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerRoutes` | `(fn: (router: express.Router) => void) => void` | Register routes via a callback that receives an Express Router. Routes are mounted at `/api/plugins/<plugin-id>/`. |

See [HTTP Routes](http-routes.md) for detailed usage.

### sodium.hooks

Event hook subscription system.

| Method | Signature | Description |
|--------|-----------|-------------|
| `on` | `(event: string, handler: (ctx) => Promise<void>, priority?: number) => void` | Subscribe to a hook event. Lower priority numbers execute first. Default priority is `10`. The event must be declared in `plugin.json`. |

See [Hooks](hooks.md) for the full event reference.

### sodium.cron

Scheduled task registration.

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `(id: string, schedule: string, handler: () => Promise<void>) => void` | Register a cron job. The schedule uses standard 5-field cron syntax. |

See [Cron Jobs](cron-jobs.md) for syntax and examples.

### sodium.config

Read and write plugin settings persisted in the Sodium configuration.

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(key: string) => any` | Get a single setting value. Returns `undefined` if not set. |
| `set` | `(key: string, value: any) => void` | Set a single setting value. Persisted immediately. |
| `getAll` | `() => object` | Get all settings for this plugin as a key-value object. |

See [Settings](settings.md) for schema definition and usage patterns.

### sodium.ui

Register UI elements that the frontend will render.

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerPages` | `(pages: object) => void` | Register custom page definitions. |
| `addSidebarItem` | `(item: object) => void` | Add an item to the main sidebar navigation. |
| `addServerTab` | `(tab: object) => void` | Add a tab to the server detail view. |
| `addDashboardWidget` | `(widget: object) => void` | Add a widget to the dashboard. |
| `addAdminTab` | `(tab: object) => void` | Add a tab to the admin panel. |

See [UI Components](ui-components.md) for field specifications.

### sodium.plugins

Inter-plugin communication.

| Method | Signature | Description |
|--------|-----------|-------------|
| `call` | `(pluginId: string, method: string, ...args: any[]) => any` | Call a method exported by another active plugin. Throws if the target plugin is not active or the method does not exist. |

See [Inter-Plugin Communication](inter-plugin.md) for patterns and examples.

### sodium.logger

Logging utilities. All messages are automatically prefixed with `[Plugin:<plugin-id>]`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `info` | `(message: string) => void` | Log an informational message. |
| `warn` | `(message: string) => void` | Log a warning message. |
| `error` | `(message: string) => void` | Log an error message. |

### Example output

```
INFO  [Plugin:my-plugin] Starting data sync...
WARN  [Plugin:my-plugin] Rate limit approaching threshold
ERROR [Plugin:my-plugin] Failed to connect to external API
```

## Return value

The `server.js` default export function can optionally return an object. If it does, the returned object's methods become available for inter-plugin communication via `sodium.plugins.call()`:

```js
export default function (sodium) {
  // ... plugin setup ...

  return {
    getStatus() {
      return { healthy: true };
    },
    processData(input) {
      return transform(input);
    }
  };
}
```

Other plugins can then call:

```js
const status = sodium.plugins.call('my-plugin', 'getStatus');
const result = sodium.plugins.call('my-plugin', 'processData', rawData);
```
