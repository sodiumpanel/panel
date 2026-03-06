import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadUsers, saveUsers, loadServers, loadConfig, loadSessions, saveSessions } from '../db.js';
import { validateUsername, sanitizeText, sanitizeUrl, generateUUID } from '../utils/helpers.js';
import { authenticateUser } from '../utils/auth.js';
import { getTransporter } from '../utils/mail.js';

const router = express.Router();

router.get('/profile', authenticateUser, async (req, res) => {
  const { username, viewer } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }
  
  const data = await loadUsers();
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpires: _rte, twoFactorCode: _tfc, twoFactorExpires: _tfe, ...safeUser } = user;
  
  const isOwner = viewer && viewer.toLowerCase() === username.toLowerCase();
  const isPublic = user.settings?.privacy === 'public';
  
  if (!isOwner && !isPublic) {
    return res.json({ 
      user: {
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isPrivate: true
      }
    });
  }
  
  res.json({ user: safeUser });
});

router.put('/profile', authenticateUser, async (req, res) => {
  const { displayName, bio, avatar } = req.body;
  
  const data = await loadUsers();
  const userIndex = data.users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = data.users[userIndex];
  
  if (displayName !== undefined) {
    user.displayName = sanitizeText(displayName.slice(0, 50));
  }
  
  if (bio !== undefined) {
    user.bio = sanitizeText(bio.slice(0, 500));
  }
  
  if (avatar !== undefined) {
    user.avatar = sanitizeUrl(avatar);
  }
  
  data.users[userIndex] = user;
  await saveUsers(data);
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

router.put('/settings', authenticateUser, async (req, res) => {
  const { settings } = req.body;
  
  const data = await loadUsers();
  const userIndex = data.users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = data.users[userIndex];
  
  user.settings = { ...user.settings, ...settings };
  data.users[userIndex] = user;
  await saveUsers(data);
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

router.get('/2fa', authenticateUser, async (req, res) => {
  const data = await loadUsers();
  const user = data.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const config = loadConfig();
  const mailConfigured = !!getTransporter();
  
  res.json({
    enabled: user.twoFactorEnabled || false,
    emailVerified: user.emailVerified || false,
    hasEmail: !!user.email,
    mailConfigured,
    required: config.security?.require2fa || (config.security?.require2faAdmin && user.isAdmin)
  });
});

router.put('/2fa', authenticateUser, async (req, res) => {
  const { enabled } = req.body;
  
  const data = await loadUsers();
  const userIndex = data.users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = data.users[userIndex];
  
  if (enabled && !user.emailVerified) {
    return res.status(400).json({ error: 'Email must be verified to enable 2FA' });
  }
  
  if (enabled && !getTransporter()) {
    return res.status(400).json({ error: 'Mail service not configured' });
  }
  
  user.twoFactorEnabled = !!enabled;
  data.users[userIndex] = user;
  await saveUsers(data);
  
  res.json({ success: true, enabled: user.twoFactorEnabled });
});

router.put('/password', authenticateUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  
  const data = await loadUsers();
  const userIndex = data.users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = data.users[userIndex];
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  
  user.password = await bcrypt.hash(newPassword, 10);
  data.users[userIndex] = user;
  await saveUsers(data);
  
  res.json({ success: true, message: 'Password updated successfully' });
});

router.get('/limits', authenticateUser, async (req, res) => {
  const { username } = req.query;
  const users = await loadUsers();
  const user = users.users.find(u => u.username.toLowerCase() === username?.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const servers = await loadServers();
  const userServers = servers.servers.filter(s => s.user_id === user.id);
  
  const used = userServers.reduce((acc, s) => ({
    servers: acc.servers + 1,
    memory: acc.memory + (s.limits?.memory || 0),
    disk: acc.disk + (s.limits?.disk || 0),
    cpu: acc.cpu + (s.limits?.cpu || 0),
    allocations: acc.allocations + (s.feature_limits?.allocations || 1)
  }), { servers: 0, memory: 0, disk: 0, cpu: 0, allocations: 0 });
  
  const limits = user.limits || { servers: 2, memory: 2048, disk: 10240, cpu: 200, allocations: 5 };
  
  const config = loadConfig();
  const canCreateServers = user.isAdmin || !config.features?.disableUserServerCreation;
  
  res.json({ limits, used, canCreateServers });
});

// ==================== SSH KEYS ====================

// List user's SSH keys
router.get('/ssh-keys', authenticateUser, async (req, res) => {
  const data = await loadUsers();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const keys = (user.ssh_keys || []).map(k => ({
    id: k.id,
    name: k.name,
    fingerprint: k.fingerprint,
    created_at: k.created_at,
    last_used: k.last_used
  }));
  
  res.json({ keys });
});

// Add SSH key
router.post('/ssh-keys', authenticateUser, async (req, res) => {
  const { name, public_key } = req.body;
  
  if (!name || !public_key) {
    return res.status(400).json({ error: 'Name and public key are required' });
  }
  
  // Validate SSH key format
  const keyPattern = /^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/=]+/;
  if (!keyPattern.test(public_key.trim())) {
    return res.status(400).json({ error: 'Invalid SSH public key format' });
  }
  
  const data = await loadUsers();
  const userIdx = data.users.findIndex(u => u.id === req.user.id);
  if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
  
  if (!data.users[userIdx].ssh_keys) {
    data.users[userIdx].ssh_keys = [];
  }
  
  // Check for duplicate key
  const keyData = public_key.trim().split(' ')[1];
  if (data.users[userIdx].ssh_keys.some(k => k.public_key.includes(keyData))) {
    return res.status(400).json({ error: 'This SSH key is already added' });
  }
  
  // Generate fingerprint
  const keyBuffer = Buffer.from(keyData, 'base64');
  const hash = crypto.createHash('sha256').update(keyBuffer).digest('base64');
  const fingerprint = `SHA256:${hash.replace(/=+$/, '')}`;
  
  const newKey = {
    id: generateUUID(),
    name: sanitizeText(name.slice(0, 50)),
    public_key: public_key.trim(),
    fingerprint,
    created_at: new Date().toISOString(),
    last_used: null
  };
  
  data.users[userIdx].ssh_keys.push(newKey);
  await saveUsers(data);
  
  res.json({ 
    success: true, 
    key: {
      id: newKey.id,
      name: newKey.name,
      fingerprint: newKey.fingerprint,
      created_at: newKey.created_at
    }
  });
});

// Delete SSH key
router.delete('/ssh-keys/:id', authenticateUser, async (req, res) => {
  const data = await loadUsers();
  const userIdx = data.users.findIndex(u => u.id === req.user.id);
  if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
  
  const keys = data.users[userIdx].ssh_keys || [];
  const keyIdx = keys.findIndex(k => k.id === req.params.id);
  
  if (keyIdx === -1) {
    return res.status(404).json({ error: 'SSH key not found' });
  }
  
  data.users[userIdx].ssh_keys.splice(keyIdx, 1);
  await saveUsers(data);
  
  res.json({ success: true });
});

// Rename SSH key
router.put('/ssh-keys/:id', authenticateUser, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const data = await loadUsers();
  const userIdx = data.users.findIndex(u => u.id === req.user.id);
  if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
  
  const keys = data.users[userIdx].ssh_keys || [];
  const keyIdx = keys.findIndex(k => k.id === req.params.id);
  
  if (keyIdx === -1) {
    return res.status(404).json({ error: 'SSH key not found' });
  }
  
  data.users[userIdx].ssh_keys[keyIdx].name = sanitizeText(name.slice(0, 50));
  await saveUsers(data);
  
  res.json({ success: true });
});

// ==================== SESSIONS ====================

router.get('/sessions', authenticateUser, async (req, res) => {
  const data = await loadSessions();
  const userSessions = data.sessions
    .filter(s => s.userId === req.user.id && !s.revoked)
    .filter(s => new Date(s.expiresAt) > new Date())
    .map(s => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      current: s.id === req.sessionId
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ sessions: userSessions });
});

router.delete('/sessions/:id', authenticateUser, async (req, res) => {
  const data = await loadSessions();
  const session = data.sessions.find(s => s.id === req.params.id && s.userId === req.user.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.revoked = true;
  session.revokedAt = new Date().toISOString();
  await saveSessions(data);
  
  res.json({ success: true });
});

router.delete('/sessions', authenticateUser, async (req, res) => {
  const data = await loadSessions();
  let revokedCount = 0;
  
  for (const session of data.sessions) {
    if (session.userId === req.user.id && !session.revoked && session.id !== req.sessionId) {
      session.revoked = true;
      session.revokedAt = new Date().toISOString();
      revokedCount++;
    }
  }
  
  await saveSessions(data);
  res.json({ success: true, revoked: revokedCount });
});

export default router;
