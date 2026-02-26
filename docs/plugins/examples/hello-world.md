# Example: Hello World

A simple plugin that demonstrates the core features of the plugin system: HTTP routes, database collections, hooks, dashboard widgets, and inter-plugin methods.

This plugin is included in the repository at `data/plugins/hello-world/`.

## Structure

```
data/plugins/hello-world/
  plugin.json
  server.js
```

## plugin.json

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "type": "utility",
  "author": "sodium-dev",
  "description": "A test plugin that demonstrates the Sodium plugin system.",
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
```

## server.js

```js
export default function (sodium) {
  sodium.logger.info('Hello World plugin loaded!');

  // Register a custom collection
  sodium.db.registerCollections(['greetings']);

  // Register API routes
  sodium.http.registerRoutes((router) => {
    router.get('/greet', (req, res) => {
      const greeting = sodium.config.get('greeting') || 'Hello from Sodium!';
      res.json({ message: greeting, timestamp: Date.now() });
    });

    router.get('/greetings', (req, res) => {
      const all = sodium.db.find('greetings');
      res.json(all);
    });

    router.post('/greetings', (req, res) => {
      const record = sodium.db.insert('greetings', {
        message: req.body?.message || 'Hello!',
        createdAt: new Date().toISOString()
      });
      res.json(record);
    });
  });

  // Register a hook
  sodium.hooks.on('server:beforeCreate', async (ctx) => {
    sodium.logger.info(`Server being created: ${ctx.name || 'unknown'}`);
  });

  // Register a dashboard widget
  sodium.ui.addDashboardWidget({
    id: 'hello-widget',
    title: 'Hello World',
    size: 'small'
  });

  // Expose methods for inter-plugin communication
  return {
    getGreeting() {
      return sodium.config.get('greeting') || 'Hello from Sodium!';
    },
    addGreeting(message) {
      return sodium.db.insert('greetings', {
        message,
        createdAt: new Date().toISOString()
      });
    }
  };
}
```

## Features demonstrated

### HTTP routes

Three endpoints registered at `/api/plugins/hello-world/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/greet` | Returns the configured greeting message |
| GET | `/greetings` | Lists all stored greetings |
| POST | `/greetings` | Creates a new greeting record |

### Database

Uses a `greetings` collection (stored internally as `plugins_hello-world_greetings`) to persist greeting records.

### Hooks

Subscribes to `server:beforeCreate` to log when a server is being created. The hook is declared in the manifest.

### Settings

Defines a `greeting` setting that can be configured via the admin panel. The greeting message is used in the `/greet` endpoint.

### Dashboard widget

Registers a small dashboard widget titled "Hello World".

### Inter-plugin methods

Exposes two methods:
- `getGreeting()` — Returns the current greeting message
- `addGreeting(message)` — Inserts a new greeting into the database

Other plugins can call them:

```js
const greeting = sodium.plugins.call('hello-world', 'getGreeting');
sodium.plugins.call('hello-world', 'addGreeting', 'Hi there!');
```

## Testing

```bash
# Get the greeting
curl http://localhost:3000/api/plugins/hello-world/greet

# Create a greeting
curl -X POST http://localhost:3000/api/plugins/hello-world/greetings \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi from curl!"}'

# List all greetings
curl http://localhost:3000/api/plugins/hello-world/greetings
```
