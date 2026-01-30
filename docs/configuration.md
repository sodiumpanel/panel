# Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `JWT_SECRET` | (default) | Secret key for JWT tokens |
| `DB_TYPE` | file | Database type: `file`, `mysql`, `mariadb`, `postgresql`, `sqlite` |
| `DB_HOST` | localhost | Database host (mysql/postgres) |
| `DB_PORT` | 3306 | Database port |
| `DB_NAME` | sodium | Database name |
| `DB_USER` | sodium | Database username |
| `DB_PASS` | - | Database password |
| `DB_FILE` | - | SQLite file path |

## Panel Configuration

Configuration is stored in `data/config.json` and can be edited through Admin > Settings.

### Default Configuration

```json
{
  "panel": {
    "name": "Sodium Panel",
    "url": "http://localhost:3000"
  },
  "registration": {
    "enabled": true
  },
  "defaults": {
    "servers": 2,
    "memory": 2048,
    "disk": 10240,
    "cpu": 200
  },
  "features": {
    "subusers": true
  }
}
```

### Options

**panel**
- `name` - Panel display name
- `url` - Public URL (used for daemon communication)

**registration**
- `enabled` - Allow new user registrations

**defaults** - Default limits for new users:
- `servers` - Maximum servers
- `memory` - Maximum RAM (MB)
- `disk` - Maximum disk (MB)
- `cpu` - Maximum CPU (100 = 1 core)

**features**
- `subusers` - Enable server sharing

## Database

Sodium supports multiple database backends. By default, it uses a binary file database (`data/sodium.db`), but you can configure external databases for production environments.

### Supported Databases

| Type | Driver Required | Notes |
|------|-----------------|-------|
| `file` | None (built-in) | Default, no setup required |
| `mysql` | `mysql2` | MySQL 5.7+ |
| `mariadb` | `mysql2` | MariaDB 10.3+ |
| `postgresql` / `postgres` | `pg` | PostgreSQL 12+ |
| `sqlite` | `better-sqlite3` | SQLite 3 |

### Configuration

Set database options via environment variables:

```bash
# Database type (default: file)
DB_TYPE=mysql

# Connection settings (for mysql/mariadb/postgresql)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sodium
DB_USER=sodium
DB_PASS=your-password

# SQLite file path (for sqlite only)
DB_FILE=./data/sodium.sqlite
```

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

### Migration

When switching from file to external database, existing data is preserved in the file database. To migrate data, you can:
1. Export data via the API
2. Switch database configuration
3. Import data to the new database
