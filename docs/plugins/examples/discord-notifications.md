# Example: Discord Notifications

An integration plugin that sends Discord webhook messages when servers are created or deleted. Demonstrates hooks, settings, and external API communication.

## Structure

```
data/plugins/discord-notify/
  plugin.json
  server.js
```

## plugin.json

```json
{
  "id": "discord-notify",
  "name": "Discord Notifications",
  "version": "1.0.0",
  "type": "integration",
  "author": "sodium-dev",
  "description": "Sends Discord notifications for server lifecycle events.",
  "hooks": [
    "server:onCreate",
    "server:onDelete",
    "server:onStatusChange"
  ],
  "settings": {
    "webhookUrl": {
      "type": "string",
      "label": "Discord Webhook URL",
      "default": ""
    },
    "notifyOnCreate": {
      "type": "boolean",
      "label": "Notify on Server Create",
      "default": true
    },
    "notifyOnDelete": {
      "type": "boolean",
      "label": "Notify on Server Delete",
      "default": true
    },
    "notifyOnPower": {
      "type": "boolean",
      "label": "Notify on Power Actions",
      "default": false
    }
  }
}
```

## server.js

```js
export default function (sodium) {
  sodium.logger.info('Discord Notifications plugin loaded');

  async function sendWebhook(content) {
    const webhookUrl = sodium.config.get('webhookUrl');
    if (!webhookUrl) {
      sodium.logger.warn('No webhook URL configured, skipping notification');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Sodium Panel',
          embeds: [{
            color: 0xd97339,
            description: content,
            timestamp: new Date().toISOString()
          }]
        })
      });

      if (!response.ok) {
        sodium.logger.warn(`Webhook request failed with status ${response.status}`);
      }
    } catch (err) {
      sodium.logger.error(`Webhook error: ${err.message}`);
    }
  }

  sodium.hooks.on('server:onCreate', async (ctx) => {
    if (!sodium.config.get('notifyOnCreate')) return;
    await sendWebhook(
      `**Server Created**\nName: ${ctx.server?.name}\nUser: ${ctx.user?.username}`
    );
  });

  sodium.hooks.on('server:onDelete', async (ctx) => {
    if (!sodium.config.get('notifyOnDelete')) return;
    await sendWebhook(
      `**Server Deleted**\nName: ${ctx.server?.name}\nUser: ${ctx.user?.username}`
    );
  });

  sodium.hooks.on('server:onStatusChange', async (ctx) => {
    if (!sodium.config.get('notifyOnPower')) return;
    await sendWebhook(
      `**Power Action**\nServer: ${ctx.server?.name}\nAction: ${ctx.action}\nUser: ${ctx.user?.username}`
    );
  });

  // Test endpoint
  sodium.http.registerRoutes((router) => {
    router.post('/test', async (req, res) => {
      await sendWebhook('This is a test notification from Sodium.');
      res.json({ success: true });
    });
  });
}
```

## Key concepts demonstrated

### Settings-driven behavior

Each notification type can be independently enabled or disabled via settings. The webhook URL is also configurable, so no code changes are needed to set up the integration.

### External API calls

The plugin makes HTTP requests to the Discord webhook API using the built-in `fetch` function. Error handling ensures that webhook failures do not crash the plugin.

### Multiple hook subscriptions

The plugin subscribes to three different events, each with its own toggle setting.

### Test endpoint

The `/api/plugins/discord-notify/test` endpoint lets administrators verify the webhook configuration without triggering a real event.

## Setup

1. Create a Discord webhook in your server's channel settings
2. Install and activate the plugin
3. Set the webhook URL via the admin API:

```bash
curl -X PUT http://localhost:3000/api/admin/plugins/discord-notify/settings \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "values": {
      "webhookUrl": "https://discord.com/api/webhooks/...",
      "notifyOnCreate": true,
      "notifyOnDelete": true,
      "notifyOnPower": false
    }
  }'
```

4. Test the integration:

```bash
curl -X POST http://localhost:3000/api/plugins/discord-notify/test
```
