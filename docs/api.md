# API Reference

All endpoints are prefixed with `/api`. Authentication uses JWT tokens in the `Authorization: Bearer <token>` header.

## Authentication

### Register

```http
POST /api/auth/register
Content-Type: application/json

{"username": "string", "password": "string", "email": "string (optional)"}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{"username": "string", "password": "string"}
```

Response:
```json
{"success": true, "user": {...}, "token": "jwt-token"}
```

If 2FA is enabled, returns `{"requires2FA": true, "tempToken": "..."}` and you must verify:

```http
POST /api/auth/2fa/verify
Content-Type: application/json

{"tempToken": "string", "code": "string"}
```

### OAuth

```http
GET /api/auth/oauth/:provider         # Redirect to OAuth provider
GET /api/auth/oauth/:provider/callback # OAuth callback
```

Supported providers: Discord, Google, GitHub, GitLab, Microsoft, Twitter, Facebook, Apple, Twitch, Slack, LinkedIn, Spotify, Reddit, Bitbucket.

### Password Reset

```http
POST /api/auth/forgot-password    {"email": "string"}
POST /api/auth/reset-password     {"token": "string", "password": "string"}
```

### Email Verification

```http
POST /api/auth/verify-email       {"token": "string"}
POST /api/auth/resend-verification
```

## User

### Profile

```http
GET  /api/user/profile?username=string
PUT  /api/user/profile             {"displayName": "string", "bio": "string", "avatar": "url"}
```

### Settings & Password

```http
PUT  /api/user/settings            {"settings": {...}}
PUT  /api/user/password            {"currentPassword": "string", "newPassword": "string"}
```

### Two-Factor Authentication

```http
GET  /api/user/2fa
PUT  /api/user/2fa                 {"enabled": true}
```

### Resource Limits

```http
GET  /api/user/limits?username=string
```

### SSH Keys

```http
GET    /api/user/ssh-keys
POST   /api/user/ssh-keys          {"name": "string", "public_key": "string"}
PUT    /api/user/ssh-keys/:id      {"name": "string"}
DELETE /api/user/ssh-keys/:id
```

## Servers

### List & Create

```http
GET  /api/servers
POST /api/servers                  {"name": "string", "egg_id": "string", "memory": 1024, "disk": 5120, "cpu": 100}
```

### Available Nodes & Nests

```http
GET  /api/servers/available-nodes
GET  /api/servers/nests
```

### Power Actions

```http
POST /api/servers/:id/power        {"action": "start|stop|restart|kill"}
```

### Send Command

```http
POST /api/servers/:id/command      {"command": "string"}
```

### Server Details & Settings

```http
GET  /api/servers/:id
PUT  /api/servers/:id/settings     {"name": "string", "description": "string"}
POST /api/servers/:id/reinstall
DELETE /api/servers/:id
```

### Startup

```http
GET  /api/servers/:id/startup
PUT  /api/servers/:id/startup      {"startup": "string", "environment": {...}, "docker_image": "string"}
```

### File Management

```http
GET  /api/servers/:id/files?path=/
GET  /api/servers/:id/files/content?path=/file.txt
POST /api/servers/:id/files/save          {"path": "string", "content": "string"}
POST /api/servers/:id/files/rename        {"from": "string", "to": "string"}
POST /api/servers/:id/files/delete        {"paths": ["string"]}
POST /api/servers/:id/files/create-folder {"path": "string"}
POST /api/servers/:id/files/copy          {"from": "string", "to": "string"}
POST /api/servers/:id/files/chmod         {"path": "string", "mode": "string"}
POST /api/servers/:id/files/compress      {"paths": ["string"]}
POST /api/servers/:id/files/decompress    {"path": "string"}
POST /api/servers/:id/files/upload        (multipart form)
```

### Subusers

```http
GET    /api/servers/:id/subusers
POST   /api/servers/:id/subusers   {"username": "string", "permissions": ["string"]}
PUT    /api/servers/:id/subusers/:subId  {"permissions": ["string"]}
DELETE /api/servers/:id/subusers/:subId
```

### Backups

