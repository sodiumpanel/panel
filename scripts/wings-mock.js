import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import * as tar from 'tar';

const PORT = 8080;
const PANEL_PORT = 3000;
const PANEL_TOKEN_ID = process.env.PANEL_TOKEN_ID || '';
const PANEL_TOKEN = process.env.PANEL_TOKEN || '';
const WINGS_VERSION = '1.11.13';
const DATA_ROOT = path.resolve(process.env.WINGS_DATA || './wings-data');
const BACKUP_DIR = path.join(DATA_ROOT, 'backups');

if (!fs.existsSync(DATA_ROOT)) fs.mkdirSync(DATA_ROOT, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const servers = new Map();
const activeDownloads = new Map();
let downloadIdCounter = 0;

function notifyPanelInstallComplete(uuid) {
    if (!PANEL_TOKEN_ID || !PANEL_TOKEN) {
        console.log(`[Install] No PANEL_TOKEN_ID/PANEL_TOKEN set, skipping callback for ${uuid}`);
        return;
    }
    const url = `http://localhost:${PANEL_PORT}/api/remote/servers/${uuid}/install`;
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PANEL_TOKEN_ID}.${PANEL_TOKEN}`,
        },
        body: JSON.stringify({ successful: true }),
    }).then(r => {
        console.log(`[Install] Panel callback for ${uuid}: ${r.status}`);
    }).catch(err => {
        console.error(`[Install] Panel callback failed for ${uuid}: ${err.message}`);
    });
}

const LOG_TEMPLATES = [
    '[INFO] Server listening on 0.0.0.0:25565',
    "[WARN] Can't keep up! Is the server overloaded? Running 2000ms or 40 ticks behind",
    '[INFO] Player MockUser joined the game',
    "[INFO] Saving chunks for level 'ServerLevel'...",
    "[ERROR] Could not load plugin 'MockPlugin': Invalid dependency",
    '[DEBUG] Async connection established',
    '[INFO] Loading libraries, please wait...',
    '[INFO] Prepared 102 recipes',
    'java.lang.NullPointerException: Mock stack trace at com.mock.server.Main(Main.java:42)',
];

function serverDataPath(uuid) {
    return path.join(DATA_ROOT, 'servers', uuid);
}

function getDirSize(dir) {
    if (!fs.existsSync(dir)) return 0;
    let size = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                size += getDirSize(full);
            } else {
                try { size += fs.statSync(full).size; } catch {}
            }
        }
    } catch {}
    return size;
}

function guessMime(name) {
    const ext = path.extname(name).toLowerCase();
    const map = {
        '.txt': 'text/plain', '.log': 'text/plain', '.cfg': 'text/plain',
        '.conf': 'text/plain', '.ini': 'text/plain', '.properties': 'text/plain',
        '.yml': 'text/yaml', '.yaml': 'text/yaml', '.json': 'application/json',
        '.xml': 'application/xml', '.html': 'text/html', '.css': 'text/css',
        '.js': 'application/javascript', '.java': 'text/x-java-source',
        '.py': 'text/x-python', '.sh': 'application/x-sh',
        '.jar': 'application/java-archive', '.zip': 'application/zip',
        '.gz': 'application/gzip', '.tar': 'application/x-tar',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.md': 'text/markdown', '.toml': 'text/plain',
    };
    return map[ext] || 'application/octet-stream';
}

function getFileStat(fullPath) {
    const stat = fs.statSync(fullPath);
    const name = path.basename(fullPath);
    const isFile = stat.isFile();
    return {
        name,
        created_at: stat.birthtime.toISOString(),
        modified_at: stat.mtime.toISOString(),
        mode: isFile ? '-rw-r--r--' : 'drwxr-xr-x',
        mode_bits: stat.mode.toString(8),
        size: isFile ? stat.size : 0,
        is_file: isFile,
        is_symlink: stat.isSymbolicLink?.() || false,
        mimetype: isFile ? guessMime(name) : 'inode/directory',
        is_editable: isFile && stat.size < 5 * 1024 * 1024,
    };
}

function resolveServerFile(srv, filePath) {
    const root = srv.dataPath();
    const resolved = path.resolve(root, filePath.replace(/^\/+/, ''));
    if (!resolved.startsWith(root)) return null;
    return resolved;
}

function getOrFail(req, res) {
    const srv = servers.get(req.params.server || req.params.uuid);
    if (!srv) {
        res.status(404).json({ error: 'Server not found' });
        return null;
    }
    return srv;
}

class MockServer {
    constructor(uuid, config) {
        this.uuid = uuid;
        this.config = config;
        this.state = 'offline';
        this.suspended = false;
        this.installing = false;
        this.transferring = false;
        this.restoring = false;
        this.resources = {
            memory_bytes: 0,
            cpu_absolute: 0,
            disk_bytes: 0,
            network_rx_bytes: 0,
            network_tx_bytes: 0,
            uptime: 0,
        };
        this.logs = [];
        this.sockets = new Set();
        this.timers = { resources: null, logs: null };

        const dir = serverDataPath(uuid);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    dataPath() { return serverDataPath(this.uuid); }

    start() {
        if (this.state === 'running' || this.state === 'starting') return;
        if (this.suspended) return;
        this.updateState('starting');
        this.pushLog('Server marked as starting...');
        setTimeout(() => {
            this.updateState('running');
            this.pushLog('Server marked as running.');
            this.startSimulation();
        }, 2000);
    }

    stop(waitSeconds = 30) {
        if (this.state === 'offline') return;
        this.updateState('stopping');
        this.pushLog('Server stopping...');
        setTimeout(() => {
            this.stopSimulation();
            this.updateState('offline');
            this.resetResources();
            this.pushLog('Server offline.');
        }, Math.min(waitSeconds, 5) * 300);
    }

    kill() {
        this.stopSimulation();
        this.updateState('offline');
        this.resetResources();
        this.pushLog('Server killed.');
    }

    restart(waitSeconds = 30) {
        this.stop(waitSeconds);
        setTimeout(() => this.start(), 2500);
    }

    updateState(newState) {
        this.state = newState;
        this.broadcast('status', this.state);
    }

    resetResources() {
        this.resources.memory_bytes = 0;
        this.resources.cpu_absolute = 0;
        this.broadcastStats();
    }

    startSimulation() {
        this.stopSimulation();
        this.timers.resources = setInterval(() => {
            const memLimit = (this.config.build?.memory || 1024) * 1024 * 1024;
            this.resources = {
                memory_bytes: Math.floor(Math.random() * (memLimit * 0.5)) + 1024,
                cpu_absolute: Math.random() * (this.config.build?.cpu || 100),
                disk_bytes: this.calculateDiskUsage(),
                network_rx_bytes: this.resources.network_rx_bytes + Math.floor(Math.random() * 1000),
                network_tx_bytes: this.resources.network_tx_bytes + Math.floor(Math.random() * 1000),
                uptime: this.resources.uptime + 1000,
            };
            this.broadcastStats();
        }, 1000);
        this.timers.logs = setInterval(() => {
            this.pushLog(LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)]);
        }, 5000);
    }

    stopSimulation() {
        if (this.timers.resources) clearInterval(this.timers.resources);
        if (this.timers.logs) clearInterval(this.timers.logs);
        this.timers.resources = null;
        this.timers.logs = null;
        this.resources.uptime = 0;
    }

    pushLog(line) {
        this.logs.push(line);
        if (this.logs.length > 150) this.logs.shift();
        this.broadcast('console output', line);
    }

    broadcastStats() {
        const stats = {
            memory_bytes: this.resources.memory_bytes,
            memory_limit_bytes: (this.config.build?.memory || 1024) * 1024 * 1024,
            cpu_absolute: this.resources.cpu_absolute,
            network: { rx_bytes: this.resources.network_rx_bytes, tx_bytes: this.resources.network_tx_bytes },
            state: this.state,
            disk_bytes: this.resources.disk_bytes,
            uptime: this.resources.uptime,
        };
        this.broadcast('stats', JSON.stringify(stats));
    }

    broadcast(event, args) {
        const payload = JSON.stringify({ event, args: [args] });
        for (const ws of this.sockets) {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        }
    }

    calculateDiskUsage() {
        try { return getDirSize(this.dataPath()); } catch { return 0; }
    }

    readLogfile(lines = 100) { return this.logs.slice(-Math.min(lines, 100)); }

    toAPIResponse() {
        return {
            state: this.state,
            is_suspended: this.suspended,
            uuid: this.uuid,
            configuration: this.config,
        };
    }
}

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.json({ limit: '256mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '256mb' }));
app.use(express.urlencoded({ extended: true, limit: '256mb' }));

app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    if (req.method === 'OPTIONS') return res.status(204).send();
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// === SYSTEM ROUTES ===

app.get('/api/system', (req, res) => {
    const cpus = os.cpus();
    if (req.query.v === '2') {
        res.json({
            version: WINGS_VERSION,
            system: {
                architecture: os.arch(),
                cpu_threads: cpus.length,
                memory_bytes: os.totalmem(),
                kernel_version: os.release(),
                os: os.platform(),
            },
        });
    } else {
        res.json({
            architecture: os.arch(),
            cpu_count: cpus.length,
            kernel_version: os.release(),
            os: os.platform(),
            version: WINGS_VERSION,
        });
    }
});

app.get('/api/servers', (req, res) => {
    const out = [];
    for (const srv of servers.values()) out.push(srv.toAPIResponse());
    res.json(out);
});

app.post('/api/servers', (req, res) => {
    const details = req.body;
    const uuid = details.uuid;
    if (!uuid) return res.status(422).json({ error: 'Missing uuid' });
    console.log(`[API] Creating server: ${uuid}`);
    let srv = servers.get(uuid);
    if (!srv) {
        srv = new MockServer(uuid, details);
        servers.set(uuid, srv);
    } else {
        srv.config = details;
    }
    srv.installing = true;
    srv.pushLog('[Installer] Starting installation process...');
    setTimeout(() => {
        srv.pushLog('[Installer] Installation complete.');
        srv.installing = false;
        srv.broadcast('install completed', null);
        notifyPanelInstallComplete(uuid);
    }, 3000);
    if (details.start_on_completion) setTimeout(() => srv.start(), 4000);
    res.status(202).send();
});

app.post('/api/update', (req, res) => { res.json({ applied: true }); });
app.post('/api/deauthorize-user', (req, res) => { res.status(204).send(); });
app.post('/api/transfers', (req, res) => { res.status(202).send(); });
app.delete('/api/transfers/:server', (req, res) => { res.status(202).send(); });

// === DOWNLOAD ROUTES (signed-URL style) ===

app.get('/download/backup', (req, res) => {
    const uuid = req.query.backup;
    if (!uuid) return res.status(404).json({ error: 'Backup not found' });
    const backupPath = path.join(BACKUP_DIR, `${uuid}.tar.gz`);
    if (!fs.existsSync(backupPath))
        return res.status(404).json({ error: 'The requested backup was not found on this server.' });
    const stat = fs.statSync(backupPath);
    res.set('Content-Length', stat.size);
    res.set('Content-Disposition', `attachment; filename="${uuid}.tar.gz"`);
    res.set('Content-Type', 'application/octet-stream');
    fs.createReadStream(backupPath).pipe(res);
});

app.get('/download/file', (req, res) => {
    const srv = servers.get(req.query.server);
    if (!srv) return res.status(404).json({ error: 'Server not found' });
    const resolved = resolveServerFile(srv, req.query.path || '/');
    if (!resolved || !fs.existsSync(resolved))
        return res.status(404).json({ error: 'The requested resource was not found on this server.' });
    const stat = fs.statSync(resolved);
    if (stat.isDirectory())
        return res.status(404).json({ error: 'The requested resource was not found on this server.' });
    res.set('Content-Length', stat.size);
    res.set('Content-Disposition', `attachment; filename="${path.basename(resolved)}"`);
    res.set('Content-Type', 'application/octet-stream');
    fs.createReadStream(resolved).pipe(res);
});

app.post('/upload/file', (req, res) => {
    const srv = servers.get(req.query.server);
    if (!srv) return res.status(404).json({ error: 'Server not found' });
    const dir = resolveServerFile(srv, req.query.directory || '/');
    if (!dir) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    res.status(204).send();
});

// === PER-SERVER ROUTES ===

app.get('/api/servers/:server', (req, res) => {
    const srv = getOrFail(req, res);
    if (srv) res.json(srv.toAPIResponse());
});

app.delete('/api/servers/:server', (req, res) => {
    const uuid = req.params.server;
    const srv = servers.get(uuid);
    if (srv) { srv.kill(); srv.broadcast('deleted', null); servers.delete(uuid); }
    res.status(204).send();
});

app.get('/api/servers/:server/logs', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    let size = parseInt(req.query.size, 10) || 100;
    if (size <= 0) size = 100;
    if (size > 100) size = 100;
    res.json({ data: srv.readLogfile(size) });
});

app.post('/api/servers/:server/power', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { action, wait_seconds } = req.body;
    if (!['start', 'stop', 'restart', 'kill'].includes(action))
        return res.status(422).json({ error: 'The power action provided was not valid, should be one of "stop", "start", "restart", "kill"' });
    if ((action === 'start' || action === 'restart') && srv.suspended)
        return res.status(400).json({ error: 'Cannot start or restart a server that is suspended.' });
    const ws = wait_seconds != null ? Math.max(0, Math.min(wait_seconds, 300)) : 30;
    switch (action) {
        case 'start': srv.start(); break;
        case 'stop': srv.stop(ws); break;
        case 'restart': srv.restart(ws); break;
        case 'kill': srv.kill(); break;
    }
    res.status(202).send();
});

app.post('/api/servers/:server/commands', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    if (srv.state === 'offline')
        return res.status(502).json({ error: 'Cannot send commands to a stopped server instance.' });
    const { commands } = req.body;
    if (Array.isArray(commands)) commands.forEach(cmd => srv.pushLog(`> ${cmd}`));
    res.status(204).send();
});

app.post('/api/servers/:server/sync', (req, res) => {
    if (getOrFail(req, res)) res.status(204).send();
});

app.post('/api/servers/:server/install', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    srv.installing = true;
    srv.pushLog('[Installer] Starting installation process...');
    setTimeout(() => {
        srv.pushLog('[Installer] Installation complete.');
        srv.installing = false;
        srv.broadcast('install completed', null);
        notifyPanelInstallComplete(srv.uuid);
    }, 3000);
    res.status(202).send();
});

app.post('/api/servers/:server/reinstall', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    if (srv.state === 'running' || srv.state === 'starting')
        return res.status(409).json({ error: 'Cannot execute server reinstall event while another power action is running.' });
    srv.installing = true;
    srv.pushLog('[Installer] Reinstallation started...');
    setTimeout(() => {
        srv.pushLog('[Installer] Reinstallation complete.');
        srv.installing = false;
        srv.broadcast('install completed', null);
        notifyPanelInstallComplete(srv.uuid);
    }, 3000);
    res.status(202).send();
});

app.post('/api/servers/:server/ws/deny', (req, res) => { res.status(204).send(); });

app.post('/api/servers/:server/transfer', (req, res) => {
    const srv = getOrFail(req, res);
    if (srv) { srv.transferring = true; res.status(202).send(); }
});

app.delete('/api/servers/:server/transfer', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    if (!srv.transferring) return res.status(409).json({ error: 'Server is not currently being transferred.' });
    srv.transferring = false;
    res.status(202).send();
});

// === FILE ROUTES ===

app.get('/api/servers/:server/files/contents', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const resolved = resolveServerFile(srv, req.query.file || '/');
    if (!resolved) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'File not found' });
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) return res.status(400).json({ error: 'Cannot open directories' });
    res.set('X-Mime-Type', guessMime(resolved));
    res.set('Content-Length', stat.size);
    if (req.query.download != null) {
        res.set('Content-Disposition', `attachment; filename="${path.basename(resolved)}"`);
        res.set('Content-Type', 'application/octet-stream');
    }
    fs.createReadStream(resolved).pipe(res);
});

app.get('/api/servers/:server/files/list-directory', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const resolved = resolveServerFile(srv, req.query.directory || '/');
    if (!resolved) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'Directory not found' });
    if (!fs.statSync(resolved).isDirectory()) return res.status(400).json({ error: 'Not a directory' });
    try {
        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const data = [];
        for (const entry of entries) {
            try {
                data.push({ object: 'file_object', attributes: getFileStat(path.join(resolved, entry.name)) });
            } catch {}
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/servers/:server/files/rename', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { root, files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0)
        return res.status(422).json({ error: 'No files to move or rename were provided.' });
    for (const f of files) {
        const from = resolveServerFile(srv, path.join(root || '/', f.from));
        const to = resolveServerFile(srv, path.join(root || '/', f.to));
        if (!from || !to) continue;
        try {
            if (fs.existsSync(to))
                return res.status(400).json({ error: 'Cannot move or rename file, destination already exists.' });
            const toDir = path.dirname(to);
            if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true });
            fs.renameSync(from, to);
        } catch (err) {
            if (err.code === 'ENOENT') continue;
            return res.status(500).json({ error: err.message });
        }
    }
    res.status(204).send();
});

app.post('/api/servers/:server/files/copy', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: 'Missing location' });
    const resolved = resolveServerFile(srv, location);
    if (!resolved || !fs.existsSync(resolved)) return res.status(404).json({ error: 'File not found' });
    const dir = path.dirname(resolved);
    const ext = path.extname(resolved);
    const base = path.basename(resolved, ext);
    let copyName = `${base} copy${ext}`;
    let counter = 1;
    while (fs.existsSync(path.join(dir, copyName))) { counter++; copyName = `${base} copy (${counter})${ext}`; }
    fs.copyFileSync(resolved, path.join(dir, copyName));
    res.status(204).send();
});

app.post('/api/servers/:server/files/write', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const filePath = req.query.file;
    if (!filePath) return res.status(400).json({ error: 'Missing file query parameter' });
    const resolved = resolveServerFile(srv, filePath);
    if (!resolved) return res.status(400).json({ error: 'Invalid path' });
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory())
        return res.status(400).json({ error: 'Cannot write file, name conflicts with an existing directory by the same name.' });
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/octet-stream') || Buffer.isBuffer(req.body)) {
        fs.writeFileSync(resolved, req.body);
    } else if (typeof req.body === 'string') {
        fs.writeFileSync(resolved, req.body, 'utf8');
    } else {
        fs.writeFileSync(resolved, JSON.stringify(req.body), 'utf8');
    }
    res.status(204).send();
});

app.post('/api/servers/:server/files/create-directory', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { name, path: dirPath } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const base = resolveServerFile(srv, dirPath || '/');
    if (!base) return res.status(400).json({ error: 'Invalid path' });
    const target = path.join(base, name);
    if (fs.existsSync(target) && !fs.statSync(target).isDirectory())
        return res.status(400).json({ error: 'Part of the path being created is not a directory (ENOTDIR).' });
    fs.mkdirSync(target, { recursive: true });
    res.status(204).send();
});

app.post('/api/servers/:server/files/delete', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { root, files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0)
        return res.status(422).json({ error: 'No files were specified for deletion.' });
    for (const f of files) {
        const resolved = resolveServerFile(srv, path.join(root || '/', f));
        if (!resolved) continue;
        try { fs.rmSync(resolved, { recursive: true, force: true }); } catch {}
    }
    res.status(204).send();
});

app.post('/api/servers/:server/files/compress', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { root, files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0)
        return res.status(422).json({ error: 'No files were passed through to be compressed.' });
    const rootDir = resolveServerFile(srv, root || '/');
    if (!rootDir) return res.status(400).json({ error: 'Invalid path' });
    const archiveName = `archive-${Date.now()}.tar.gz`;
    const archivePath = path.join(rootDir, archiveName);
    try {
        tar.create({ gzip: true, file: archivePath, cwd: rootDir, sync: true }, files);
        const stat = fs.statSync(archivePath);
        res.json({
            name: archiveName, created_at: stat.birthtime.toISOString(), modified_at: stat.mtime.toISOString(),
            mode: '-rw-r--r--', mode_bits: '644', size: stat.size, is_file: true,
            is_symlink: false, mimetype: 'application/tar+gzip', is_editable: false,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/servers/:server/files/decompress', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { root, file } = req.body;
    const rootDir = resolveServerFile(srv, root || '/');
    const filePath = resolveServerFile(srv, path.join(root || '/', file));
    if (!rootDir || !filePath) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    try {
        tar.extract({ file: filePath, cwd: rootDir, sync: true });
        res.status(204).send();
    } catch (err) {
        if (err.message?.includes('TAR_BAD_ARCHIVE'))
            return res.status(400).json({ error: 'The archive provided is in a format Wings does not understand.' });
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/servers/:server/files/chmod', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { root, files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0)
        return res.status(422).json({ error: 'No files to chmod were provided.' });
    for (const f of files) {
        const resolved = resolveServerFile(srv, path.join(root || '/', f.file));
        if (!resolved || !fs.existsSync(resolved)) continue;
        const mode = parseInt(f.mode, 8);
        if (isNaN(mode)) return res.status(400).json({ error: 'Invalid file mode.' });
        try { fs.chmodSync(resolved, mode); } catch {}
    }
    res.status(204).send();
});

app.get('/api/servers/:server/files/pull', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const downloads = [];
    for (const [id, dl] of activeDownloads) {
        if (dl.serverUuid === srv.uuid) downloads.push({ identifier: id, ...dl });
    }
    res.json({ downloads });
});

app.post('/api/servers/:server/files/pull', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { url, root, directory, file_name, use_header, foreground } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing url' });
    const rootPath = root || directory || '/';
    const targetDir = resolveServerFile(srv, rootPath);
    if (!targetDir) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    let count = 0;
    for (const [, dl] of activeDownloads) { if (dl.serverUuid === srv.uuid) count++; }
    if (count >= 3) return res.status(400).json({ error: 'This server has reached its limit of 3 simultaneous remote file downloads at once. Please wait for one to complete before trying again.' });
    const dlId = `dl-${++downloadIdCounter}`;
    const doDownload = async () => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            let fileName = file_name;
            if (!fileName && use_header) {
                const cd = response.headers.get('content-disposition');
                if (cd) { const m = cd.match(/filename[^;=\n]*=(['"]?)([^'"\n]*)\1/); if (m) fileName = m[2]; }
            }
            if (!fileName) fileName = path.basename(new URL(url).pathname) || 'downloaded_file';
            const dest = path.join(targetDir, fileName);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(dest, buffer);
            activeDownloads.delete(dlId);
            return dest;
        } catch (err) { activeDownloads.delete(dlId); throw err; }
    };
    activeDownloads.set(dlId, { serverUuid: srv.uuid, url, identifier: dlId });
    if (foreground) {
        doDownload().then(destPath => {
            try { res.json(getFileStat(destPath)); } catch { res.json({ identifier: dlId }); }
        }).catch(err => res.status(500).json({ error: err.message }));
    } else {
        doDownload().catch(err => console.error(`[DL] Failed: ${err.message}`));
        res.status(202).json({ identifier: dlId });
    }
});

app.delete('/api/servers/:server/files/pull/:download', (req, res) => {
    activeDownloads.delete(req.params.download);
    res.status(204).send();
});

// === BACKUP ROUTES ===

app.post('/api/servers/:server/backup', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { uuid: backupUuid, ignore } = req.body;
    if (!backupUuid) return res.status(400).json({ error: 'Missing backup uuid' });
    const backupPath = path.join(BACKUP_DIR, `${backupUuid}.tar.gz`);
    const dataDir = srv.dataPath();
    const ignored = ignore ? ignore.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const filesToBackup = [];
    try {
        const walk = (dir, rel) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const relPath = path.join(rel, entry.name);
                if (ignored.some(i => relPath.includes(i))) continue;
                if (entry.isDirectory()) walk(path.join(dir, entry.name), relPath);
                else filesToBackup.push(relPath);
            }
        };
        walk(dataDir, '.');
    } catch {}
    try {
        tar.create({ gzip: true, file: backupPath, cwd: dataDir, sync: true }, filesToBackup.length > 0 ? filesToBackup : ['.']);
    } catch (err) { console.error(`[Backup] Error: ${err.message}`); }
    srv.broadcast('backup completed', JSON.stringify({
        uuid: backupUuid, is_successful: true, checksum: '', checksum_type: 'sha256',
        file_size: fs.existsSync(backupPath) ? fs.statSync(backupPath).size : 0,
    }));
    res.status(202).send();
});

app.post('/api/servers/:server/backup/:backup/restore', (req, res) => {
    const srv = getOrFail(req, res);
    if (!srv) return;
    const { truncate_directory, adapter, download_url } = req.body;
    const backupUuid = req.params.backup;
    const dataDir = srv.dataPath();
    srv.restoring = true;
    if (truncate_directory) {
        try { for (const e of fs.readdirSync(dataDir)) fs.rmSync(path.join(dataDir, e), { recursive: true, force: true }); } catch {}
    }
    const finish = () => {
        srv.restoring = false;
        srv.broadcast('daemon message', 'Completed server restoration from backup.');
        srv.broadcast('backup restore completed', '');
    };
    if (adapter === 's3' && download_url) {
        fetch(download_url).then(async r => {
            const buf = Buffer.from(await r.arrayBuffer());
            const tmp = path.join(BACKUP_DIR, `restore-${Date.now()}.tar.gz`);
            fs.writeFileSync(tmp, buf);
            try { tar.extract({ file: tmp, cwd: dataDir, sync: true }); } catch {}
            fs.unlinkSync(tmp);
            finish();
        }).catch(() => finish());
    } else {
        const bp = path.join(BACKUP_DIR, `${backupUuid}.tar.gz`);
        if (fs.existsSync(bp)) { try { tar.extract({ file: bp, cwd: dataDir, sync: true }); } catch {} }
        finish();
    }
    res.status(202).send();
});

app.delete('/api/servers/:server/backup/:backup', (req, res) => {
    const bp = path.join(BACKUP_DIR, `${req.params.backup}.tar.gz`);
    if (!fs.existsSync(bp)) return res.status(404).json({ error: 'The requested backup was not found on this server.' });
    try { fs.unlinkSync(bp); } catch {}
    res.status(204).send();
});

// === WEBSOCKET ===

httpServer.on('upgrade', (request, socket, head) => {
    const match = request.url.match(/\/api\/servers\/([a-zA-Z0-9\-]+)\/ws/);
    if (!match) { socket.destroy(); return; }
    const srv = servers.get(match[1]);
    if (!srv) { console.log(`[WS] Rejected: ${match[1]} not found`); socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, srv));
});

wss.on('connection', (ws, req, srv) => {
    console.log(`[WS] Connected: ${srv.uuid}`);
    srv.sockets.add(ws);

    ws.on('message', (message) => {
        try {
            const { event, args } = JSON.parse(message);
            switch (event) {
                case 'auth':
                    ws.send(JSON.stringify({ event: 'auth success' }));
                    srv.logs.forEach(line => ws.send(JSON.stringify({ event: 'console output', args: [line] })));
                    ws.send(JSON.stringify({ event: 'status', args: [srv.state] }));
                    if (srv.state === 'offline') {
                        ws.send(JSON.stringify({ event: 'stats', args: [JSON.stringify({
                            memory_bytes: 0, memory_limit_bytes: (srv.config.build?.memory || 1024) * 1024 * 1024,
                            cpu_absolute: 0, network: { rx_bytes: 0, tx_bytes: 0 },
                            state: srv.state, disk_bytes: srv.calculateDiskUsage(), uptime: 0,
                        })] }));
                    }
                    break;
                case 'set state':
                    if (args?.[0] === 'start') srv.start();
                    else if (args?.[0] === 'stop') srv.stop();
                    else if (args?.[0] === 'restart') srv.restart();
                    else if (args?.[0] === 'kill') srv.kill();
                    break;
                case 'send command':
                    if (srv.state !== 'offline' && args?.[0]) srv.pushLog(`> ${args[0]}`);
                    break;
                case 'send logs':
                    if (srv.state !== 'offline') srv.logs.forEach(l => ws.send(JSON.stringify({ event: 'console output', args: [l] })));
                    break;
                case 'send stats':
                    ws.send(JSON.stringify({ event: 'stats', args: [JSON.stringify({
                        memory_bytes: srv.resources.memory_bytes, memory_limit_bytes: (srv.config.build?.memory || 1024) * 1024 * 1024,
                        cpu_absolute: srv.resources.cpu_absolute,
                        network: { rx_bytes: srv.resources.network_rx_bytes, tx_bytes: srv.resources.network_tx_bytes },
                        state: srv.state, disk_bytes: srv.resources.disk_bytes, uptime: srv.resources.uptime,
                    })] }));
                    break;
            }
        } catch (err) { console.error('[WS] Error:', err); }
    });

    ws.on('close', () => srv.sockets.delete(ws));
});

// === START ===

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ==========================================
    WINGS MOCK (Full API · No Docker · No Auth)
    ==========================================
    Port:        ${PORT}
    Version:     ${WINGS_VERSION}
    Data Root:   ${DATA_ROOT}
    Backup Dir:  ${BACKUP_DIR}

    Routes:
      System:    GET /api/system · GET /api/servers · POST /api/servers
                 POST /api/update · POST /api/deauthorize-user
      Download:  GET /download/backup · GET /download/file · POST /upload/file
      Transfer:  POST /api/transfers · DELETE /api/transfers/:server
      Server:    GET|DELETE /api/servers/:server
                 GET /api/servers/:server/logs
                 POST /api/servers/:server/power
                 POST /api/servers/:server/commands
                 POST /api/servers/:server/sync
                 POST /api/servers/:server/install
                 POST /api/servers/:server/reinstall
                 POST /api/servers/:server/ws/deny
                 POST|DELETE /api/servers/:server/transfer
      Files:     GET  .../files/contents · GET  .../files/list-directory
                 PUT  .../files/rename   · POST .../files/copy
                 POST .../files/write    · POST .../files/create-directory
                 POST .../files/delete   · POST .../files/compress
                 POST .../files/decompress · POST .../files/chmod
                 GET|POST .../files/pull · DELETE .../files/pull/:download
      Backups:   POST .../backup · POST .../backup/:backup/restore
                 DELETE .../backup/:backup
      WebSocket: WS /api/servers/:server/ws

    Ready to accept connections.
    ==========================================
    `);
});
