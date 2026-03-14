import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import logger from './utils/logger.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import statusRoutes from './routes/status.js';
import adminRoutes from './routes/admin.js';
import serverRoutes from './routes/servers.js';
import remoteRoutes from './routes/remote.js';
import apiKeysRoutes from './routes/api-keys.js';
import announcementsRoutes from './routes/announcements.js';
import auditLogsRoutes from './routes/audit-logs.js';
import activityLogsRoutes from './routes/activity-logs.js';
import webhooksRoutes from './routes/webhooks.js';
import backupsRoutes from './routes/backups.js';
import schedulesRoutes, { startScheduler } from './routes/schedules.js';
import setupRoutes from './routes/setup.js';
import healthRoutes from './routes/health.js';
import metricsRoutes, { recordRequest } from './routes/metrics.js';
import applicationApiRoutes from './routes/application-api.js';
import pluginsRoutes from './routes/plugins.js';
import { setupWebSocket } from './socket.js';
import { isInstalled, loadFullConfig } from './config.js';
import { initRedis } from './redis.js';
import { loadPlugins, getPluginRouters, getPluginClientData, getPlugin, getPluginMiddlewares } from './plugins/manager.js';
import fs from 'fs';

let cachedHtml = null;
export function clearHtmlCache() { cachedHtml = null; }
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function matchIp(clientIp, pattern) {
  // Normalize IPv6-mapped IPv4
  const normalize = (ip) => ip.replace(/^::ffff:/, '');
  const normalizedClient = normalize(clientIp);
  const normalizedPattern = normalize(pattern);
  
  // Exact match
  if (normalizedClient === normalizedPattern) return true;
  
  // CIDR match
  if (normalizedPattern.includes('/')) {
    const [subnet, bits] = normalizedPattern.split('/');
    const mask = parseInt(bits);
    if (isNaN(mask)) return false;
    
    const ipParts = subnet.split('.').map(Number);
    const clientParts = normalizedClient.split('.').map(Number);
    if (ipParts.length !== 4 || clientParts.length !== 4) return false;
    
    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const clientNum = (clientParts[0] << 24) | (clientParts[1] << 16) | (clientParts[2] << 8) | clientParts[3];
    const maskNum = mask === 0 ? 0 : (~0 << (32 - mask));
    
    return (ipNum & maskNum) === (clientNum & maskNum);
  }
  
  // Wildcard match (e.g., 192.168.1.*)
  if (normalizedPattern.includes('*')) {
    const regex = new RegExp('^' + normalizedPattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
    return regex.test(normalizedClient);
  }
  
  return false;
}

const app = express();
const server = createServer(app);
const config = loadFullConfig();
const PORT = process.env.PORT || (config.panel.port || 3000);

// Security middleware
app.set('trust proxy', process.env.TRUST_PROXY || 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Request tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// IP security
app.use((req, res, next) => {
  const config = loadFullConfig();
  const clientIp = req.ip;
  
  // Check IP blocklist
  const blocklist = config.security?.ipBlocklist || [];
  if (blocklist.length > 0 && blocklist.some(ip => matchIp(clientIp, ip))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
});

// Maintenance mode
app.use(async (req, res, next) => {
  const config = loadFullConfig();
  if (!config.maintenance?.enabled) return next();
  
  // Allow health, setup, and auth endpoints
  if (req.path.startsWith('/api/health') || req.path.startsWith('/api/setup') || req.path.startsWith('/api/auth')) return next();
  
  // Allow non-API requests (frontend will handle maintenance page)
  if (!req.path.startsWith('/api/')) return next();
  
  // Check allowed IPs
  const allowedIps = config.maintenance?.allowedIps || [];
  if (allowedIps.length > 0 && allowedIps.some(ip => matchIp(req.ip, ip))) {
    return next();
  }
  
  // Check if admin via JWT
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && !authHeader.substring(7).startsWith('sodium_')) {
    try {
      const { default: jwt } = await import('jsonwebtoken');
      const { JWT_SECRET } = await import('./utils/auth.js');
      const { loadUsers } = await import('./db.js');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const data = loadUsers();
      const user = (data.users || []).find(u => u.id === decoded.id);
      if (user?.isAdmin) return next();
    } catch {}
  }
  
  return res.status(503).json({ 
    error: 'Panel is under maintenance',
    message: config.maintenance?.message || 'The panel is currently under maintenance. Please try again later.',
    maintenance: true
  });
});

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    recordRequest(Date.now() - start);
  });
  next();
});

// Assets estáticos
app.use(express.static(path.join(__dirname, '../../dist')));
app.use(express.static(path.join(__dirname, '../../assets')));

// Health & Metrics (always available, no auth)
app.use('/api', healthRoutes);
app.use(metricsRoutes);

// Setup routes (always available)
app.use('/api/setup', setupRoutes);

// Plugin client data endpoint (no auth required - frontend needs this to load)
app.get('/api/plugins/client-data', (req, res) => {
  res.json({ plugins: getPluginClientData() });
});

