import express from 'express';
import bcrypt from 'bcryptjs';
import { 
  loadUsers, saveUsers, loadNodes, saveNodes, 
  loadServers, saveServers, loadLocations, saveLocations,
  loadNests, saveNests, loadEggs, saveEggs
} from '../db.js';
import { authenticateApiKey, requireApiPermission } from '../utils/auth.js';
import { generateUUID, sanitizeText, validateUsername, wingsRequest, generateNodeConfig } from '../utils/helpers.js';
import { loadConfig } from '../db.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticateApiKey);

// ==================== USERS ====================

router.get('/users', requireApiPermission('users.read'), async (req, res) => {
  const { page = 1, per_page = 50 } = req.query;
  const data = await loadUsers();
  
  const total = data.users.length;
  const totalPages = Math.ceil(total / per_page);
  const start = (parseInt(page) - 1) * parseInt(per_page);
  
  const users = data.users
    .slice(start, start + parseInt(per_page))
    .map(({ password, twoFactorCode, twoFactorExpires, verificationToken, resetToken, ...u }) => u);
  
  res.json({
    data: users,
    meta: { current_page: parseInt(page), per_page: parseInt(per_page), total, total_pages: totalPages }
  });
});

router.get('/users/:id', requireApiPermission('users.read'), async (req, res) => {
  const data = await loadUsers();
  const user = data.users.find(u => u.id === req.params.id);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { password, twoFactorCode, twoFactorExpires, verificationToken, resetToken, ...safeUser } = user;
  res.json({ data: safeUser });
});

router.post('/users', requireApiPermission('users.create'), async (req, res) => {
  const { username, email, password, isAdmin, limits } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }
  
  const data = await loadUsers();
  
  if (data.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  if (email && data.users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const config = loadConfig();
  const defaults = config.defaults || {};
  
  const newUser = {
    id: generateUUID(),
    username: sanitizeText(username),
    email: email || null,
    password: await bcrypt.hash(password, 12),
    displayName: sanitizeText(username),
    bio: '',
    avatar: '',
    links: {},
    isAdmin: isAdmin || false,
    emailVerified: true,
    limits: {
      servers: limits?.servers ?? defaults.servers ?? 2,
      memory: limits?.memory ?? defaults.memory ?? 2048,
      disk: limits?.disk ?? defaults.disk ?? 10240,
      cpu: limits?.cpu ?? defaults.cpu ?? 200,
      backups: limits?.backups ?? defaults.backups ?? 3
    },
    createdAt: new Date().toISOString(),
    settings: { theme: 'dark', notifications: true, privacy: 'public' }
  };
  
  data.users.push(newUser);
  await saveUsers(data);
  
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ data: safeUser });
});

