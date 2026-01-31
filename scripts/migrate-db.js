#!/usr/bin/env node
/**
 * Sodium Database Migration Tool
 * 
 * Migrate data between database backends:
 * - file -> mysql, postgresql, sqlite
 * - mysql, postgresql, sqlite -> file
 * - Between any external databases
 * 
 * Usage:
 *   node scripts/migrate-db.js --from file --to mysql
 *   node scripts/migrate-db.js --from mysql --to postgresql
 *   node scripts/migrate-db.js --from postgresql --to file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) opts.from = args[++i];
    else if (args[i] === '--to' && args[i + 1]) opts.to = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') opts.help = true;
  }
  
  return opts;
}

function showHelp() {
  console.log(`
${colors.cyan}Sodium Database Migration Tool${colors.reset}

Usage:
  node scripts/migrate-db.js --from <source> --to <target>

Options:
  --from    Source database type (file, mysql, postgresql, sqlite)
  --to      Target database type (file, mysql, postgresql, sqlite)
  --help    Show this help message

Examples:
  node scripts/migrate-db.js --from file --to mysql
  node scripts/migrate-db.js --from mysql --to postgresql
  node scripts/migrate-db.js --from postgresql --to file

Environment variables for external databases:
  DB_HOST      Database host (default: localhost)
  DB_PORT      Database port (default: 3306/5432)
  DB_NAME      Database name (default: sodium)
  DB_USER      Database user (default: sodium)
  DB_PASS      Database password

For target database (when different from source):
  TARGET_DB_HOST, TARGET_DB_PORT, TARGET_DB_NAME, TARGET_DB_USER, TARGET_DB_PASS
`);
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

// File database functions
function loadFileDb() {
  const data = {};
  COLLECTIONS.forEach(c => data[c] = []);
  
  if (!fs.existsSync(DB_FILE)) {
    log('No file database found', colors.yellow);
    return data;
  }
  
  const buf = fs.readFileSync(DB_FILE);
  if (buf.length < 9 || !buf.subarray(0, 8).equals(MAGIC)) {
    log('Invalid file database format', colors.red);
    return data;
  }
  
  const collectionIds = {
    1: 'users', 2: 'nodes', 3: 'servers', 4: 'nests', 5: 'eggs',
    6: 'locations', 7: 'apiKeys', 8: 'announcements', 9: 'auditLogs', 10: 'activityLogs'
  };
  
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

function saveFileDb(data) {
  const collectionIds = {
    'users': 1, 'nodes': 2, 'servers': 3, 'nests': 4, 'eggs': 5,
    'locations': 6, 'apiKeys': 7, 'announcements': 8, 'auditLogs': 9, 'activityLogs': 10
  };
  
  const encodeRecord = (record) => {
    const json = JSON.stringify(record);
    const data = Buffer.from(json, 'utf8');
    const buf = Buffer.alloc(4 + data.length);
    buf.writeUInt32LE(data.length, 0);
    data.copy(buf, 4);
    return buf;
  };
  
  const encodeCollection = (id, records) => {
    const encoded = records.map(encodeRecord);
    const totalSize = encoded.reduce((sum, b) => sum + b.length, 0);
    const header = Buffer.alloc(5);
    header.writeUInt8(id, 0);
    header.writeUInt32LE(records.length, 1);
    return Buffer.concat([header, ...encoded], 5 + totalSize);
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

// External database functions
async function connectDb(type, isTarget = false) {
  const prefix = isTarget ? 'TARGET_' : '';
  const config = {
    host: process.env[`${prefix}DB_HOST`] || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env[`${prefix}DB_PORT`] || process.env.DB_PORT || (type === 'postgresql' ? 5432 : 3306)),
    database: process.env[`${prefix}DB_NAME`] || process.env.DB_NAME || 'sodium',
    user: process.env[`${prefix}DB_USER`] || process.env.DB_USER || 'sodium',
    password: process.env[`${prefix}DB_PASS`] || process.env.DB_PASS || ''
  };
  
  if (type === 'mysql' || type === 'mariadb') {
    const mysql = await import('mysql2/promise');
    return { type: 'mysql', conn: await mysql.default.createConnection(config) };
  }
  
  if (type === 'postgresql' || type === 'postgres') {
    const pg = await import('pg');
    const client = new pg.default.Client(config);
    await client.connect();
    return { type: 'postgres', conn: client };
  }
  
  if (type === 'sqlite') {
    const sqlite = await import('better-sqlite3');
    const file = process.env[`${prefix}DB_FILE`] || path.join(DATA_DIR, 'sodium.sqlite');
    return { type: 'sqlite', conn: new sqlite.default(file) };
  }
  
  throw new Error(`Unknown database type: ${type}`);
}

async function createTables(db) {
  for (const table of COLLECTIONS) {
    if (db.type === 'mysql') {
      await db.conn.execute(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id VARCHAR(255) PRIMARY KEY,
          data JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } else if (db.type === 'postgres') {
      await db.conn.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else if (db.type === 'sqlite') {
      db.conn.exec(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }
}

async function loadFromDb(db) {
  const data = {};
  
  for (const table of COLLECTIONS) {
    try {
      let rows;
      if (db.type === 'mysql') {
        [rows] = await db.conn.execute(`SELECT id, data FROM ${table}`);
      } else if (db.type === 'postgres') {
        const result = await db.conn.query(`SELECT id, data FROM ${table}`);
        rows = result.rows;
      } else if (db.type === 'sqlite') {
        rows = db.conn.prepare(`SELECT id, data FROM ${table}`).all();
      }
      
      data[table] = rows.map(r => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return { id: r.id, ...d };
      });
    } catch {
      data[table] = [];
    }
  }
  
  return data;
}

async function saveToDb(db, data) {
  await createTables(db);
  
  for (const table of COLLECTIONS) {
    const records = data[table] || [];
    
    // Clear existing data
    if (db.type === 'mysql') {
      await db.conn.execute(`DELETE FROM ${table}`);
    } else if (db.type === 'postgres') {
      await db.conn.query(`DELETE FROM ${table}`);
    } else if (db.type === 'sqlite') {
      db.conn.prepare(`DELETE FROM ${table}`).run();
    }
    
    // Insert new data
    for (const record of records) {
      const { id, ...rest } = record;
      const json = JSON.stringify(rest);
      
      if (db.type === 'mysql') {
        await db.conn.execute(`INSERT INTO ${table} (id, data) VALUES (?, ?)`, [id, json]);
      } else if (db.type === 'postgres') {
        await db.conn.query(`INSERT INTO ${table} (id, data) VALUES ($1, $2)`, [id, json]);
      } else if (db.type === 'sqlite') {
        db.conn.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`).run(id, json);
      }
    }
  }
}

async function closeDb(db) {
  if (db.type === 'mysql') {
    await db.conn.end();
  } else if (db.type === 'postgres') {
    await db.conn.end();
  } else if (db.type === 'sqlite') {
    db.conn.close();
  }
}

async function main() {
  const opts = parseArgs();
  
  if (opts.help || !opts.from || !opts.to) {
    showHelp();
    process.exit(opts.help ? 0 : 1);
  }
  
  if (opts.from === opts.to) {
    log('Source and target are the same. Nothing to do.', colors.yellow);
    process.exit(0);
  }
  
  log(`\n${colors.cyan}Sodium Database Migration${colors.reset}`);
  log(`${colors.dim}From: ${opts.from} -> To: ${opts.to}${colors.reset}\n`);
  
  const confirm = await prompt('This will overwrite data in the target. Continue? (y/N) ');
  if (confirm.toLowerCase() !== 'y') {
    log('Aborted.', colors.yellow);
    process.exit(0);
  }
  
  try {
    // Load source data
    log('\nLoading source data...', colors.dim);
    let data;
    
    if (opts.from === 'file') {
      data = loadFileDb();
    } else {
      const sourceDb = await connectDb(opts.from, false);
      data = await loadFromDb(sourceDb);
      await closeDb(sourceDb);
    }
    
    // Count records
    let total = 0;
    for (const table of COLLECTIONS) {
      const count = (data[table] || []).length;
      if (count > 0) {
        log(`  ${table}: ${count} records`, colors.dim);
        total += count;
      }
    }
    log(`  Total: ${total} records\n`, colors.cyan);
    
    // Save to target
    log('Saving to target...', colors.dim);
    
    if (opts.to === 'file') {
      saveFileDb(data);
    } else {
      const targetDb = await connectDb(opts.to, true);
      await saveToDb(targetDb, data);
      await closeDb(targetDb);
    }
    
    log(`\n✓ Migration complete!`, colors.green);
    
  } catch (err) {
    log(`\n✗ Migration failed: ${err.message}`, colors.red);
    process.exit(1);
  }
}

main();
