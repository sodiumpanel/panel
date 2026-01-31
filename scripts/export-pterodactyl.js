#!/usr/bin/env node
/**
 * Sodium to Pterodactyl Export Tool
 * 
 * Export Sodium data to SQL statements compatible with Pterodactyl.
 * Generates a .sql file that can be imported into a Pterodactyl database.
 * 
 * Usage:
 *   node scripts/export-pterodactyl.js > pterodactyl-import.sql
 *   node scripts/export-pterodactyl.js --output pterodactyl-import.sql
 * 
 * Note: This generates INSERT statements. You need an existing Pterodactyl
 *       installation with the correct schema.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'sodium.db');
const MAGIC = Buffer.from('SODIUM01');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(msg, color = '') {
  console.error(`${color}${msg}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) opts.output = args[++i];
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
    log('No Sodium database found', colors.red);
    process.exit(1);
  }
  
  const buf = fs.readFileSync(DB_FILE);
  if (buf.length < 9 || !buf.subarray(0, 8).equals(MAGIC)) {
    log('Invalid Sodium database format', colors.red);
    process.exit(1);
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

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number') return str.toString();
  if (typeof str === 'boolean') return str ? '1' : '0';
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

function generateLocationSQL(locations) {
  const sql = [];
  sql.push('-- Locations');
  
  for (let i = 0; i < locations.length; i++) {
    const l = locations[i];
    l._pteroId = i + 1;
    sql.push(`INSERT INTO locations (id, short, long, created_at, updated_at) VALUES (${l._pteroId}, ${escapeSQL(l.short)}, ${escapeSQL(l.long || l.short)}, NOW(), NOW());`);
  }
  
  return sql.join('\n');
}

function generateNodeSQL(nodes, locations) {
  const sql = [];
  sql.push('\n-- Nodes');
  
  const locationMap = {};
  locations.forEach(l => { locationMap[l.id] = l._pteroId; });
  
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    n._pteroId = i + 1;
    const locationId = locationMap[n.location_id] || 1;
    
    sql.push(`INSERT INTO nodes (id, uuid, public, name, description, location_id, fqdn, scheme, behind_proxy, maintenance_mode, memory, memory_overallocate, disk, disk_overallocate, daemon_token_id, daemon_token, daemon_listen, daemon_sftp, daemon_base, created_at, updated_at) VALUES (${n._pteroId}, ${escapeSQL(n.id)}, 1, ${escapeSQL(n.name)}, ${escapeSQL(n.description || '')}, ${locationId}, ${escapeSQL(n.fqdn)}, ${escapeSQL(n.scheme || 'https')}, 0, ${n.maintenance_mode ? 1 : 0}, ${n.memory || 1024}, 0, ${n.disk || 10240}, 0, ${escapeSQL(n.daemon_token_id || crypto.randomBytes(8).toString('hex'))}, ${escapeSQL(n.daemon_token || crypto.randomBytes(32).toString('hex'))}, ${n.daemon_port || 8080}, ${n.daemon_sftp_port || 2022}, '/var/lib/pterodactyl/volumes', NOW(), NOW());`);
  }
  
  return sql.join('\n');
}

function generateNestSQL(nests) {
  const sql = [];
  sql.push('\n-- Nests');
  
  for (let i = 0; i < nests.length; i++) {
    const n = nests[i];
    n._pteroId = i + 1;
    sql.push(`INSERT INTO nests (id, uuid, author, name, description, created_at, updated_at) VALUES (${n._pteroId}, ${escapeSQL(n.id)}, 'support@pterodactyl.io', ${escapeSQL(n.name)}, ${escapeSQL(n.description || '')}, NOW(), NOW());`);
  }
  
  return sql.join('\n');
}

function generateEggSQL(eggs, nests) {
  const sql = [];
  sql.push('\n-- Eggs');
  
  const nestMap = {};
  nests.forEach(n => { nestMap[n.id] = n._pteroId; });
  
  for (let i = 0; i < eggs.length; i++) {
    const e = eggs[i];
    e._pteroId = i + 1;
    const nestId = nestMap[e.nest_id] || 1;
    
    const dockerImages = JSON.stringify(e.docker_images || {});
    const configStartup = JSON.stringify(e.config?.startup || {});
    const configFiles = JSON.stringify(e.config?.files || {});
    
    sql.push(`INSERT INTO eggs (id, uuid, nest_id, author, name, description, docker_images, startup, config_from, config_stop, config_startup, config_files, config_logs, script_container, script_entry, script_install, created_at, updated_at) VALUES (${e._pteroId}, ${escapeSQL(e.id)}, ${nestId}, 'support@pterodactyl.io', ${escapeSQL(e.name)}, ${escapeSQL(e.description || '')}, ${escapeSQL(dockerImages)}, ${escapeSQL(e.startup || '')}, NULL, ${escapeSQL(e.config?.stop || 'stop')}, ${escapeSQL(configStartup)}, ${escapeSQL(configFiles)}, '{}', ${escapeSQL(e.install_container || 'alpine:3.4')}, ${escapeSQL(e.install_entrypoint || 'ash')}, ${escapeSQL(e.install_script || '')}, NOW(), NOW());`);
    
    // Egg variables
    if (e.variables && e.variables.length > 0) {
      for (const v of e.variables) {
        sql.push(`INSERT INTO egg_variables (egg_id, name, description, env_variable, default_value, user_viewable, user_editable, rules, created_at, updated_at) VALUES (${e._pteroId}, ${escapeSQL(v.name)}, ${escapeSQL(v.description || '')}, ${escapeSQL(v.env_variable)}, ${escapeSQL(v.default_value || '')}, ${v.user_viewable ? 1 : 0}, ${v.user_editable ? 1 : 0}, ${escapeSQL(v.rules || 'nullable|string')}, NOW(), NOW());`);
      }
    }
  }
  
  return sql.join('\n');
}

function generateUserSQL(users) {
  const sql = [];
  sql.push('\n-- Users');
  
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    u._pteroId = i + 1;
    
    sql.push(`INSERT INTO users (id, uuid, username, email, password, root_admin, use_totp, created_at, updated_at) VALUES (${u._pteroId}, ${escapeSQL(u.id)}, ${escapeSQL(u.username)}, ${escapeSQL(u.email)}, ${escapeSQL(u.password)}, ${u.isAdmin ? 1 : 0}, 0, NOW(), NOW());`);
  }
  
  return sql.join('\n');
}

function generateServerSQL(servers, users, nodes, eggs) {
  const sql = [];
  sql.push('\n-- Servers');
  
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u._pteroId; });
  
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n._pteroId; });
  
  const eggMap = {};
  eggs.forEach(e => { eggMap[e.id] = e._pteroId; });
  
  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    const userId = userMap[s.user_id] || 1;
    const nodeId = nodeMap[s.node_id] || 1;
    const eggId = eggMap[s.egg_id] || 1;
    
    sql.push(`INSERT INTO servers (id, uuid, uuidShort, node_id, name, description, status, owner_id, memory, swap, disk, io, cpu, oom_disabled, allocation_id, nest_id, egg_id, startup, image, created_at, updated_at) VALUES (${i + 1}, ${escapeSQL(s.id)}, ${escapeSQL(s.id.substring(0, 8))}, ${nodeId}, ${escapeSQL(s.name)}, ${escapeSQL(s.description || '')}, ${escapeSQL(s.status || 'offline')}, ${userId}, ${s.limits?.memory || 1024}, 0, ${s.limits?.disk || 5120}, ${s.limits?.io || 500}, ${s.limits?.cpu || 100}, 0, NULL, 1, ${eggId}, ${escapeSQL(s.startup || '')}, ${escapeSQL(s.docker_image || '')}, NOW(), NOW());`);
  }
  
  return sql.join('\n');
}

function main() {
  const opts = parseArgs();
  
  if (opts.help) {
    console.log(`
Sodium to Pterodactyl Export Tool

Usage:
  node scripts/export-pterodactyl.js > pterodactyl-import.sql
  node scripts/export-pterodactyl.js --output pterodactyl-import.sql

Options:
  --output    Output file (default: stdout)
  --help      Show this help message

Note: This generates SQL INSERT statements for Pterodactyl.
      You need an existing Pterodactyl database with the schema already created.
`);
    process.exit(0);
  }
  
  log(`\n${colors.cyan}Sodium to Pterodactyl Export${colors.reset}\n`);
  
  log('Loading Sodium database...', colors.dim);
  const data = loadSodiumDb();
  
  log('Generating SQL...', colors.dim);
  
  const sql = [
    '-- Sodium to Pterodactyl Export',
    '-- Generated: ' + new Date().toISOString(),
    '-- WARNING: Run this on an empty Pterodactyl database',
    '',
    'SET FOREIGN_KEY_CHECKS=0;',
    '',
    generateLocationSQL(data.locations || []),
    generateNodeSQL(data.nodes || [], data.locations || []),
    generateNestSQL(data.nests || []),
    generateEggSQL(data.eggs || [], data.nests || []),
    generateUserSQL(data.users || []),
    generateServerSQL(data.servers || [], data.users || [], data.nodes || [], data.eggs || []),
    '',
    'SET FOREIGN_KEY_CHECKS=1;',
    ''
  ].join('\n');
  
  if (opts.output) {
    fs.writeFileSync(opts.output, sql);
    log(`\n${colors.green}✓ Exported to ${opts.output}${colors.reset}`);
  } else {
    console.log(sql);
    log(`\n${colors.green}✓ SQL generated (stdout)${colors.reset}`);
  }
  
  log(`  Users: ${(data.users || []).length}`, colors.dim);
  log(`  Nodes: ${(data.nodes || []).length}`, colors.dim);
  log(`  Servers: ${(data.servers || []).length}`, colors.dim);
  log(`  Nests: ${(data.nests || []).length}`, colors.dim);
  log(`  Eggs: ${(data.eggs || []).length}`, colors.dim);
}

main();
