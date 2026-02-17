import express from 'express';
import crypto from 'crypto';
import { loadApiKeys, saveApiKeys } from '../db.js';
import { authenticateUser, requireAdmin } from '../utils/auth.js';
import { generateUUID } from '../utils/helpers.js';

const router = express.Router();

const API_KEY_TYPES = {
  USER: 'user',
  APPLICATION: 'application'
};

const USER_PERMISSIONS = [
  'servers.read',
  'servers.create',
  'servers.update',
  'servers.delete',
  'servers.console',
  'servers.files',
  'servers.power',
  'profile.read',
  'profile.update'
];

const APPLICATION_PERMISSIONS = [
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'servers.read',
  'servers.create',
  'servers.update',
  'servers.delete',
  'nodes.read',
  'nodes.create',
  'nodes.update',
  'nodes.delete',
  'locations.read',
  'locations.create',
  'locations.update',
  'locations.delete',
  'eggs.read',
  'eggs.create',
  'eggs.update',
  'eggs.delete',
  'nests.read',
  'nests.create',
  'nests.update',
  'nests.delete'
];

function generateApiToken() {
  return 'sodium_' + crypto.randomBytes(32).toString('base64url');
}

router.get('/permissions', authenticateUser, (req, res) => {
  res.json({
    user: USER_PERMISSIONS,
    application: req.user.isAdmin ? APPLICATION_PERMISSIONS : []
  });
});

router.get('/', authenticateUser, (req, res) => {
  const data = loadApiKeys();
  const userKeys = data.apiKeys
    .filter(k => k.userId === req.user.id && k.type === API_KEY_TYPES.USER)
    .map(k => ({
      id: k.id,
      name: k.name,
      permissions: k.permissions,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt
    }));
  
  res.json({ keys: userKeys });
});

router.post('/', authenticateUser, (req, res) => {
  const { name, permissions, expiresAt } = req.body;
  
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
    return res.status(400).json({ error: 'Name must be 1-50 characters' });
  }
  
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ error: 'At least one permission is required' });
  }
  
  const invalidPerms = permissions.filter(p => !USER_PERMISSIONS.includes(p));
  if (invalidPerms.length > 0) {
    return res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
  }
  
  const data = loadApiKeys();
  const userKeyCount = data.apiKeys.filter(k => k.userId === req.user.id && k.type === API_KEY_TYPES.USER).length;
  
  if (userKeyCount >= 10) {
    return res.status(400).json({ error: 'Maximum of 10 API keys per user' });
  }
  
  const token = generateApiToken();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const apiKey = {
    id: generateUUID(),
    userId: req.user.id,
    type: API_KEY_TYPES.USER,
    name: name.trim(),
    token,
    tokenHash,
    permissions,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    expiresAt: expiresAt || null
  };
  
  data.apiKeys.push(apiKey);
  saveApiKeys(data);
  
  res.json({
    id: apiKey.id,
    name: apiKey.name,
    token,
    permissions: apiKey.permissions,
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt
  });
});

router.delete('/:id', authenticateUser, (req, res) => {
  const { id } = req.params;
  const data = loadApiKeys();
  
  const keyIndex = data.apiKeys.findIndex(k => k.id === id && k.userId === req.user.id && k.type === API_KEY_TYPES.USER);
  
  if (keyIndex === -1) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  data.apiKeys.splice(keyIndex, 1);
  saveApiKeys(data);
  
  res.json({ message: 'API key deleted' });
});

router.get('/application', authenticateUser, requireAdmin, (req, res) => {
  const data = loadApiKeys();
  const appKeys = data.apiKeys
    .filter(k => k.type === API_KEY_TYPES.APPLICATION)
    .map(k => ({
      id: k.id,
      name: k.name,
      permissions: k.permissions,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      createdBy: k.createdBy,
      expiresAt: k.expiresAt
    }));
  
  res.json({ keys: appKeys });
});

router.post('/application', authenticateUser, requireAdmin, (req, res) => {
  const { name, permissions, expiresAt } = req.body;
  
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
    return res.status(400).json({ error: 'Name must be 1-50 characters' });
  }
  
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ error: 'At least one permission is required' });
  }
  
  const invalidPerms = permissions.filter(p => !APPLICATION_PERMISSIONS.includes(p));
  if (invalidPerms.length > 0) {
    return res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
  }
  
  const data = loadApiKeys();
  const token = generateApiToken();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const apiKey = {
    id: generateUUID(),
    userId: req.user.id,
    type: API_KEY_TYPES.APPLICATION,
    name: name.trim(),
    token,
    tokenHash,
    permissions,
    createdAt: new Date().toISOString(),
    createdBy: req.user.username,
    lastUsedAt: null,
    expiresAt: expiresAt || null
  };
  
  data.apiKeys.push(apiKey);
  saveApiKeys(data);
  
  res.json({
    id: apiKey.id,
    name: apiKey.name,
    token,
    permissions: apiKey.permissions,
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt
  });
});

router.delete('/application/:id', authenticateUser, requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = loadApiKeys();
  
  const keyIndex = data.apiKeys.findIndex(k => k.id === id && k.type === API_KEY_TYPES.APPLICATION);
  
  if (keyIndex === -1) {
    return res.status(404).json({ error: 'Application key not found' });
  }
  
  data.apiKeys.splice(keyIndex, 1);
  saveApiKeys(data);
  
  res.json({ message: 'Application key deleted' });
});

export default router;
