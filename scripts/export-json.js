#!/usr/bin/env node
/**
 * Sodium Export to JSON
 * 
 * Export all Sodium data to a JSON file for backup or transfer.
 * 
 * Usage:
 *   node scripts/export-json.js > backup.json
 *   node scripts/export-json.js --output backup.json
 *   node scripts/export-json.js --pretty
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'sodium.db');
const MAGIC = Buffer.from('SODIUM01');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(msg, color = '') {
  console.error(`${color}${msg}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { pretty: false };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) opts.output = args[++i];
    else if (args[i] === '--pretty') opts.pretty = true;
    else if (args[i] === '--help' || args[i] === '-h') opts.help = true;
  }
  
  return opts;
}

function loadSodiumDb() {
  const collectionIds = {
    1: 'users', 2: 'nodes', 3: 'servers', 4: 'nests', 5: 'eggs',
    6: 'locations', 7: 'apiKeys', 8: 'announcements', 9: 'auditLogs', 10: 'activityLogs'
  };
  
  const data = {};
  Object.values(collectionIds).forEach(c => data[c] = []);
  
  if (!fs.existsSync(DB_FILE)) {
    return data;
  }
  
  const buf = fs.readFileSync(DB_FILE);
  if (buf.length < 9 || !buf.subarray(0, 8).equals(MAGIC)) {
    return data;
  }
  
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
        data[name].push(JSON.parse(json));
      } catch {}
    }
  }
  
  return data;
}

function main() {
  const opts = parseArgs();
  
  if (opts.help) {
    console.log(`
Sodium Export to JSON

Usage:
  node scripts/export-json.js > backup.json
  node scripts/export-json.js --output backup.json

Options:
  --output    Output file (default: stdout)
  --pretty    Pretty print JSON
  --help      Show this help message
`);
    process.exit(0);
  }
  
  log(`${colors.cyan}Exporting Sodium data to JSON...${colors.reset}`);
  
  const data = loadSodiumDb();
  
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    ...data
  };
  
  // Remove sensitive data
  if (exportData.users) {
    exportData.users = exportData.users.map(u => ({
      ...u,
      password: '[REDACTED]'
    }));
  }
  
  const json = opts.pretty 
    ? JSON.stringify(exportData, null, 2) 
    : JSON.stringify(exportData);
  
  if (opts.output) {
    fs.writeFileSync(opts.output, json);
    log(`${colors.green}✓ Exported to ${opts.output}${colors.reset}`);
  } else {
    console.log(json);
  }
  
  let total = 0;
  for (const key of Object.keys(data)) {
    const count = data[key]?.length || 0;
    if (count > 0) {
      log(`  ${key}: ${count}`, colors.dim);
      total += count;
    }
  }
  log(`  Total: ${total} records`, colors.cyan);
}

main();
