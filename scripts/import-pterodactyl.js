#!/usr/bin/env node
/**
 * Pterodactyl to Sodium Migration Tool
 * 
 * Import data from a Pterodactyl Panel MySQL database to Sodium.
 * 
 * Usage:
 *   node scripts/import-pterodactyl.js
 * 
 * Environment variables:
 *   PTERO_DB_HOST   Pterodactyl MySQL host (default: localhost)
 *   PTERO_DB_PORT   Pterodactyl MySQL port (default: 3306)
 *   PTERO_DB_NAME   Pterodactyl database name (default: panel)
 *   PTERO_DB_USER   Pterodactyl database user
 *   PTERO_DB_PASS   Pterodactyl database password
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

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

async function connectPtero() {
  const mysql = await import('mysql2/promise');
  return mysql.default.createConnection({
    host: process.env.PTERO_DB_HOST || 'localhost',
    port: parseInt(process.env.PTERO_DB_PORT || '3306'),
    database: process.env.PTERO_DB_NAME || 'panel',
    user: process.env.PTERO_DB_USER || 'pterodactyl',
    password: process.env.PTERO_DB_PASS || ''
  });
}

async function importUsers(conn) {
  log('  Importing users...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, uuid, username, email, password, root_admin, created_at
    FROM users
  `);
  
  return rows.map(u => ({
    id: u.uuid || crypto.randomUUID(),
    username: u.username,
    email: u.email,
    password: u.password, // Already hashed with bcrypt
    role: u.root_admin ? 'admin' : 'user',
    isAdmin: !!u.root_admin,
    limits: { servers: 2, memory: 2048, disk: 10240, cpu: 200, allocations: 5 },
    createdAt: u.created_at?.toISOString() || new Date().toISOString(),
    _pteroId: u.id
  }));
}

async function importLocations(conn) {
  log('  Importing locations...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, short, long, created_at
    FROM locations
  `);
  
  return rows.map(l => ({
    id: crypto.randomUUID(),
    short: l.short,
    long: l.long,
    createdAt: l.created_at?.toISOString() || new Date().toISOString(),
    _pteroId: l.id
  }));
}

async function importNodes(conn, locations) {
  log('  Importing nodes...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, uuid, name, description, location_id, fqdn, scheme, 
           memory, disk, daemon_listen, daemon_sftp, daemon_token_id, daemon_token,
           maintenance_mode, created_at
    FROM nodes
  `);
  
  const locationMap = {};
  locations.forEach(l => { locationMap[l._pteroId] = l.id; });
  
  return rows.map(n => ({
    id: n.uuid || crypto.randomUUID(),
    name: n.name,
    description: n.description || '',
    location_id: locationMap[n.location_id] || null,
    fqdn: n.fqdn,
    scheme: n.scheme || 'https',
    memory: n.memory,
    disk: n.disk,
    daemon_port: n.daemon_listen || 8080,
    daemon_sftp_port: n.daemon_sftp || 2022,
    daemon_token_id: n.daemon_token_id,
    daemon_token: n.daemon_token,
    maintenance_mode: !!n.maintenance_mode,
    createdAt: n.created_at?.toISOString() || new Date().toISOString(),
    _pteroId: n.id
  }));
}

async function importNests(conn) {
  log('  Importing nests...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, uuid, name, description, created_at
    FROM nests
  `);
  
  return rows.map(n => ({
    id: n.uuid || crypto.randomUUID(),
    name: n.name,
    description: n.description || '',
    createdAt: n.created_at?.toISOString() || new Date().toISOString(),
    _pteroId: n.id
  }));
}

async function importEggs(conn, nests) {
  log('  Importing eggs...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, uuid, nest_id, name, description, docker_images, startup,
           config_from, config_stop, config_startup, config_files, config_logs,
           script_container, script_entry, script_install, created_at
    FROM eggs
  `);
  
  const nestMap = {};
  nests.forEach(n => { nestMap[n._pteroId] = n.id; });
  
  return rows.map(e => {
    let dockerImages = {};
    try {
      dockerImages = JSON.parse(e.docker_images || '{}');
    } catch {}
    
    let configStartup = {};
    try {
      configStartup = JSON.parse(e.config_startup || '{}');
    } catch {}
    
    let configFiles = {};
    try {
      configFiles = JSON.parse(e.config_files || '{}');
    } catch {}
    
    return {
      id: e.uuid || crypto.randomUUID(),
      nest_id: nestMap[e.nest_id] || null,
      name: e.name,
      description: e.description || '',
      docker_images: dockerImages,
      docker_image: Object.values(dockerImages)[0] || '',
      startup: e.startup || '',
      config: {
        stop: e.config_stop || 'stop',
        startup: configStartup,
        files: configFiles
      },
      install_script: e.script_install || '',
      install_container: e.script_container || 'alpine:3.4',
      install_entrypoint: e.script_entry || 'ash',
      variables: [],
      createdAt: e.created_at?.toISOString() || new Date().toISOString(),
      _pteroId: e.id
    };
  });
}

async function importEggVariables(conn, eggs) {
  log('  Importing egg variables...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT egg_id, name, description, env_variable, default_value, 
           user_viewable, user_editable, rules
    FROM egg_variables
  `);
  
  const eggMap = {};
  eggs.forEach(e => { eggMap[e._pteroId] = e; });
  
  for (const v of rows) {
    const egg = eggMap[v.egg_id];
    if (egg) {
      egg.variables.push({
        name: v.name,
        description: v.description || '',
        env_variable: v.env_variable,
        default_value: v.default_value || '',
        user_viewable: !!v.user_viewable,
        user_editable: !!v.user_editable,
        rules: v.rules || ''
      });
    }
  }
}

async function importServers(conn, users, nodes, eggs) {
  log('  Importing servers...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, uuid, name, description, owner_id, node_id, egg_id,
           startup, image, memory, disk, cpu, io, allocation_id,
           status, created_at
    FROM servers
  `);
  
  const userMap = {};
  users.forEach(u => { userMap[u._pteroId] = u.id; });
  
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n._pteroId] = n.id; });
  
  const eggMap = {};
  eggs.forEach(e => { eggMap[e._pteroId] = e.id; });
  
  return rows.map(s => ({
    id: s.uuid || crypto.randomUUID(),
    name: s.name,
    description: s.description || '',
    user_id: userMap[s.owner_id] || null,
    node_id: nodeMap[s.node_id] || null,
    egg_id: eggMap[s.egg_id] || null,
    startup: s.startup || '',
    docker_image: s.image || '',
    limits: {
      memory: s.memory || 1024,
      disk: s.disk || 5120,
      cpu: s.cpu || 100,
      io: s.io || 500
    },
    allocation: s.allocation_id,
    status: s.status || 'offline',
    suspended: false,
    environment: {},
    createdAt: s.created_at?.toISOString() || new Date().toISOString(),
    _pteroId: s.id
  }));
}

async function importAllocations(conn, servers) {
  log('  Importing allocations...', colors.dim);
  const [rows] = await conn.execute(`
    SELECT id, node_id, ip, port, server_id
    FROM allocations
    WHERE server_id IS NOT NULL
  `);
  
  const serverMap = {};
  servers.forEach(s => { serverMap[s._pteroId] = s; });
  
  for (const a of rows) {
    const server = serverMap[a.server_id];
    if (server && server.allocation === a.id) {
      server.allocation = { ip: a.ip, port: a.port };
    }
  }
}

function cleanPteroIds(data) {
  for (const item of data) {
    delete item._pteroId;
  }
}

async function saveSodiumDb(data) {
  const DB_FILE = path.join(DATA_DIR, 'sodium.db');
  const MAGIC = Buffer.from('SODIUM01');
  
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
  
  const collections = Object.entries(collectionIds).map(([name, id]) => 
    encodeCollection(id, data[name] || [])
  );
  
  const countBuf = Buffer.alloc(1);
  countBuf.writeUInt8(collections.length, 0);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(DB_FILE, Buffer.concat([MAGIC, countBuf, ...collections]));
}

async function main() {
  log(`\n${colors.cyan}Pterodactyl to Sodium Migration${colors.reset}\n`);
  
  if (!process.env.PTERO_DB_USER || !process.env.PTERO_DB_PASS) {
    log('Required environment variables:', colors.yellow);
    log('  PTERO_DB_USER - Pterodactyl database user', colors.dim);
    log('  PTERO_DB_PASS - Pterodactyl database password', colors.dim);
    log('  PTERO_DB_HOST - Database host (default: localhost)', colors.dim);
    log('  PTERO_DB_NAME - Database name (default: panel)', colors.dim);
    process.exit(1);
  }
  
  const confirm = await prompt('This will import Pterodactyl data to Sodium. Continue? (y/N) ');
  if (confirm.toLowerCase() !== 'y') {
    log('Aborted.', colors.yellow);
    process.exit(0);
  }
  
  let conn;
  try {
    log('\nConnecting to Pterodactyl database...', colors.dim);
    conn = await connectPtero();
    
    log('Importing data...', colors.cyan);
    
    const users = await importUsers(conn);
    const locations = await importLocations(conn);
    const nodes = await importNodes(conn, locations);
    const nests = await importNests(conn);
    const eggs = await importEggs(conn, nests);
    await importEggVariables(conn, eggs);
    const servers = await importServers(conn, users, nodes, eggs);
    await importAllocations(conn, servers);
    
    // Clean internal IDs
    cleanPteroIds(users);
    cleanPteroIds(locations);
    cleanPteroIds(nodes);
    cleanPteroIds(nests);
    cleanPteroIds(eggs);
    cleanPteroIds(servers);
    
    const data = {
      users,
      nodes,
      servers,
      nests,
      eggs,
      locations,
      apiKeys: [],
      announcements: [],
      auditLogs: [],
      activityLogs: []
    };
    
    log('\nSaving to Sodium database...', colors.dim);
    await saveSodiumDb(data);
    
    log(`\n${colors.green}✓ Migration complete!${colors.reset}`);
    log(`  Users: ${users.length}`, colors.dim);
    log(`  Nodes: ${nodes.length}`, colors.dim);
    log(`  Servers: ${servers.length}`, colors.dim);
    log(`  Nests: ${nests.length}`, colors.dim);
    log(`  Eggs: ${eggs.length}`, colors.dim);
    log(`  Locations: ${locations.length}`, colors.dim);
    
    log(`\n${colors.yellow}Note: User passwords are preserved but users will need to use`, colors.reset);
    log(`      their Pterodactyl passwords to login.`, colors.yellow);
    
  } catch (err) {
    log(`\n${colors.red}✗ Migration failed: ${err.message}${colors.reset}`);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
