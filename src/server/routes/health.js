import { Router } from 'express';
import os from 'os';
import { count, getDbInfo } from '../db.js';
import { loadFullConfig } from '../config.js';

const router = Router();

const startTime = Date.now();

router.get('/health', (req, res) => {
  const config = loadFullConfig();
  const dbInfo = getDbInfo();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    database: {
      type: dbInfo.type,
      connected: dbInfo.connected || dbInfo.type === 'file'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      system: Math.round(os.totalmem() / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024)
    }
  };
  
  res.json(health);
});

router.get('/health/ready', (req, res) => {
  const dbInfo = getDbInfo();
  const isReady = dbInfo.type === 'file' || dbInfo.connected;
  
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'database not connected' });
  }
});

router.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

export default router;
