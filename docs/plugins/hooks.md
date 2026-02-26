# Hooks

The hook system allows plugins to intercept and modify core Sodium events. Hooks are priority-based and support a deny mechanism to block actions.

## Subscribing to hooks

Use `sodium.hooks.on()` to subscribe to an event:

```js
sodium.hooks.on('server:beforeCreate', async (ctx) => {
  // Your logic here
}, priority);
```

Parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `event` | `string` | — | The hook event name. Must be declared in `plugin.json`. |
| `handler` | `(ctx) => Promise<void>` | — | Async handler function that receives the event context. |
| `priority` | `number` | `10` | Execution order. Lower numbers run first. |

## Manifest declaration

Every hook your plugin uses must be declared in the `hooks` array of your `plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "hooks": ["server:beforeCreate", "auth:afterLogin"]
}
```

If you try to register a hook not listed in the manifest, it will be skipped and a warning logged:

```
WARN  [Plugin:my-plugin] Hook "server:onDelete" not declared in manifest, skipping
```

## Available hooks

### server:beforeCreate

Fired before a server is created. Can be used to validate, modify, or deny the creation.

| Context field | Type | Description |
|---------------|------|-------------|
| `user` | `object` | The user requesting the server creation |
| `name` | `string` | The server name |
| `node` | `object` | The selected node |

```js
sodium.hooks.on('server:beforeCreate', async (ctx) => {
  if (ctx.user.serverCount >= 5) {
    ctx.deny('You have reached the maximum number of servers.');
  }
});
```

### server:onCreate

Fired after a server has been successfully created. Cannot deny.

| Context field | Type | Description |
|---------------|------|-------------|
| `server` | `object` | The newly created server object |
| `user` | `object` | The user who created the server |

```js
sodium.hooks.on('server:onCreate', async (ctx) => {
  sodium.logger.info(`Server "${ctx.server.name}" created by ${ctx.user.username}`);
});
```

### server:onStatusChange

Fired when a server power action is executed (start, stop, restart, kill).

| Context field | Type | Description |
|---------------|------|-------------|
| `server` | `object` | The server object |
| `action` | `string` | The power action: `start`, `stop`, `restart`, or `kill` |
| `user` | `object` | The user who triggered the action |

```js
sodium.hooks.on('server:onStatusChange', async (ctx) => {
  sodium.logger.info(`Server "${ctx.server.name}" action: ${ctx.action}`);
});
```

### server:onDelete

Fired when a server is deleted.

| Context field | Type | Description |
|---------------|------|-------------|
| `server` | `object` | The server being deleted |
| `user` | `object` | The user who deleted the server |

```js
sodium.hooks.on('server:onDelete', async (ctx) => {
  sodium.logger.info(`Server "${ctx.server.name}" deleted`);
});
```

### auth:afterRegister

Fired after a user successfully registers.

| Context field | Type | Description |
|---------------|------|-------------|
| `user` | `object` | The newly registered user (without password) |
| `ip` | `string` | The IP address of the request |

```js
sodium.hooks.on('auth:afterRegister', async (ctx) => {
  sodium.logger.info(`New user registered: ${ctx.user.username} from ${ctx.ip}`);
});
```

### auth:afterLogin

Fired after a user successfully logs in.

| Context field | Type | Description |
|---------------|------|-------------|
| `user` | `object` | The authenticated user (without sensitive fields) |
| `ip` | `string` | The IP address of the request |
| `method` | `string` | The authentication method (e.g., `password`) |

```js
sodium.hooks.on('auth:afterLogin', async (ctx) => {
  sodium.db.insert('login_logs', {
    userId: ctx.user.id,
    ip: ctx.ip,
    method: ctx.method,
    timestamp: Date.now()
  });
});
```

## Priority system

Hooks execute in ascending priority order (lower numbers first). This lets you control execution order when multiple plugins subscribe to the same event:

```js
// Runs first (priority 1)
sodium.hooks.on('server:beforeCreate', async (ctx) => {
  // validation logic
}, 1);

// Runs second (priority 10 — the default)
sodium.hooks.on('server:beforeCreate', async (ctx) => {
  // logging logic
});

// Runs last (priority 100)
sodium.hooks.on('server:beforeCreate', async (ctx) => {
  // cleanup logic
}, 100);
```

## The deny mechanism

For "before" hooks (like `server:beforeCreate`), handlers receive a context object with a `deny()` method. Calling `deny(reason)` stops the hook chain and prevents the action:

```js
sodium.hooks.on('server:beforeCreate', async (ctx) => {
  const maintenanceMode = sodium.config.get('maintenanceMode');

  if (maintenanceMode) {
    ctx.deny('Server creation is disabled during maintenance.');
    // No further hooks will execute after this
    return;
  }
});
```

The deny context fields:

| Field | Type | Description |
|-------|------|-------------|
| `ctx._denied` | `boolean` | Whether the action was denied |
| `ctx._denyReason` | `string \| null` | The reason passed to `deny()` |
| `ctx.deny(reason)` | `function` | Call to deny the action and stop the hook chain |

## Error handling

If a hook handler throws an error, the error is caught and logged. Execution continues with the next handler:

```
WARN  [Plugins] Hook "server:beforeCreate" error: Cannot read property 'x' of undefined
```

This means one plugin's error will not break other plugins or the core system.

## Cleanup

When a plugin is deactivated, all its hooks are automatically removed. You do not need to manually unsubscribe.
