# Installation

## Requirements

- Node.js 23 or higher
- npm
- (Optional) MySQL/MariaDB, PostgreSQL, or SQLite for external database
- (Optional) Redis for large-scale deployments

## Panel Installation

Clone the repository:

```bash
git clone https://github.com/sodiumpanel/panel.git
cd sodium
```

Install dependencies:

```bash
npm install
```

Build the frontend:

```bash
npm run build
```

Start the server:

```bash
npm start
```

The panel will be available at `http://localhost:3000`.

## Setup Wizard

On first launch, Sodium displays a setup wizard that guides you through configuration:

1. **Panel Configuration** - Set panel name, public URL, and port
2. **Database** - Choose storage backend (file, SQLite, MySQL, PostgreSQL)
3. **Redis** - Optional caching for better performance at scale
4. **Default Limits** - Resource limits for new users (servers, memory, disk, CPU, allocations, backups)
5. **Admin Account** - Create the first administrator account

The wizard automatically:
- Generates a secure JWT secret
- Tests database and Redis connections
- Creates the admin user
- Saves all configuration to `data/config.json`

## Production Deployment

### Using systemd

Create `/etc/systemd/system/sodium.service`:

```ini
[Unit]
Description=Sodium Panel
After=network.target

[Service]
Type=simple
User=sodium
WorkingDirectory=/opt/sodium
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable sodium
sudo systemctl start sodium
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name panel.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Directory Structure

```
sodium/
├── data/              # Database and configuration (gitignored)
│   ├── sodium.db      # Binary database file (when using file DB)
│   ├── config.json    # Panel configuration
│   └── plugins/       # Installed plugins
├── dist/              # Built frontend assets
├── eggs/              # Game server egg configs
├── scripts/           # Migration and backup scripts
├── tests/             # Test suite
├── src/
│   ├── server/        # Backend (Express.js 5)
│   │   ├── routes/    # API route handlers
│   │   ├── plugins/   # Plugin system
│   │   └── utils/     # Auth, helpers, logger, mail, webhooks
│   ├── routes/        # Frontend page components
│   ├── components/    # Shared UI components
│   ├── styles/        # SCSS stylesheets
│   └── bundler/       # Rollup build system
├── android/           # Android companion app
└── assets/            # Static assets
```

## External Database Setup

If you prefer using an external database, install the required driver before running setup:

### MySQL / MariaDB

```bash
npm install mysql2

# Create database
mysql -u root -p -e "CREATE DATABASE sodium; CREATE USER 'sodium'@'localhost' IDENTIFIED BY 'password'; GRANT ALL ON sodium.* TO 'sodium'@'localhost';"
```

Then select MySQL in the setup wizard and enter connection details.

### PostgreSQL

```bash
npm install pg

# Create database
sudo -u postgres psql -c "CREATE DATABASE sodium; CREATE USER sodium WITH PASSWORD 'password'; GRANT ALL PRIVILEGES ON DATABASE sodium TO sodium;"
```

Then select PostgreSQL in the setup wizard and enter connection details.

### SQLite

```bash
npm install better-sqlite3
```

Then select SQLite in the setup wizard.

## Redis Setup (Optional)

For large installations with many concurrent users:

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Enable Redis in the setup wizard (step 3) and enter connection details.
