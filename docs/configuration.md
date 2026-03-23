# Configuration

## Overview

Sodium stores all configuration in `data/config.json`. This file is created automatically by the setup wizard on first launch.

**Note:** Environment variables are no longer used for configuration. All settings are managed through the setup wizard or Admin > Settings.

## Configuration File

## Database

Sodium supports multiple database backends:

| Type | Driver | Use Case |
|------|--------|----------|
| `file` | Built-in | Default, no setup required |
| `sqlite` | `better-sqlite3` | Single-server production |
| `mysql` / `mariadb` | `mysql2` | MySQL 5.7+ / MariaDB 10.3+ |
| `postgresql` | `pg` | PostgreSQL 12+ |

### Installing Database Drivers

If using an external database, install the required driver:

```bash
# MySQL / MariaDB
npm install mysql2

# PostgreSQL
npm install pg

# SQLite
npm install better-sqlite3
```

### Fallback Behavior

If the configured external database is unavailable, Sodium will automatically fall back to the file-based database and log a warning.

## Changing Configuration

### Via Admin Panel

Most settings can be changed through **Admin > Settings** in the web interface, including mail, security, advanced options, and OAuth providers.

### Manual Edit

You can directly edit `data/config.json`. Restart the server for changes to take effect.

**Important:** Do not modify `jwt.secret` after setup, as this will invalidate all existing user sessions.

### Re-running Setup

To re-run the setup wizard:

1. Stop the server
2. Delete or edit `data/config.json` and set `"installed": false`
3. Start the server
4. Navigate to `/setup`

**Warning:** This will not delete existing data, but creating a new admin account will add another user.
