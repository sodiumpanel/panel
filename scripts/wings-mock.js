import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// --- CONFIGURATION ---
const PORT = 8080;
const NODE_UUID = 'mock-node-uuid-12345';
const WINGS_VERSION = '1.11.0';

// --- DATA STORES (MEMORY) ---
// Stores active mock server instances
const servers = new Map();

// --- MOCK DATA GENERATORS ---
const LOG_TEMPLATES = [
    "[INFO] Server listening on 0.0.0.0:25565",
    "[WARN] Can't keep up! Is the server overloaded? Running 2000ms or 40 ticks behind",
    "[INFO] Player MockUser joined the game",
    "[INFO] Saving chunks for level 'ServerLevel'...",
    "[ERROR] Could not load plugin 'MockPlugin': Invalid dependency",
    "[DEBUG] Async connection established",
    "[INFO] Loading libraries, please wait...",
    "[INFO] Prepared 102 recipes",
    "java.lang.NullPointerException: Mock stack trace at com.mock.server.Main(Main.java:42)"
];

const MOCK_FILES = [
    { name: 'server.properties', mode: '-rw-r--r--', size: 1024, is_file: true, created_at: new Date().toISOString() },
    { name: 'eula.txt', mode: '-rw-r--r--', size: 12, is_file: true, created_at: new Date().toISOString() },
    { name: 'logs', mode: 'drwxr-xr-x', size: 0, is_file: false, created_at: new Date().toISOString() },
    { name: 'plugins', mode: 'drwxr-xr-x', size: 0, is_file: false, created_at: new Date().toISOString() },
    { name: 'world', mode: 'drwxr-xr-x', size: 0, is_file: false, created_at: new Date().toISOString() },
    { name: 'server.jar', mode: '-rwxr-xr-x', size: 45000000, is_file: true, created_at: new Date().toISOString() }
];

// --- SERVER INSTANCE CLASS ---
class MockServer {
    constructor(uuid, config) {
        this.uuid = uuid;
        this.config = config;
        this.state = 'offline'; // offline, starting, running, stopping
        
        // Stats
        this.resources = {
            memory_bytes: 0,
            cpu_absolute: 0,
            disk_bytes: 0,
            network_rx_bytes: 0,
            network_tx_bytes: 0,
            uptime: 0
        };

        this.logs = [];
        this.sockets = new Set();
        this.timers = { resources: null, logs: null };
    }

    start() {
        if (this.state === 'running' || this.state === 'starting') return;
        
        this.updateState('starting');
        this.pushLog("Server marked as starting...");

        // Simulate boot time
        setTimeout(() => {
            this.updateState('running');
            this.pushLog("Server marked as running.");
            this.startSimulation();
        }, 2000);
    }

    stop() {
        if (this.state === 'offline') return;

        this.updateState('stopping');
        this.pushLog("Server stopping...");

        setTimeout(() => {
            this.stopSimulation();
            this.updateState('offline');
            this.resetResources();
            this.pushLog("Server offline.");
        }, 1500);
    }

    kill() {
        this.stopSimulation();
        this.updateState('offline');
        this.resetResources();
        this.pushLog("Server killed.");
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

        // 1. Resource usage simulation (every 1s)
        this.timers.resources = setInterval(() => {
            const memLimit = (this.config.build?.memory || 1024) * 1024 * 1024;
            
            this.resources = {
                memory_bytes: Math.floor(Math.random() * (memLimit * 0.5)) + 1024,
                cpu_absolute: Math.random() * (this.config.build?.cpu || 100),
                disk_bytes: 50 * 1024 * 1024,
                network_rx_bytes: this.resources.network_rx_bytes + Math.floor(Math.random() * 1000),
                network_tx_bytes: this.resources.network_tx_bytes + Math.floor(Math.random() * 1000),
                uptime: this.resources.uptime + 1000
            };
            this.broadcastStats();
        }, 1000);

        // 2. Console log simulation (every 5s)
        this.timers.logs = setInterval(() => {
            const line = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
            this.pushLog(line);
        }, 5000);
    }

    stopSimulation() {
        if (this.timers.resources) clearInterval(this.timers.resources);
        if (this.timers.logs) clearInterval(this.timers.logs);
        this.resources.uptime = 0;
    }

    pushLog(line) {
        this.logs.push(line);
        if (this.logs.length > 50) this.logs.shift(); // Keep buffer small
        this.broadcast('console output', line);
    }

    broadcastStats() {
        const stats = {
            memory_bytes: this.resources.memory_bytes,
            memory_limit_bytes: (this.config.build?.memory || 1024) * 1024 * 1024,
            cpu_absolute: this.resources.cpu_absolute,
            network: { rx_bytes: this.resources.network_rx_bytes, tx_bytes: this.resources.network_tx_bytes },
            state: this.state,
            disk_bytes: this.resources.disk_bytes
        };
        this.broadcast('stats', JSON.stringify(stats));
    }

    broadcast(event, args) {
        const payload = JSON.stringify({ event, args: [args] });
        for (const ws of this.sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        }
    }
}