```http
GET    /api/servers/:id/backups
POST   /api/servers/:id/backups
GET    /api/servers/:id/backups/:backupId/download
POST   /api/servers/:id/backups/:backupId/restore
DELETE /api/servers/:id/backups/:backupId
```

### Schedules

```http
GET    /api/schedules/:serverId
POST   /api/schedules/:serverId              {"name": "string", "cron": {...}, "is_active": true}
PUT    /api/schedules/:serverId/:scheduleId
DELETE /api/schedules/:serverId/:scheduleId
POST   /api/schedules/:serverId/:scheduleId/tasks    {"action": "string", "payload": "string"}
DELETE /api/schedules/:serverId/:scheduleId/tasks/:taskId
POST   /api/schedules/:serverId/:scheduleId/execute
```

## Webhooks

```http
GET    /api/webhooks
GET    /api/webhooks/events
POST   /api/webhooks              {"name": "string", "url": "string", "events": ["string"]}
PUT    /api/webhooks/:id
DELETE /api/webhooks/:id
POST   /api/webhooks/:id/test
```

## API Keys

```http
GET    /api/api-keys
POST   /api/api-keys              {"name": "string", "permissions": ["string"]}
DELETE /api/api-keys/:id
```

## Activity & Announcements

```http
GET  /api/activity
GET  /api/announcements
```

## Admin Endpoints

Require admin privileges.

### Nodes

```http
GET    /api/admin/nodes
POST   /api/admin/nodes
PUT    /api/admin/nodes/:id
DELETE /api/admin/nodes/:id
GET    /api/admin/nodes/:id/config
GET    /api/admin/nodes/:id/deploy
```

### Locations

```http
GET    /api/admin/locations
POST   /api/admin/locations
DELETE /api/admin/locations/:id
```

### Users

```http
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
```

### Servers

```http
GET    /api/admin/servers
POST   /api/admin/servers
PUT    /api/admin/servers/:id
DELETE /api/admin/servers/:id
POST   /api/admin/servers/:id/install
POST   /api/admin/servers/:id/transfer   {"target_node_id": "string"}
```

### Nests and Eggs

```http
GET    /api/admin/nests
POST   /api/admin/nests
PUT    /api/admin/nests/:id
DELETE /api/admin/nests/:id

GET    /api/admin/eggs
GET    /api/admin/eggs/:id
POST   /api/admin/eggs
POST   /api/admin/eggs/import
PUT    /api/admin/eggs/:id
DELETE /api/admin/eggs/:id
```

### OAuth Providers

```http
GET    /api/admin/oauth/providers
POST   /api/admin/oauth/providers
PUT    /api/admin/oauth/providers/:id
DELETE /api/admin/oauth/providers/:id
```

### Settings

```http
GET /api/admin/settings
PUT /api/admin/settings
```

### Mail

```http
POST /api/admin/mail/test          {"email": "string"}
GET  /api/admin/mail/status
```

### Audit Logs

```http
GET /api/admin/audit-logs
```

### Plugins

```http
GET    /api/admin/plugins
POST   /api/admin/plugins/:id/toggle
DELETE /api/admin/plugins/:id
```

### System

```http
POST /api/admin/cache/clear
POST /api/admin/database/rebuild
GET  /api/admin/system/info
```

### Health & Metrics

```http
GET /api/health
GET /metrics
```

## Application API

For external integrations. Uses API key authentication with `Authorization: Bearer <api-key>` header.

```http
GET    /api/application/users
GET    /api/application/users/:id
POST   /api/application/users
PUT    /api/application/users/:id
DELETE /api/application/users/:id

GET    /api/application/nodes
GET    /api/application/nodes/:id
POST   /api/application/nodes
PUT    /api/application/nodes/:id
DELETE /api/application/nodes/:id

GET    /api/application/servers
GET    /api/application/servers/:id
POST   /api/application/servers
PUT    /api/application/servers/:id
DELETE /api/application/servers/:id

GET    /api/application/locations
POST   /api/application/locations
DELETE /api/application/locations/:id

GET    /api/application/nests
GET    /api/application/eggs
```

## WebSocket

Console access:

```
ws://panel.example.com/ws/console?server=<id>&token=<jwt>
```

Events: `auth`, `console output`, `status`, `stats`
