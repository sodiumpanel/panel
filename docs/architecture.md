# Architecture

## Overview

Sodium is a game server management panel that communicates with Sodium Reaction daemons to manage servers across nodes.

```
┌─────────────────────────────────────────────────────────────┐
│                      Sodium Panel                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Frontend  │  │   Backend   │  │      Database       │  │
│  │  (Vanilla)  │◄─►│ (Express)   │◄─►│ (File/MySQL/PG/SQL) │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/WebSocket
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  Sodium   │    │  Sodium   │    │  Sodium   │
   │ Reaction  │    │ Reaction  │    │ Reaction  │
   │  Node 1   │    │  Node 2   │    │  Node N   │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │
         ▼                ▼                ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  Docker   │    │  Docker   │    │  Docker   │
   │ Containers│    │ Containers│    │ Containers│
   └───────────┘    └───────────┘    └───────────┘
```

## Components

### Panel

- **Frontend**: Vanilla JavaScript SPA with SCSS
  - History API router (no hash routes)
  - Rollup bundler with PostCSS and terser
  - CodeMirror 6 for file editing
  - xterm.js for terminal
  - Toast notifications and custom modals

- **Backend**: Express.js 5
  - JWT authentication with OAuth support
  - WebSocket proxy for console
  - Plugin system with hooks, middleware, and custom routes
  - Multi-database support (File, MySQL, PostgreSQL, SQLite)
  - Redis caching (optional)
  - Rate limiting and Helmet security headers
  - Graceful shutdown (SIGTERM/SIGINT)

### Sodium Reaction

Go daemon (fork of Pterodactyl Wings) that handles:

- Server lifecycle (start, stop, restart, kill)
- File management (browse, edit, upload, compress, decompress)
- Console I/O via WebSocket
- Resource monitoring (CPU, RAM, disk, network)
- Backups (create, restore, download)
- SFTP access

**Paths:**
- Config: `/etc/sodium/config.yml`
- Data: `/var/sodium/volumes`
- Backups: `/var/sodium/backups`
- User: `sodium`

## Data Flow

### Server Creation

1. User submits creation request
2. Panel validates user limits and resources
3. Panel finds available node with sufficient resources and ports
4. Panel saves server to database
5. Panel sends creation request to Sodium Reaction
6. Daemon creates Docker container and runs install script

### Console Access

1. User opens console
2. Frontend connects to `/ws/console`
3. Panel authenticates and verifies permissions (owner, admin, or subuser)
4. Panel connects to daemon WebSocket with JWT token
5. Messages proxied between user and daemon

### Server Transfer

1. Admin initiates transfer to target node
2. Panel checks target node resources (memory, disk, ports)
3. Panel creates server on target node
4. Source node archives server files
5. Target node pulls archive from source
6. Panel updates server record with new node and allocation
7. Source node server is deleted

## Database

Sodium supports multiple database backends:

| Backend | Driver | Use Case |
|---------|--------|----------|
| File (default) | Built-in binary format | Development, small deployments |
| MySQL/MariaDB | `mysql2` | Production, existing MySQL infrastructure |
| PostgreSQL | `pg` | Production, complex queries |
| SQLite | `better-sqlite3` | Single-server production |

The database is configured via the setup wizard and stored in `data/config.json`. See [Configuration](configuration.md) for details.

### Collections

The database stores these collections:

| Collection | ID | Description |
|------------|----|-------------|
| users | 1 | User accounts and profiles |
| nodes | 2 | Daemon node configurations |
| servers | 3 | Game server instances |
| nests | 4 | Egg category groups |
| eggs | 5 | Server type configurations |
| locations | 6 | Node locations |
| apiKeys | 7 | User and application API keys |
| announcements | 8 | Admin announcements |
| auditLogs | 9 | Admin action audit trail |
| activityLogs | 10 | User activity history |
| webhooks | 11 | Webhook configurations |
| schedules | 12 | Scheduled tasks |

## Database Schema

### Users

```javascript
{
  id, username, email, password, displayName, bio, avatar, links,
  isAdmin, role, // 'user' | 'moderator' | 'admin'
  emailVerified, twoFactorEnabled,
  limits: { servers, memory, disk, cpu, allocations, backups },
  settings: { theme, notifications, privacy },
  ssh_keys: [{ id, name, public_key, fingerprint, created_at, last_used }],
  createdAt
}
```

### Nodes

```javascript
{
  id, name, description, location_id, fqdn, scheme,
  memory, disk, daemon_port, daemon_sftp_port,
  daemon_token, daemon_token_id,
  upload_size, behind_proxy, maintenance_mode,
  allocation_start, allocation_end,
  memory_overallocation, disk_overallocation,
  created_at
}
```

### Servers

```javascript
{
  id, uuid, name, description, user_id, node_id, egg_id,
  docker_image, startup,
  limits: { memory, disk, cpu, io, swap },
  feature_limits: { databases, backups, allocations },
  environment, allocation, allocations,
  status, // 'offline' | 'installing' | 'draft' | 'install_failed'
  suspended, subusers,
  transfer: { status, source_node, target_node },
  created_at
}
```

### Eggs

```javascript
{
  id, nest_id, name, description, author,
  icon, admin_only,
  docker_images, docker_image,
  startup, config,
  install_script, install_container, install_entrypoint,
  variables
}
```

### Schedules

```javascript
{
  id, server_id, name, is_active, is_processing,
  cron: { minute, hour, day_of_month, month, day_of_week },
  last_run_at, next_run_at,
  tasks: [{ id, sequence_id, action, payload, time_offset, created_at }],
  created_at
}
```

### Webhooks

```javascript
{
  id, user_id, name, url, secret,
  events, // array of event types
  enabled, last_triggered, failure_count,
  created_at
}
```

## Project Structure

```
sodium/
├── data/              # Database and configuration (gitignored)
│   ├── sodium.db      # Binary database file
│   ├── config.json    # Panel configuration
│   └── plugins/       # Installed plugins
├── dist/              # Built frontend assets
├── eggs/              # Game server egg configs
│   ├── minecraft/     # Paper, Purpur, Fabric, Velocity, PocketMine
│   ├── steam/         # ARK, Palworld, Enshrouded, 7DaysToDie
│   ├── gta/           # FiveM
│   ├── generic/       # Node.js, Python, Java, Go, Rust, Bun, etc.
│   └── misc/          # LightVM
├── scripts/           # Migration and backup scripts
├── tests/             # Test suite (Node.js native test runner)
├── src/
│   ├── server/        # Backend
│   │   ├── routes/    # API route handlers
│   │   ├── plugins/   # Plugin system (manager, hooks, api)
│   │   └── utils/     # Auth, helpers, logger, mail, webhooks, etc.
│   ├── routes/        # Frontend page components
│   │   ├── admin/     # Admin panel views
│   │   └── server/    # Server management views
│   ├── components/    # Shared UI components
│   ├── styles/        # SCSS stylesheets
│   ├── bundler/       # Rollup build system
│   └── router.js      # SPA History API router
└── android/           # Android companion app
```
