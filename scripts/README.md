# Sodium Migration Scripts

Tools for migrating data between Sodium and other systems.

## Database Migration

Migrate between Sodium database backends (file, MySQL, PostgreSQL, SQLite).

```bash
# File to MySQL
node scripts/migrate-db.js --from file --to mysql

# MySQL to PostgreSQL
node scripts/migrate-db.js --from mysql --to postgresql

# PostgreSQL back to file
node scripts/migrate-db.js --from postgresql --to file
```

### Environment Variables

For source database:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port
- `DB_NAME` - Database name (default: sodium)
- `DB_USER` - Database user
- `DB_PASS` - Database password

For target database (when different):
- `TARGET_DB_HOST`, `TARGET_DB_PORT`, `TARGET_DB_NAME`, `TARGET_DB_USER`, `TARGET_DB_PASS`

## Pterodactyl Migration

### Import from Pterodactyl

Import data from an existing Pterodactyl Panel database.

```bash
export PTERO_DB_HOST=localhost
export PTERO_DB_NAME=panel
export PTERO_DB_USER=pterodactyl
export PTERO_DB_PASS=your-password

node scripts/import-pterodactyl.js
```

**What gets imported:**
- Users (with passwords preserved)
- Locations
- Nodes
- Nests
- Eggs (with variables)
- Servers

**Notes:**
- Users can login with their existing Pterodactyl passwords
- API keys are NOT imported (must be recreated)
- Node daemon tokens may need to be reconfigured

### Export to Pterodactyl

Generate SQL statements to import Sodium data into Pterodactyl.

```bash
# Output to stdout
node scripts/export-pterodactyl.js > pterodactyl-import.sql

# Output to file
node scripts/export-pterodactyl.js --output pterodactyl-import.sql
```

**Warning:** Run the generated SQL on an empty Pterodactyl database or expect conflicts.

## JSON Backup

### Export to JSON

Create a JSON backup of all Sodium data.

```bash
# Output to stdout
node scripts/export-json.js > backup.json

# Output to file
node scripts/export-json.js --output backup.json

# Pretty print
node scripts/export-json.js --pretty --output backup.json
```

**Note:** Passwords are automatically redacted in the export for security.

### Import from JSON

Restore data from a JSON backup.

```bash
node scripts/import-json.js backup.json
```

**Note:** Users with redacted passwords will be skipped.

## Requirements

External database migrations require the appropriate driver:

```bash
# MySQL/MariaDB
npm install mysql2

# PostgreSQL
npm install pg

# SQLite
npm install better-sqlite3
```
