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
  - History API router
  - Rollup bundler with PostCSS
  - CodeMirror 6 for file editing
  - xterm.js for terminal

- **Backend**: Express.js 5
  - CRYPTO authentication with OAuth support
  - WebSocket proxy for console
  - Plugin system with hooks, middleware, and custom routes

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
