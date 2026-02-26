# HTTP Routes

Plugins can register custom REST API endpoints using Express.js routers. All plugin routes are automatically mounted under `/api/plugins/<plugin-id>/`.

## Registering routes

Use `sodium.http.registerRoutes()` with a callback that receives a standard Express Router:

```js
export default function (sodium) {
  sodium.http.registerRoutes((router) => {
    router.get('/status', (req, res) => {
      res.json({ status: 'ok' });
    });
  });
}
```

If your plugin ID is `my-plugin`, this endpoint becomes accessible at:

```
GET /api/plugins/my-plugin/status
```

## Route methods

The router supports all standard Express HTTP methods:

```js
sodium.http.registerRoutes((router) => {
  router.get('/items', (req, res) => { /* list */ });
  router.get('/items/:id', (req, res) => { /* get one */ });
  router.post('/items', (req, res) => { /* create */ });
  router.put('/items/:id', (req, res) => { /* update */ });
  router.patch('/items/:id', (req, res) => { /* partial update */ });
  router.delete('/items/:id', (req, res) => { /* delete */ });
});
```

## URL parameters

Use Express route parameters as usual:

```js
router.get('/servers/:serverId/stats', (req, res) => {
  const { serverId } = req.params;
  res.json({ serverId, cpu: 45, memory: 1024 });
});
```

Accessible at: `/api/plugins/my-plugin/servers/abc-123/stats`

## Query parameters

Access query parameters via `req.query`:

```js
router.get('/logs', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  // ...
  res.json({ page, limit, logs: [] });
});
```

Request: `/api/plugins/my-plugin/logs?page=2&limit=50`

## Request body

Access the parsed JSON body via `req.body` (Sodium's Express instance has JSON body parsing enabled):

```js
router.post('/webhooks', (req, res) => {
  const { event, payload } = req.body;
  // process webhook...
  res.json({ received: true });
});
```

## Combining with database

A common pattern is to build a full CRUD API backed by a plugin collection:

```js
export default function (sodium) {
  sodium.db.registerCollections(['bookmarks']);

  sodium.http.registerRoutes((router) => {
    router.get('/bookmarks', (req, res) => {
      res.json(sodium.db.find('bookmarks'));
    });

    router.post('/bookmarks', (req, res) => {
      const bookmark = sodium.db.insert('bookmarks', {
        url: req.body.url,
        title: req.body.title,
        createdAt: new Date().toISOString()
      });
      res.status(201).json(bookmark);
    });

    router.delete('/bookmarks/:id', (req, res) => {
      sodium.db.delete('bookmarks', req.params.id);
      res.json({ success: true });
    });
  });
}
```

## How routing works internally

When Sodium receives a request to `/api/plugins/<pluginId>/<path>`, it:

1. Extracts the plugin ID from the URL path
2. Looks up the matching router in the active plugin list
3. Rewrites `req.url` to remove the plugin ID prefix
4. Forwards the request to the plugin's Express Router

This means your route handlers only need to define paths relative to the plugin root. A handler registered as `/status` is accessible at `/api/plugins/<plugin-id>/status`.

## Important notes

- `registerRoutes` should only be called once per plugin. Calling it again overwrites the previous router.
- Plugin routes do not have authentication middleware applied by default. If your endpoints need authentication, you must implement it yourself or import Sodium's auth utilities.
- Routes are only available while the plugin is active. Deactivating a plugin removes its router.
