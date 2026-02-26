# Database

Plugins can create their own database collections for persistent storage. The plugin database API is fully abstracted — it works identically whether Sodium is using the file-based database, MySQL, PostgreSQL, or SQLite.

## Collection namespacing

All collection names are automatically prefixed with `plugins_<plugin-id>_` to prevent collisions with core collections and other plugins. You never need to worry about the prefix when using the API — just use your short collection name:

```js
// If your plugin ID is "analytics", calling:
sodium.db.registerCollections(['events']);

// Creates a collection named "plugins_analytics_events" internally.
// But you always reference it as just "events" in your plugin code.
```

## Registering collections

You must register collections before using them. This should be done at the top of your `server.js`:

```js
export default function (sodium) {
  sodium.db.registerCollections(['events', 'reports', 'settings_cache']);

  // Now you can use these collections
}
```

When using an external database (MySQL, PostgreSQL, SQLite), registration automatically creates the backing table with the following schema:

| Column | MySQL | PostgreSQL | SQLite |
|--------|-------|------------|--------|
| `id` | `VARCHAR(255) PRIMARY KEY` | `VARCHAR(255) PRIMARY KEY` | `TEXT PRIMARY KEY` |
| `data` | `JSON NOT NULL` | `JSONB NOT NULL` | `TEXT NOT NULL` |
| `created_at` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `TEXT DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `TEXT DEFAULT CURRENT_TIMESTAMP` |

## CRUD operations

### Insert

Insert a new record. If no `id` field is present, a UUID is generated automatically.

```js
// Auto-generated ID
const record = sodium.db.insert('events', {
  type: 'server.start',
  serverId: 'abc-123',
  timestamp: Date.now()
});
// record.id === "550e8400-e29b-41d4-a716-446655440000" (generated UUID)

// Custom ID
const record2 = sodium.db.insert('events', {
  id: 'evt-001',
  type: 'server.stop',
  serverId: 'abc-123',
  timestamp: Date.now()
});
// record2.id === "evt-001"
```

### Find

Retrieve records matching a query. The query is a simple key-value object where all conditions must match (AND logic). Pass no query or an empty object to get all records.

```js
// Get all records
const all = sodium.db.find('events');

// Filter by field
const starts = sodium.db.find('events', { type: 'server.start' });

// Filter by multiple fields (AND)
const specific = sodium.db.find('events', {
  type: 'server.start',
  serverId: 'abc-123'
});
```

### Find one

Retrieve the first record matching a query, or `null` if none match.

```js
const event = sodium.db.findOne('events', { id: 'evt-001' });

if (event) {
  console.log(event.type); // "server.stop"
}
```

### Update

Update a record by its ID with partial data. Only the specified fields are changed.

```js
sodium.db.update('events', 'evt-001', {
  processed: true,
  processedAt: Date.now()
});
```

### Delete

Delete a record by its ID.

```js
sodium.db.delete('events', 'evt-001');
```

## Complete example

```js
export default function (sodium) {
  sodium.db.registerCollections(['notes']);

  sodium.http.registerRoutes((router) => {
    // List all notes
    router.get('/notes', (req, res) => {
      const notes = sodium.db.find('notes');
      res.json(notes);
    });

    // Get a single note
    router.get('/notes/:id', (req, res) => {
      const note = sodium.db.findOne('notes', { id: req.params.id });
      if (!note) return res.status(404).json({ error: 'Not found' });
      res.json(note);
    });

    // Create a note
    router.post('/notes', (req, res) => {
      const note = sodium.db.insert('notes', {
        title: req.body.title,
        content: req.body.content,
        createdAt: new Date().toISOString()
      });
      res.status(201).json(note);
    });

    // Update a note
    router.put('/notes/:id', (req, res) => {
      const updated = sodium.db.update('notes', req.params.id, {
        title: req.body.title,
        content: req.body.content,
        updatedAt: new Date().toISOString()
      });
      res.json(updated);
    });

    // Delete a note
    router.delete('/notes/:id', (req, res) => {
      sodium.db.delete('notes', req.params.id);
      res.json({ success: true });
    });
  });
}
```

## Limitations

- Queries only support exact equality matching (`field === value`). There is no support for comparison operators, regex, or nested field queries.
- All query conditions are combined with AND logic. There is no OR support.
- There is no built-in pagination, sorting, or aggregation. Implement these in your plugin code if needed.
- Collection names should use lowercase letters, numbers, and underscores only.
