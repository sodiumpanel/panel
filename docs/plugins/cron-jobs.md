# Cron Jobs

Plugins can schedule periodic tasks using standard cron syntax. The cron runner checks every 60 seconds and executes matching jobs.

## Registering a cron job

```js
sodium.cron.register(id, schedule, handler);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique identifier for this job within the plugin. Stored internally as `<plugin-id>:<id>`. |
| `schedule` | `string` | Standard 5-field cron expression. |
| `handler` | `() => Promise<void>` | Async function to execute when the schedule matches. |

## Cron syntax

The schedule uses the standard 5-field format:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, 0 = Sunday)
│ │ │ │ │
* * * * *
```

### Supported patterns

| Pattern | Meaning | Example |
|---------|---------|---------|
| `*` | Every value | `* * * * *` — every minute |
| `N` | Exact value | `30 * * * *` — at minute 30 |
| `*/N` | Every N units | `*/5 * * * *` — every 5 minutes |
| `N,N` | List of values | `0,30 * * * *` — at minutes 0 and 30 |

### Common schedules

| Schedule | Description |
|----------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour (at minute 0) |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * *` | Daily at midnight |
| `0 0 * * 1` | Every Monday at midnight |
| `0 0 1 * *` | First day of every month at midnight |
| `30 2 * * *` | Daily at 2:30 AM |

## Examples

### Cleanup old records every hour

```js
export default function (sodium) {
  sodium.db.registerCollections(['temp_data']);

  sodium.cron.register('cleanup', '0 * * * *', async () => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const old = sodium.db.find('temp_data').filter(r => r.timestamp < cutoff);

    for (const record of old) {
      sodium.db.delete('temp_data', record.id);
    }

    sodium.logger.info(`Cleaned up ${old.length} expired records`);
  });
}
```

### Daily report generation

```js
sodium.cron.register('daily-report', '0 0 * * *', async () => {
  const events = sodium.db.find('events');
  const today = new Date().toISOString().split('T')[0];

  const todayEvents = events.filter(e => e.date === today);

  sodium.db.insert('reports', {
    date: today,
    totalEvents: todayEvents.length,
    generatedAt: new Date().toISOString()
  });

  sodium.logger.info(`Daily report generated: ${todayEvents.length} events`);
});
```

### Health check every 5 minutes

```js
sodium.cron.register('health-check', '*/5 * * * *', async () => {
  try {
    const response = await fetch('https://api.example.com/health');
    if (!response.ok) {
      sodium.logger.warn('External API health check failed');
    }
  } catch (err) {
    sodium.logger.error(`Health check error: ${err.message}`);
  }
});
```

## Error handling

If a cron handler throws an error, it is caught and logged. Other cron jobs and the cron runner itself are not affected:

```
WARN  [Plugins] Cron "my-plugin:cleanup" error: Cannot connect to database
```

## Important notes

- The cron runner checks every 60 seconds. The minimum resolution is 1 minute.
- Cron jobs are only executed while the plugin is active. Deactivating the plugin stops all its cron jobs.
- All registered cron jobs are automatically cleaned up when the plugin is deactivated.
- Cron handlers should be idempotent since there are no guarantees against duplicate execution in edge cases (e.g., if a job takes longer than 1 minute to run).
- The cron runner starts after all plugins are loaded during server startup.
