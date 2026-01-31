#!/usr/bin/env node
/**
 * Sodium Import from JSON
 * 
 * Import data from a JSON backup file.
 * 
 * Usage:
 *   node scripts/import-json.js backup.json
 *   node scripts/import-json.js --input backup.json
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'sodium.db');
const MAGIC = Buffer.from('SODIUM01');

const COLLECTIONS = ['users', 'nodes', 'servers', 'nests', 'eggs', 'locations', 'apiKeys', 'announcements', 'auditLogs', 'activityLogs'];

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

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) opts.input = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') opts.help = true;
    else if (!args[i].startsWith('-')) opts.input = args[i];
  }
  
  return opts;
}

function saveSodiumDb(data) {
  const collectionIds = {
    'users': 1, 'nodes': 2, 'servers': 3, 'nests': 4, 'eggs': 5,
    'locations': 6, 'apiKeys': 7, 'announcements': 8, 'auditLogs': 9, 'activityLogs': 10
  };
  
  const encodeRecord = (record) => {
    const json = JSON.stringify(record);
    const buf = Buffer.from(json, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(buf.length, 0);
    return Buffer.concat([lenBuf, buf]);
  };
  
  const encodeCollection = (id, records) => {
    const encoded = records.map(encodeRecord);
    const header = Buffer.alloc(5);
    header.writeUInt8(id, 0);
    header.writeUInt32LE(records.length, 1);
    return Buffer.concat([header, ...encoded]);
  };
  
  const collections = COLLECTIONS.map(name => 
    encodeCollection(collectionIds[name], data[name] || [])
  );
  
  const countBuf = Buffer.alloc(1);
  countBuf.writeUInt8(collections.length, 0);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(DB_FILE, Buffer.concat([MAGIC, countBuf, ...collections]));
}

async function main() {
  const opts = parseArgs();
  
  if (opts.help || !opts.input) {
    console.log(`
Sodium Import from JSON

Usage:
  node scripts/import-json.js backup.json
  node scripts/import-json.js --input backup.json

Options:
  --input     Input JSON file
  --help      Show this help message
`);
    process.exit(opts.help ? 0 : 1);
  }
  
  if (!fs.existsSync(opts.input)) {
    log(`File not found: ${opts.input}`, colors.red);
    process.exit(1);
  }
  
  log(`${colors.cyan}Sodium Import from JSON${colors.reset}\n`);
  
  const confirm = await prompt('This will overwrite existing data. Continue? (y/N) ');
  if (confirm.toLowerCase() !== 'y') {
    log('Aborted.', colors.yellow);
    process.exit(0);
  }
  
  try {
    log('\nReading JSON file...', colors.dim);
    const content = fs.readFileSync(opts.input, 'utf8');
    const importData = JSON.parse(content);
    
    const data = {};
    let total = 0;
    
    for (const collection of COLLECTIONS) {
      if (importData[collection] && Array.isArray(importData[collection])) {
        // Skip users with redacted passwords
        if (collection === 'users') {
          data[collection] = importData[collection].filter(u => 
            u.password && u.password !== '[REDACTED]'
          );
          if (data[collection].length < importData[collection].length) {
            log(`  Warning: Skipped ${importData[collection].length - data[collection].length} users with redacted passwords`, colors.yellow);
          }
        } else {
          data[collection] = importData[collection];
        }
        
        if (data[collection].length > 0) {
          log(`  ${collection}: ${data[collection].length}`, colors.dim);
          total += data[collection].length;
        }
      } else {
        data[collection] = [];
      }
    }
    
    log('\nSaving to database...', colors.dim);
    saveSodiumDb(data);
    
    log(`\n${colors.green}✓ Import complete!${colors.reset}`);
    log(`  Total: ${total} records`, colors.cyan);
    
  } catch (err) {
    log(`\n${colors.red}✗ Import failed: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
