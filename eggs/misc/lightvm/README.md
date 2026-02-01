# LightVM

A lightweight virtual machine egg with a **complete Linux OS environment**. Provides root access, init system, user management, and full system utilities.

## Features

- **Root Access**: Full root privileges with sudo/doas
- **User Management**: Pre-configured root and user accounts with password support
- **Init System**: OpenRC services (cron, syslog)
- **Package Management**: Full apk package manager
- **Network Tools**: curl, wget, ssh, dig, netstat, ip
- **Development**: gcc, g++, make, git, build-base
- **Editors**: nano, vim, tmux, screen
- **Monitoring**: htop, btop, ps, free, df
- **Custom Hostname**: Set your own hostname
- **Timezone Support**: Full timezone configuration

## Docker Images

| Image | Description |
|-------|-------------|
| Alpine 3.20 | Latest stable (recommended) |
| Alpine Edge | Bleeding edge |
| Alpine 3.19 | Previous stable |
| Alpine 3.18 | LTS |

## Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STARTUP_CMD` | Command to run on startup | (empty = shell) |
| `ROOT_PASSWORD` | Root user password | (empty) |
| `USER_PASSWORD` | User account password | (empty) |
| `VM_HOSTNAME` | System hostname | lightvm |
| `EXTRA_PACKAGES` | Additional packages to install | (empty) |
| `TZ` | Timezone | UTC |
| `ENABLE_CRON` | Enable cron daemon | 1 |
| `ENABLE_SYSLOG` | Enable syslog daemon | 0 |

## Built-in Commands

After starting, these custom commands are available:

| Command | Description |
|---------|-------------|
| `sysinfo` | Show system information |
| `services` | List running processes |
| `ports` | Show open ports |
| `mem` | Show memory usage |
| `disk` | Show disk usage |
| `cpu` | Open htop |
| `pkg-add` | Install package |
| `pkg-del` | Remove package |
| `pkg-search` | Search packages |
| `help` | Show all commands |

## Directory Structure

```
/home/container/
├── etc/
│   ├── passwd
│   ├── group
│   ├── shadow
│   ├── sudoers
│   ├── hostname
│   ├── hosts
│   ├── resolv.conf
│   ├── motd
│   └── profile
├── root/
├── home/user/
├── var/log/
├── var/run/
├── tmp/
└── start.sh
```

## Usage Examples

### Run as a development server
```
STARTUP_CMD: python3 -m http.server 8080
EXTRA_PACKAGES: python3
```

### Run a Node.js application
```
STARTUP_CMD: node /home/container/app/index.js
EXTRA_PACKAGES: nodejs npm
```

### Just a shell environment
```
STARTUP_CMD: (leave empty)
```

## Resource Requirements

- **Minimum RAM**: 128MB
- **Recommended RAM**: 256MB-512MB
- **Disk**: 200MB+ (depends on extra packages)
