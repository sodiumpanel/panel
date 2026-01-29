import jwt from 'jsonwebtoken';
import { loadUsers, loadApiKeys, saveApiKeys } from '../db.js';
import logger from './logger.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'sodium-default-secret-change-in-production';
if (!process.env.JWT_SECRET) {
  logger.warn('Using default JWT_SECRET. Set JWT_SECRET env var in production!');
}

export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const data = loadUsers();
    const user = data.users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.isAdmin !== true) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No API key provided' });
  }
  
  const token = authHeader.substring(7);
  const data = loadApiKeys();
  const apiKey = data.apiKeys.find(k => k.token === token);
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  const users = loadUsers();
  const user = users.users.find(u => u.id === apiKey.userId);
  
  if (!user) {
    return res.status(401).json({ error: 'API key owner not found' });
  }
  
  data.apiKeys = data.apiKeys.map(k => 
    k.id === apiKey.id ? { ...k, lastUsedAt: new Date().toISOString() } : k
  );
  saveApiKeys(data);
  
  req.user = {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin
  };
  req.apiKey = apiKey;
  next();
}

export function authenticateAny(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  const apiData = loadApiKeys();
  const apiKey = apiData.apiKeys.find(k => k.token === token);
  
  if (apiKey) {
    const users = loadUsers();
    const user = users.users.find(u => u.id === apiKey.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'API key owner not found' });
    }
    
    apiData.apiKeys = apiData.apiKeys.map(k => 
      k.id === apiKey.id ? { ...k, lastUsedAt: new Date().toISOString() } : k
    );
    saveApiKeys(apiData);
    
    req.user = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    };
    req.apiKey = apiKey;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const data = loadUsers();
    const user = data.users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
