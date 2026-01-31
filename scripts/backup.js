#!/usr/bin/env node
/**
 * Sodium Automatic Backup
 * 
 * Creates timestamped backups of the Sodium database and config.
 * Can be run manually or via cron for scheduled backups.
 * 
 * Usage:
 *   node scripts/backup.js
 *   node scripts/backup.js --dir /path/to/backups
 *   node scripts/backup.js --keep 7
 * 
 * Cron example (daily at 3am):
 *   0 3 * * * cd /opt/sodium && node scripts/backup.js --keep 7
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const DEFAULT_BACKUP_DIR = path.join(__dirname, '../.backup');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { keep: 30 };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) opts.dir = args[++i];
    else if (args[i] === '--keep' && args[i + 1]) opts.keep = parseInt(args[++i]);
    else if (args[i] === '--help' || args[i] === '-h') opts.help = true;
    else if (args[i] === '--quiet' || args[i] === '-q') opts.quiet = true;
  }
  
  return opts;
}

function formatDate(date) {
  return date.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');
}

function getBackupFiles(backupDir) {
  if (!fs.existsSync(backupDir)) return [];
  
  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort()
    .reverse();
}

function cleanOldBackups(backupDir, keep) {
  const files = getBackupFiles(backupDir);
  const toDelete = files.slice(keep);
  
  for (const file of toDelete) {
    fs.unlinkSync(path.join(backupDir, file));
  }
  
  return toDelete.length;
}

function loadSodiumData() {
  const DB_FILE = path.join(DATA_DIR, 'sodium.db');
  const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
  const MAGIC = Buffer.from('SODIUM01');
  
  const collectionIds = {
    1: 'users', 2: 'nodes', 3: 'servers', 4: 'nests', 5: 'eggs',
    6: 'locations', 7: 'apiKeys', 8: 'announcements', 9: 'auditLogs', 10: 'activityLogs'
  };
  
  const data = { config: null };
  Object.values(collectionIds).forEach(c => data[c] = []);
  
  // Load config
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      data.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      // Redact sensitive data
      if (data.config.jwt) data.config.jwt.secret = '[REDACTED]';
      if (data.config.database) data.config.database.password = '[REDACTED]';
      if (data.config.redis) data.config.redis.password = '[REDACTED]';
    } catch {}
  }
  
  // Load database
  if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE);
    if (buf.length >= 9 && buf.subarray(0, 8).equals(MAGIC)) {
      let offset = 8;
      const collectionCount = buf.readUInt8(offset++);
      
      for (let i = 0; i < collectionCount; i++) {
        const collectionId = buf.readUInt8(offset++);
        const recordCount = buf.readUInt32LE(offset);
        offset += 4;
        
        const name = collectionIds[collectionId];
        if (!name) continue;
        
        data[name] = [];
        
        for (let j = 0; j < recordCount; j++) {
          const len = buf.readUInt32LE(offset);
          offset += 4;
          const json = buf.subarray(offset, offset + len).toString('utf8');
          offset += len;
          try {
            const record = JSON.parse(json);
            // Redact passwords
            if (name === 'users' && record.password) {
              record.password = '[REDACTED]';
            }
            data[name].push(record);
          } catch {}
        }
      }
    }
  }
  
  return data;
}

function main() {
  const opts = parseArgs();
  
  if (opts.help) {
    console.log(`
Sodium Automatic Backup

Usage:
  node scripts/backup.js
  node scripts/backup.js --dir /path/to/backups
  node scripts/backup.js --keep 7

Options:
  --dir       Backup directory (default: .backup/)
  --keep      Number of backups to keep (default: 30)
  --quiet     Suppress output
  --help      Show this help message

Cron example (daily at 3am):
  0 3 * * * cd /opt/sodium && node scripts/backup.js --keep 7
`);
    process.exit(0);
  }
  
  const backupDir = opts.dir || DEFAULT_BACKUP_DIR;
  const timestamp = formatDate(new Date());
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(backupDir, filename);
  
  if (!opts.quiet) {
    log(`${colors.cyan}Sodium Backup${colors.reset}`);
  }
  
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Load data
    if (!opts.quiet) log('Loading data...', colors.dim);
    const data = loadSodiumData();
    
    // Add metadata
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      ...data
    };
    
    // Save backup
    if (!opts.quiet) log('Saving backup...', colors.dim);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    // Get file size
    const stats = fs.statSync(filepath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    // Clean old backups
    const deleted = cleanOldBackups(backupDir, opts.keep);
    
    if (!opts.quiet) {
      log(`\n${colors.green}✓ Backup created${colors.reset}`);
      log(`  File: ${filename}`, colors.dim);
      log(`  Size: ${sizeKB} KB`, colors.dim);
      log(`  Path: ${filepath}`, colors.dim);
      if (deleted > 0) {
        log(`  Cleaned: ${deleted} old backup(s)`, colors.dim);
      }
      
      // Summary
      let total = 0;
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          total += data[key].length;
        }
      }
      log(`  Records: ${total}`, colors.dim);
    }
    
  } catch (err) {
    log(`\n${colors.red}✗ Backup failed: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
