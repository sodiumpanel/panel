# Example: Server Guard

A security plugin that uses the hook deny mechanism to block server creation during maintenance windows or when a user exceeds a server limit.

## Structure

```
data/plugins/server-guard/
  plugin.json
  server.js
```

## plugin.json

```json
{
  "id": "server-guard",
  "name": "Server Guard",
  "version": "1.0.0",
  "type": "security",
  "author": "sodium-dev",
  "description": "Blocks server creation during maintenance or when limits are exceeded.",
  "hooks": ["server:beforeCreate", "auth:afterLogin"],
  "settings": {
    "maintenanceMode": {
      "type": "boolean",
      "label": "Enable Maintenance Mode",
      "default": false
    },
    "maintenanceMessage": {
      "type": "string",
      "label": "Maintenance Message",
      "default": "Server creation is temporarily disabled for maintenance."
    },
    "maxServersPerUser": {
      "type": "number",
      "label": "Max Servers Per User (0 = unlimited)",
      "default": 0
    }
  }
}
```

## server.js

```js
export default function (sodium) {
  sodium.logger.info('Server Guard active');
  sodium.db.registerCollections(['blocked_attempts']);

  // Block server creation during maintenance (high priority: runs first)
  sodium.hooks.on('server:beforeCreate', async (ctx) => {
    const maintenance = sodium.config.get('maintenanceMode');

    if (maintenance) {
      const message = sodium.config.get('maintenanceMessage')
        || 'Server creation is temporarily disabled.';

      sodium.db.insert('blocked_attempts', {
        userId: ctx.user?.id,
        reason: 'maintenance',
        timestamp: new Date().toISOString()
      });

      ctx.deny(message);
    }
  }, 1);

  // Enforce per-user server limit (normal priority)
  sodium.hooks.on('server:beforeCreate', async (ctx) => {
    const maxServers = sodium.config.get('maxServersPerUser');

    if (maxServers && maxServers > 0) {
      const userServerCount = ctx.user?.serverCount || 0;

      if (userServerCount >= maxServers) {
        sodium.db.insert('blocked_attempts', {
          userId: ctx.user?.id,
          reason: 'limit_exceeded',
          currentCount: userServerCount,
          limit: maxServers,
          timestamp: new Date().toISOString()
        });

        ctx.deny(`You have reached the maximum of ${maxServers} servers.`);
      }
    }
  }, 5);

  // Log all logins
  sodium.hooks.on('auth:afterLogin', async (ctx) => {
    sodium.logger.info(`User ${ctx.user?.username} logged in from ${ctx.ip}`);
  });

  // Admin API to view blocked attempts
  sodium.http.registerRoutes((router) => {
    router.get('/blocked', (req, res) => {
      const attempts = sodium.db.find('blocked_attempts');
      res.json(attempts);
    });

    router.delete('/blocked', (req, res) => {
      const all = sodium.db.find('blocked_attempts');
      for (const record of all) {
        sodium.db.delete('blocked_attempts', record.id);
      }
      res.json({ success: true, cleared: all.length });
    });
  });

  return {
    isMaintenanceMode() {
      return !!sodium.config.get('maintenanceMode');
    },
    getBlockedAttempts() {
      return sodium.db.find('blocked_attempts');
    }
  };
}
```

## Key concepts demonstrated

### Hook deny mechanism

The `server:beforeCreate` hook receives a context with a `deny()` method. Calling `ctx.deny(reason)` prevents the server from being created and stops further hook execution.

### Priority ordering

Two handlers subscribe to the same hook with different priorities:
- Priority `1`: Maintenance check (runs first)
- Priority `5`: Server limit check (runs second, only if maintenance check passes)

If the maintenance check denies, the limit check never runs.

### Multiple hooks

The plugin subscribes to both `server:beforeCreate` and `auth:afterLogin`, demonstrating how a single plugin can interact with multiple system events.

### Audit trail

Blocked attempts are stored in a database collection, providing an audit trail accessible via the `/blocked` API endpoint.