router.patch('/users/:id', requireApiPermission('users.update'), async (req, res) => {
  const { email, password, isAdmin, limits } = req.body;
  const data = await loadUsers();
  const idx = data.users.findIndex(u => u.id === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  
  const user = data.users[idx];
  
  if (email !== undefined) user.email = email;
  if (isAdmin !== undefined) user.isAdmin = isAdmin;
  if (password) user.password = await bcrypt.hash(password, 12);
  if (limits) user.limits = { ...user.limits, ...limits };
  
  await saveUsers(data);
  
  const { password: _, ...safeUser } = user;
  res.json({ data: safeUser });
});

router.delete('/users/:id', requireApiPermission('users.delete'), async (req, res) => {
  const data = await loadUsers();
  const idx = data.users.findIndex(u => u.id === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  
  data.users.splice(idx, 1);
  await saveUsers(data);
  
  res.status(204).send();
});

// ==================== SERVERS ====================

router.get('/servers', requireApiPermission('servers.read'), async (req, res) => {
  const { page = 1, per_page = 50 } = req.query;
  const data = await loadServers();
  
  const total = data.servers.length;
  const totalPages = Math.ceil(total / per_page);
  const start = (parseInt(page) - 1) * parseInt(per_page);
  
  const servers = data.servers.slice(start, start + parseInt(per_page));
  
  res.json({
    data: servers,
    meta: { current_page: parseInt(page), per_page: parseInt(per_page), total, total_pages: totalPages }
  });
});

router.get('/servers/:id', requireApiPermission('servers.read'), async (req, res) => {
  const data = await loadServers();
  const server = data.servers.find(s => s.id === req.params.id || s.uuid === req.params.id);
  
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  res.json({ data: server });
});

router.patch('/servers/:id/build', requireApiPermission('servers.update'), async (req, res) => {
  const { memory, disk, cpu, swap, io } = req.body;
  const data = await loadServers();
  const idx = data.servers.findIndex(s => s.id === req.params.id || s.uuid === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  
  const server = data.servers[idx];
  
  if (memory !== undefined) server.limits.memory = parseInt(memory);
  if (disk !== undefined) server.limits.disk = parseInt(disk);
  if (cpu !== undefined) server.limits.cpu = parseInt(cpu);
  if (swap !== undefined) server.limits.swap = parseInt(swap);
  if (io !== undefined) server.limits.io = parseInt(io);
  
  await saveServers(data);
  
  const nodes = await loadNodes();
  const node = nodes.nodes.find(n => n.id === server.node_id);
  
  if (node) {
    try {
      await wingsRequest(node, 'POST', `/api/servers/${server.uuid}/sync`);
    } catch (e) {
      // Log but don't fail
    }
  }
  
  res.json({ data: server });
});

router.post('/servers/:id/suspend', requireApiPermission('servers.update'), async (req, res) => {
  const data = await loadServers();
  const idx = data.servers.findIndex(s => s.id === req.params.id || s.uuid === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  
  data.servers[idx].suspended = true;
  await saveServers(data);
  
  res.status(204).send();
});

router.post('/servers/:id/unsuspend', requireApiPermission('servers.update'), async (req, res) => {
  const data = await loadServers();
  const idx = data.servers.findIndex(s => s.id === req.params.id || s.uuid === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  
  data.servers[idx].suspended = false;
  await saveServers(data);
  
  res.status(204).send();
});

router.delete('/servers/:id', requireApiPermission('servers.delete'), async (req, res) => {
  const data = await loadServers();
  const idx = data.servers.findIndex(s => s.id === req.params.id || s.uuid === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'Server not found' });
  
  const server = data.servers[idx];
  const nodes = await loadNodes();
  const node = nodes.nodes.find(n => n.id === server.node_id);
  
  if (node) {
    try {
      await wingsRequest(node, 'DELETE', `/api/servers/${server.uuid}`);
    } catch (e) {
      // Continue even if Wings delete fails
    }
  }
  
  data.servers.splice(idx, 1);
  await saveServers(data);
  
  res.status(204).send();
});

// ==================== NODES ====================

router.get('/nodes', requireApiPermission('nodes.read'), async (req, res) => {
  const data = await loadNodes();
  res.json({ data: data.nodes });
});

router.get('/nodes/:id', requireApiPermission('nodes.read'), async (req, res) => {
  const data = await loadNodes();
  const node = data.nodes.find(n => n.id === req.params.id);
  
  if (!node) return res.status(404).json({ error: 'Node not found' });
  
  res.json({ data: node });
});

router.get('/nodes/:id/configuration', requireApiPermission('nodes.read'), async (req, res) => {
  const data = await loadNodes();
  const node = data.nodes.find(n => n.id === req.params.id);
  
  if (!node) return res.status(404).json({ error: 'Node not found' });
  
  res.json(generateNodeConfig(node));
});

// ==================== LOCATIONS ====================

router.get('/locations', requireApiPermission('locations.read'), async (req, res) => {
  const data = await loadLocations();
  res.json({ data: data.locations });
});

router.post('/locations', requireApiPermission('locations.create'), async (req, res) => {
  const { short, long } = req.body;
  
  if (!short) return res.status(400).json({ error: 'Short name required' });
  
  const data = await loadLocations();
  
  const newLocation = {
    id: generateUUID(),
    short: sanitizeText(short),
    long: sanitizeText(long || '')
  };
  
  data.locations.push(newLocation);
  await saveLocations(data);
  
  res.status(201).json({ data: newLocation });
});

router.delete('/locations/:id', requireApiPermission('locations.delete'), async (req, res) => {
  const data = await loadLocations();
  const idx = data.locations.findIndex(l => l.id === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'Location not found' });
  
  data.locations.splice(idx, 1);
  await saveLocations(data);
  
  res.status(204).send();
});

// ==================== NESTS & EGGS ====================

router.get('/nests', requireApiPermission('nests.read'), async (req, res) => {
  const data = await loadNests();
  res.json({ data: data.nests });
});

router.get('/nests/:id/eggs', requireApiPermission('eggs.read'), async (req, res) => {
  const eggs = await loadEggs();
  const nestEggs = eggs.eggs.filter(e => e.nest_id === req.params.id);
  res.json({ data: nestEggs });
});

router.get('/eggs/:id', requireApiPermission('eggs.read'), async (req, res) => {
  const data = await loadEggs();
  const egg = data.eggs.find(e => e.id === req.params.id);
  
  if (!egg) return res.status(404).json({ error: 'Egg not found' });
  
  res.json({ data: egg });
});

export default router;
