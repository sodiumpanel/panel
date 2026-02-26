# Inter-Plugin Communication

Plugins can expose methods that other plugins can call. This enables modular architectures where plugins collaborate without tight coupling.

## Exposing methods

To expose methods, return an object from your `server.js` default export function:

```js
// Plugin: user-utils
export default function (sodium) {
  sodium.db.registerCollections(['user_scores']);

  return {
    getScore(userId) {
      const record = sodium.db.findOne('user_scores', { userId });
      return record?.score || 0;
    },

    addScore(userId, points) {
      const existing = sodium.db.findOne('user_scores', { userId });
      if (existing) {
        sodium.db.update('user_scores', existing.id, {
          score: existing.score + points
        });
      } else {
        sodium.db.insert('user_scores', { userId, score: points });
      }
    },

    resetScore(userId) {
      const existing = sodium.db.findOne('user_scores', { userId });
      if (existing) {
        sodium.db.update('user_scores', existing.id, { score: 0 });
      }
    }
  };
}
```

## Calling another plugin's methods

Use `sodium.plugins.call()` to invoke a method on another plugin:

```js
sodium.plugins.call(pluginId, methodName, ...args);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginId` | `string` | The target plugin's ID |
| `methodName` | `string` | The method name to call |
| `...args` | `any` | Arguments to pass to the method |

### Example

```js
// Plugin: leaderboard (calls methods from user-utils)
export default function (sodium) {
  sodium.http.registerRoutes((router) => {
    router.post('/award', (req, res) => {
      const { userId, points } = req.body;

      // Call a method on the user-utils plugin
      sodium.plugins.call('user-utils', 'addScore', userId, points);

      const newScore = sodium.plugins.call('user-utils', 'getScore', userId);
      res.json({ userId, newScore });
    });

    router.get('/score/:userId', (req, res) => {
      const score = sodium.plugins.call('user-utils', 'getScore', req.params.userId);
      res.json({ userId: req.params.userId, score });
    });
  });
}
```

## Error handling

`sodium.plugins.call()` throws in two cases:

1. **Target plugin is not active:**
   ```
   Error: Plugin "user-utils" is not active
   ```

2. **Method does not exist:**
   ```
   Error: Plugin "user-utils" has no method "nonExistent"
   ```

Always handle these errors if the target plugin might not be installed or active:

```js
try {
  const result = sodium.plugins.call('optional-plugin', 'getData');
  // use result
} catch (err) {
  sodium.logger.warn(`Optional plugin not available: ${err.message}`);
  // fallback behavior
}
```

## Design patterns

### Optional dependencies

Check if a plugin is available before calling it:

```js
try {
  sodium.plugins.call('analytics', 'trackEvent', 'server.created', { serverId });
} catch {
  // analytics plugin not installed, skip tracking
}
```

### Service plugins

Create plugins that act as shared services for other plugins:

```js
// Plugin: cache-service
export default function (sodium) {
  const cache = new Map();

  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value, ttlMs) {
      cache.set(key, {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : null
      });
    },
    delete(key) {
      cache.delete(key);
    }
  };
}
```

Other plugins can then use the cache:

```js
sodium.plugins.call('cache-service', 'set', 'user:123', userData, 300000);
const cached = sodium.plugins.call('cache-service', 'get', 'user:123');
```

## Important notes

- Methods are synchronous by default. If you need async operations, the caller must handle the returned Promise.
- Only methods returned from the `server.js` default export are callable. Internal functions are not exposed.
- When a plugin is deactivated, its methods become unavailable and any calls to it will throw.
- There is no dependency resolution. If plugin A depends on plugin B, make sure plugin B is activated first (plugins are activated in directory listing order).
