import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadUsers, loadApiKeys, saveApiKeys, loadSessions, saveSessions, loadGroups } from '../db.js';
import { loadFullConfig, saveFullConfig } from '../config.js';

export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

export function getJwtSecret() {
  const config = loadFullConfig();
  if (config.jwt?.secret) {
    return config.jwt.secret;
  }
  
  // Generate secure secret if not configured
  const newSecret = crypto.randomBytes(64).toString('base64url');
  console.warn('[SECURITY] No JWT secret configured - generating secure random secret');
  
  config.jwt = config.jwt || {};
  config.jwt.secret = newSecret;
  saveFullConfig(config);
  
  return newSecret;
}

export const JWT_SECRET = getJwtSecret();

export function getUserRole(user) {
  if (user.isAdmin) return ROLES.ADMIN;
  if (user.role === ROLES.MODERATOR) return ROLES.MODERATOR;
  return user.role || ROLES.USER;
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
    
    // Check session validity if token has a session ID
    if (decoded.jti) {
      const sessions = loadSessions();
      const session = sessions.sessions.find(s => s.id === decoded.jti);
      if (!session || session.revoked) {
        return res.status(401).json({ error: 'Session revoked' });
      }
    }
    
    const role = getUserRole(user);
    
    req.user = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin || role === ROLES.ADMIN,
      isModerator: role === ROLES.MODERATOR || role === ROLES.ADMIN,
      role: role
    };
    req.sessionId = decoded.jti || null;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.isAdmin) return next();
  
  const data = await loadGroups();
  const userGroups = (data.groups || []).filter(g => g.members?.includes(req.user.id));
  const hasAnyAdmin = userGroups.some(g => 
    g.permissions?.includes('*') || g.permissions?.some(p => p.startsWith('admin.'))
  );
  
  if (hasAnyAdmin) {
    req.user.adminPermissions = [...new Set(userGroups.flatMap(g => g.permissions || []))];
    return next();
  }
  
  return res.status(403).json({ error: 'Admin access required' });
}

export function requireAdminPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.isAdmin) return next();
    
    const perms = req.user.adminPermissions || [];
    if (perms.includes('*') || perms.includes(permission)) return next();
    
    return res.status(403).json({ error: `Missing permission: ${permission}` });
  };
}

export function requireModerator(req, res, next) {
  if (!req.user || !req.user.isModerator) {
    return res.status(403).json({ error: 'Moderator access required' });
  }
  next();
}

export function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No API key provided' });
  }
  
  const token = authHeader.substring(7);
  
  if (!token.startsWith('sodium_')) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  
  const data = loadApiKeys();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  let apiKey = (data.apiKeys || []).find(k => k.tokenHash === tokenHash);
  
  if (!apiKey) {
    apiKey = (data.apiKeys || []).find(k => k.token === token);
    if (apiKey) {
      apiKey.tokenHash = tokenHash;
      delete apiKey.token;
      saveApiKeys(data);
    }
  }
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'API key expired' });
  }
  
  const users = loadUsers();
  const user = users.users.find(u => u.id === apiKey.userId);
  
  if (!user) {
    return res.status(401).json({ error: 'API key owner not found' });
  }
  
  apiKey.lastUsedAt = new Date().toISOString();
  saveApiKeys(data);
  
  req.apiKey = {
    id: apiKey.id,
    type: apiKey.type,
    permissions: apiKey.permissions
  };
  
  req.user = {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    role: getUserRole(user)
  };
  
  next();
}

export function authenticateAny(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  if (token.startsWith('sodium_')) {
    return authenticateApiKey(req, res, next);
  }
  
  return authenticateUser(req, res, next);
}

export function requireApiPermission(permission) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return next();
    }
    
    if (req.apiKey.permissions.includes('*')) {
      return next();
    }
    
    if (!req.apiKey.permissions.includes(permission)) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    
    next();
  };
}

export function requireEmailVerified(req, res, next) {
  if (req.apiKey) {
    return next();
  }
  
  const config = loadFullConfig();
  if (!config.registration?.emailVerification) {
    return next();
  }
  
  const data = loadUsers();
  const user = data.users.find(u => u.id === req.user?.id);
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  if (user.isAdmin) {
    return next();
  }
  
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' });
  }
  
  next();
}

let sessionCleanupStarted = false;
export function startSessionCleanup() {
  if (sessionCleanupStarted) return;
  sessionCleanupStarted = true;
  setInterval(async () => {
    try {
      const data = loadSessions();
      const now = new Date();
      const before = data.sessions.length;
      data.sessions = data.sessions.filter(s => {
        if (s.revoked) return false;
        if (new Date(s.expiresAt) < now) return false;
        return true;
      });
      if (data.sessions.length < before) {
        saveSessions(data);
      }
    } catch {}
  }, 3600000).unref();
}

export function requireGroupPermission(permission) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.isAdmin) return next();
    
    const data = await loadGroups();
    const userGroups = (data.groups || []).filter(g => 
      g.members?.includes(req.user.id)
    );
    
    const hasPermission = userGroups.some(g => 
      g.permissions?.includes('*') || g.permissions?.includes(permission)
    );
    
    if (hasPermission) return next();
    
    return res.status(403).json({ error: `Missing permission: ${permission}` });
  };
}


