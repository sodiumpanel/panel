# Getting Started

This guide walks you through creating, installing, and activating your first Sodium plugin.

## Prerequisites

- A running Sodium panel instance
- File system access to the `data/plugins/` directory
- The plugin system enabled in your Sodium configuration

## Step 1: Enable the plugin system

Make sure your Sodium configuration includes:

```json
{
  "plugins": {
    "enabled": true,
    "active": []
  }
}
```

This is stored in the main config file managed by Sodium's database layer. If you are using the file-based database, this lives in `data/config.json`. For external databases (MySQL, PostgreSQL, SQLite), it is stored in the config table.

## Step 2: Create the plugin directory

Create a new folder inside `data/plugins/`. The folder name should match your plugin ID:

```bash
mkdir -p data/plugins/my-first-plugin
```

## Step 3: Write the manifest

Create `data/plugins/my-first-plugin/plugin.json`:

```json
{
  "id": "my-first-plugin",
  "name": "My First Plugin",
  "version": "1.0.0",
  "type": "utility",
  "author": "Your Name",
  "description": "A simple plugin to learn the Sodium plugin system."
}
```

This is the minimum required manifest. See the [Manifest Reference](manifest.md) for all available fields.

## Step 4: Write the server module

Create `data/plugins/my-first-plugin/server.js`:

```js
export default function (sodium) {
  sodium.logger.info('My first plugin is running!');

  // Register a simple API endpoint
  sodium.http.registerRoutes((router) => {
    router.get('/hello', (req, res) => {
      res.json({ message: 'Hello from my first plugin!' });
    });
  });
}
```

This module:
1. Logs a message when the plugin is activated
2. Registers a GET endpoint at `/api/plugins/my-first-plugin/hello`

## Step 5: Activate the plugin

You have two options:

**Option A: Via the admin panel**

Navigate to the plugin management page in the Sodium admin panel and click "Activate" on your plugin.

**Option B: Via the admin API**

```bash
curl -X POST http://localhost:3000/api/admin/plugins/my-first-plugin/activate \
  -H "Authorization: Bearer <your-admin-token>"
```

**Option C: Via configuration**

Add your plugin ID to the `active` array in the config:

```json
{
  "plugins": {
    "enabled": true,
    "active": ["my-first-plugin"]
  }
}
```

Then restart Sodium.

## Step 6: Test your plugin

```bash
curl http://localhost:3000/api/plugins/my-first-plugin/hello
```

Expected response:

```json
{ "message": "Hello from my first plugin!" }
```

## Step 7: Check the logs

You should see in the Sodium logs:

```
INFO  [Plugin:my-first-plugin] My first plugin is running!
INFO  [Plugins] Activated "my-first-plugin"
```

## Final structure

```
data/plugins/my-first-plugin/
  plugin.json
  server.js
```

## Next steps

- [Manifest Reference](manifest.md) — Learn about all manifest fields
- [API Reference](api-reference.md) — Explore the full `sodium` API
- [Database](database.md) — Add persistent storage to your plugin
- [Hooks](hooks.md) — Intercept and modify core events
- [Examples](examples/) — See complete example plugins