// Serve plugin client.js files (no auth - loaded as ES modules)
app.get('/api/plugins/:id/client.js', (req, res) => {
  const plugin = getPlugin(req.params.id);
  if (!plugin?.active || !plugin._clientModule) {
    return res.status(404).json({ error: 'Plugin client not found' });
  }
  res.type('application/javascript').sendFile(plugin._clientModule);
});

// Branding (public - frontend needs this before auth)
app.use('/branding', express.static(path.join(__dirname, '../../data/branding')));
app.get('/api/branding', (req, res) => {
  const config = loadFullConfig();
  res.json({
    name: config.panel?.name || 'Sodium',
    logo: config.branding?.logo || null,
    favicon: config.branding?.favicon || null,
    accentColor: config.branding?.accentColor || '#d97339',
    accentHover: config.branding?.accentHover || '#e88a4d',
    accentMuted: config.branding?.accentMuted || 'rgba(217, 115, 57, 0.1)',
    ogTitle: config.branding?.ogTitle || '',
    ogDescription: config.branding?.ogDescription || '',
    ogImage: config.branding?.ogImage || null
  });
});

// Maintenance status (public - frontend needs this)
app.get('/api/maintenance', (req, res) => {
  const config = loadFullConfig();
  res.json({
    enabled: !!config.maintenance?.enabled,
    message: config.maintenance?.message || ''
  });
});

// Middleware to check if installed
app.use('/api', (req, res, next) => {
  if (!isInstalled() && !req.path.startsWith('/setup')) {
    return res.status(503).json({ error: 'Panel not configured', needsSetup: true });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', statusRoutes);
// Admin IP allowlist
app.use('/api/admin', (req, res, next) => {
  const config = loadFullConfig();
  const allowlist = config.security?.adminIpAllowlist || [];
  if (allowlist.length > 0 && !allowlist.some(ip => matchIp(req.ip, ip))) {
    return res.status(403).json({ error: 'Admin access denied from this IP' });
  }
  next();
});
app.use('/api/admin', adminRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/remote', remoteRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/admin/audit-logs', auditLogsRoutes);
app.use('/api/activity', activityLogsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/servers', backupsRoutes);
app.use('/api/admin/plugins', pluginsRoutes);

// Plugin middlewares (applied before plugin routes)
app.use('/api/plugins', (req, res, next) => {
  const middlewares = getPluginMiddlewares();
  if (middlewares.length === 0) return next();
  let i = 0;
  const run = () => {
    if (i >= middlewares.length) return next();
    middlewares[i++](req, res, run);
  };
  run();
});

// Plugin routes (mounted dynamically - BEFORE schedulesRoutes to avoid global auth)
app.use('/api/plugins', (req, res, next) => {
  const parts = req.path.split('/').filter(Boolean);
  if (parts.length < 1) return next();
  const pluginId = parts[0];
  const routers = getPluginRouters();
  const match = routers.find(r => r.id === pluginId);
  if (match) {
    req.url = '/' + parts.slice(1).join('/') || '/';
    return match.router(req, res, next);
  }
  next();
});

// These must come after plugin routes (schedulesRoutes has global auth middleware)
app.use('/api', schedulesRoutes);
app.use('/api/application', applicationApiRoutes);

// Fallback para SPA — inject dynamic OG meta tags
app.get(/.*/, (req, res) => {
  const htmlPath = path.join(__dirname, '../../dist', 'main.html');
  
  if (!cachedHtml) {
    try { cachedHtml = fs.readFileSync(htmlPath, 'utf-8'); } catch { return res.sendFile(htmlPath); }
  }
  
  const config = loadFullConfig();
  const b = config.branding || {};
  const panelName = config.panel?.name || 'Sodium';
  
  const escAttr = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  const ogTitle = escAttr(b.ogTitle || panelName);
  const ogDesc = escAttr(b.ogDescription || config.panel?.description || 'Modern game server management panel.');
  const ogImage = escAttr(b.ogImage || '/banner.png');
  const favicon = escAttr(b.favicon || '/favicon.svg');
  const safePanelName = escHtml(panelName);
  
  let html = cachedHtml
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}">`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${ogDesc}"><meta property="og:title" content="${ogTitle}"><meta property="og:description" content="${ogDesc}">`)
    .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${favicon}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${safePanelName}</title>`);
  
  res.type('html').send(html);
});

async function startServer() {
  setupWebSocket(server);
  
  if (isInstalled()) {
    await initRedis();
    startScheduler();
    const { startNodeHealthMonitor } = await import('./utils/node-health.js');
    startNodeHealthMonitor();
    const { startSessionCleanup } = await import('./utils/auth.js');
    startSessionCleanup();
    await loadPlugins();
  }
  
  server.listen(PORT, () => {
    logger.startup(PORT, !isInstalled());
  });
}

startServer().catch(err => {
  logger.error(`Server startup failed: ${err.message}`);
  process.exit(1);
});

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  try {
    const { closeRedis } = await import('./redis.js');
    await closeRedis();
  } catch {}
  
  try {
    const { stopNodeHealthMonitor } = await import('./utils/node-health.js');
    stopNodeHealthMonitor();
  } catch {}
  
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
  
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