// --- EXPRESS APP SETUP ---

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.json({ limit: '50mb' }));

// Middleware: Log requests & Skip Auth
app.use((req, res, next) => {
    // In a real scenario, we would check 'Authorization' header here.
    // Since you requested "No Token", we just pass through.
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// --- WINGS API ROUTES ---

// 1. System Information (Heartbeat)
app.get('/api/system', (req, res) => {
    res.json({
        version: WINGS_VERSION,
        os: 'linux',
        kernel_version: '5.4.0-mock'
    });
});

// 2. Create/Update Server
app.post('/api/servers', (req, res) => {
    const { uuid, start_on_completion } = req.body;
    console.log(`[API] Creating/Updating server: ${uuid}`);

    let srv = servers.get(uuid);
    if (!srv) {
        srv = new MockServer(uuid, req.body);
        servers.set(uuid, srv);
    } else {
        srv.config = req.body;
    }

    if (start_on_completion) {
        srv.start();
    }

    // Wings returns 202 Accepted
    res.status(202).send();
});

// 3. Delete Server
app.delete('/api/servers/:uuid', (req, res) => {
    const { uuid } = req.params;
    const srv = servers.get(uuid);
    if (srv) {
        srv.kill();
        servers.delete(uuid);
    }
    res.status(204).send();
});

// 4. Get Server Resources
app.get('/api/servers/:uuid/resources', (req, res) => {
    const srv = servers.get(req.params.uuid);
    if (!srv) return res.status(404).json({ error: 'Server not found' });

    res.json({
        object: 'stats',
        attributes: {
            current_state: srv.state,
            is_suspended: false,
            resources: srv.resources
        }
    });
});

// 5. Power Actions
app.post('/api/servers/:uuid/power', (req, res) => {
    const srv = servers.get(req.params.uuid);
    if (!srv) return res.status(404).json({ error: 'Server not found' });

    const { action } = req.body;
    switch (action) {
        case 'start': srv.start(); break;
        case 'stop': srv.stop(); break;
        case 'restart': 
            srv.stop();
            setTimeout(() => srv.start(), 2000);
            break;
        case 'kill': srv.kill(); break;
    }
    res.status(204).send();
});

// 6. Send Command
app.post('/api/servers/:uuid/commands', (req, res) => {
    const srv = servers.get(req.params.uuid);
    if (!srv) return res.status(404).json({ error: 'Server not found' });

    const { commands } = req.body; // Array of commands
    // Just log them
    if (Array.isArray(commands)) {
        commands.forEach(cmd => srv.pushLog(`> ${cmd}`));
    }
    res.status(204).send();
});

// 7. List Files
app.get('/api/servers/:uuid/files/list-directory', (req, res) => {
    const srv = servers.get(req.params.uuid);
    if (!srv) return res.status(404).json({ error: 'Server not found' });

    res.json({
        object: 'list',
        data: MOCK_FILES.map(f => ({
            object: 'file_object',
            attributes: f
        }))
    });
});

// 8. Read File (Mock)
app.get('/api/servers/:uuid/files/contents', (req, res) => {
    res.send("This is mock content generated in memory by the Node.js script.");
});

// --- WEBSOCKET HANDLING ---

server.on('upgrade', (request, socket, head) => {
    // URL Format: /api/servers/{uuid}/ws
    const match = request.url.match(/\/api\/servers\/([a-zA-Z0-9\-]+)\/ws/);

    if (!match) {
        socket.destroy();
        return;
    }

    const uuid = match[1];
    const srv = servers.get(uuid);

    if (!srv) {
        console.log(`[WS] Connection rejected: Server ${uuid} not in memory.`);
        socket.destroy();
        return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, srv);
    });
});

wss.on('connection', (ws, req, srv) => {
    console.log(`[WS] Client connected to server ${srv.uuid}`);
    srv.sockets.add(ws);

    // Send history
    srv.logs.forEach(line => {
        ws.send(JSON.stringify({ event: 'console output', args: [line] }));
    });
    
    // Send initial status
    ws.send(JSON.stringify({ event: 'status', args: [srv.state] }));

    ws.on('message', (message) => {
        try {
            const json = JSON.parse(message);
            const { event, args } = json;

            if (event === 'auth') {
                // Accepts ANY token. Returns a fake JWT.
                ws.send(JSON.stringify({ event: 'jwt', args: ['mock-jwt-token-active'] }));
            }
            else if (event === 'send command') {
                srv.pushLog(`> ${args[0]}`);
            }
            else if (event === 'set state') {
                const state = args[0];
                if (state === 'start') srv.start();
                if (state === 'stop') srv.stop();
                if (state === 'kill') srv.kill();
            }
        } catch (err) {
            console.error('[WS] Error parsing message:', err);
        }
    });

    ws.on('close', () => {
        srv.sockets.delete(ws);
    });
});

// --- START SERVER ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ======================================
    MOCK WINGS NODE
    ======================================
    Port: ${PORT}
    Node UUID: ${NODE_UUID}
    
    Ready to accept connections from Panel.
    Ensure "SSL" is disabled in Panel settings
    for this node.
    ======================================
    `);
});