# Example: Analytics

A plugin that tracks server events, generates daily reports via cron, and exposes data through API endpoints and a dashboard widget. Demonstrates database, cron jobs, hooks, UI elements, and HTTP routes working together.

## Structure

```
data/plugins/analytics/
  plugin.json
  server.js
```

## plugin.json

```json
{
  "id": "analytics",
  "name": "Server Analytics",
  "version": "1.0.0",
  "type": "analytics",
  "author": "sodium-dev",
  "description": "Tracks server events and generates usage reports.",
  "hooks": ["server:onCreate", "server:onDelete", "server:onStatusChange"],
  "settings": {
    "retentionDays": {
      "type": "number",
      "label": "Event Retention (days)",
      "default": 30
    }
  }
}
```

## server.js

```js
export default function (sodium) {
  sodium.db.registerCollections(['events', 'daily_reports']);

  function trackEvent(type, data) {
    sodium.db.insert('events', {
      type, data,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });
  }

  // Track server lifecycle events
  sodium.hooks.on('server:onCreate', async (ctx) => {
    trackEvent('server.create', { server: ctx.server?.name, user: ctx.user?.id });
  });

  sodium.hooks.on('server:onDelete', async (ctx) => {
    trackEvent('server.delete', { server: ctx.server?.name, user: ctx.user?.id });
  });

  sodium.hooks.on('server:onStatusChange', async (ctx) => {
    trackEvent('server.power', { server: ctx.server?.name, action: ctx.action });
  });

  // Generate daily report at midnight
  sodium.cron.register('daily-report', '0 0 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    const events = sodium.db.find('events', { date: today });
    sodium.db.insert('daily_reports', {
      date: today,
      totalEvents: events.length,
      generatedAt: new Date().toISOString()
    });
    sodium.logger.info(`Daily report: ${events.length} events`);
  });

  // Cleanup old events weekly
  sodium.cron.register('cleanup', '0 3 * * 0', async () => {
    const days = sodium.config.get('retentionDays') || 30;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const old = sodium.db.find('events').filter(e => e.timestamp < cutoff);
    for (const e of old) sodium.db.delete('events', e.id);
    sodium.logger.info(`Cleanup: removed ${old.length} old events`);
  });

  // UI
  sodium.ui.addDashboardWidget({ id: 'analytics', title: 'Event Analytics', size: 'medium' });
  sodium.ui.addSidebarItem({ id: 'analytics', label: 'Analytics', icon: 'chart-bar', path: '/plugins/analytics' });

  // API
  sodium.http.registerRoutes((router) => {
    router.get('/events', (req, res) => {
      const events = req.query.date
        ? sodium.db.find('events', { date: req.query.date })
        : sodium.db.find('events');
      res.json(events);
    });

    router.get('/reports', (req, res) => {
      res.json(sodium.db.find('daily_reports'));
    });
  });
}
```

## Key concepts

- **Hooks** track real events into a database collection
- **Cron jobs** generate daily summaries and clean up old data based on a configurable retention setting
- **UI elements** add a dashboard widget and sidebar navigation
- **HTTP routes** expose the raw events and generated reports
