# Plugin Lifecycle

This document describes how Sodium discovers, loads, activates, and deactivates plugins.

## Discovery

At server startup, the plugin manager scans the `data/plugins/` directory:

1. Reads all subdirectories inside `data/plugins/`
2. For each directory, checks if a `plugin.json` manifest exists
3. Parses the manifest and creates an internal plugin record
4. Skips directories without a valid `plugin.json` (logs a warning on parse errors)

```
data/plugins/
  my-plugin/          <-- Has plugin.json -> discovered
  another-plugin/     <-- Has plugin.json -> discovered
  incomplete/         <-- No plugin.json  -> skipped
```

## Loading

After discovery, the plugin manager checks the Sodium configuration to determine which plugins should be active:

```json
{
  "plugins": {
    "enabled": true,
    "active": ["my-plugin", "another-plugin"]
  }
}
```

If `plugins.enabled` is `false` or missing, no plugins are loaded at all. The system exits early without scanning.

Plugins listed in the `active` array are activated automatically. Discovered plugins not in this list are registered but remain inactive.

## Startup sequence

The full startup sequence during `startServer()`:

```
1. Server starts
2. WebSocket setup
3. Redis initialization (if configured)
4. Scheduler starts
5. loadPlugins() called:
   a. Scan data/plugins/ directory
   b. Parse each plugin.json manifest
   c. Activate plugins listed in config.plugins.active
   d. Start the cron runner (checks every 60 seconds)
6. HTTP server begins listening
```

## Activation

When a plugin is activated (either at startup or via the admin API):

1. **API object creation** — A new `sodium` API object is created for the plugin, scoped to its ID
2. **Server module loading** — If `server.js` exists, it is dynamically imported and its default export is called with the API object
3. **Method registration** — If the default export returns an object, its methods are stored for inter-plugin communication
4. **Client module detection** — If `client.js` exists, its path is stored for frontend use
5. **Active list update** — The plugin ID is added to `config.plugins.active` and persisted
6. **Log entry** — `[Plugins] Activated "my-plugin"` is logged

During step 2, the plugin's `server.js` typically:
- Registers database collections
- Sets up HTTP routes
- Subscribes to hooks
- Registers cron jobs
- Registers UI elements

All of these registrations are tied to the plugin's API object and will be cleaned up on deactivation.

## Deactivation

When a plugin is deactivated via the admin API:

1. **Cleanup** — The API object's `_cleanup()` method is called, which:
   - Removes all hooks registered by this plugin
   - Clears all registered cron jobs
2. **State reset** — All internal state is cleared:
   - Router (HTTP routes become unavailable)
   - Pages, sidebar items, server tabs, dashboard widgets, admin tabs
   - Server module reference
   - Exposed methods
3. **Active list update** — The plugin ID is removed from `config.plugins.active` and persisted
4. **Log entry** — `[Plugins] Deactivated "my-plugin"` is logged

After deactivation:
- HTTP routes under `/api/plugins/<id>/` stop responding
- UI elements are no longer sent to the frontend
- Hooks no longer fire
- Cron jobs no longer execute
- Inter-plugin calls to this plugin throw errors
- Database collections and their data are **not deleted** (data persists)

## Reactivation

A plugin can be reactivated at any time via the admin API. The full activation sequence runs again:
- `server.js` is re-imported (note: Node.js may serve the cached module)
- Routes, hooks, crons, and UI elements are re-registered
- Previously stored database data is still available

## Plugin states

A plugin can be in one of two states:

| State | Description |
|-------|-------------|
| **Inactive** | Discovered and registered but not running. No routes, hooks, or crons active. |
| **Active** | Fully running. Routes mounted, hooks subscribed, crons scheduled, UI elements registered. |

## Cron runner

The cron runner is a global interval that runs every 60 seconds. It iterates over all active plugins, checks their registered cron jobs against the current time, and executes matching handlers. The runner starts once after all plugins are loaded, regardless of whether any plugins have cron jobs.

## Error resilience

The plugin system is designed to be resilient:

- **Manifest parse errors** — Logged as warnings; the plugin is skipped but others continue loading
- **Server module load errors** — Logged as warnings; the plugin is marked as active but may lack functionality
- **Hook handler errors** — Caught and logged; other hooks continue executing
- **Cron handler errors** — Caught and logged; other cron jobs continue
- **One plugin's failure does not affect other plugins or the core system**
