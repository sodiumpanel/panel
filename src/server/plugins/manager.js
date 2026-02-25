import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { DATA_DIR } from '../config.js';
import { loadConfig, saveConfig } from '../db.js';
import { createPluginApi } from './api.js';
import { removeAllHooks } from './hooks.js';
import logger from '../utils/logger.js';

const PLUGINS_DIR = path.join(DATA_DIR, 'plugins');
const plugins = new Map();
let cronRunner = null;

export function getPluginsDir() {
  return PLUGINS_DIR;
}

export async function loadPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    return;
  }

  const config = loadConfig();
  if (!config.plugins?.enabled) return;

  const active = config.plugins?.active || [];
  const dirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of dirs) {
    const pluginPath = path.join(PLUGINS_DIR, dir);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const plugin = {
        id: manifest.id || dir,
        path: pluginPath,
        manifest,
        active: active.includes(manifest.id || dir),
        _router: null,
        _pages: null,
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: [],
        _serverModule: null,
        _clientModule: null,
        _api: null,
        _methods: {}
      };

      plugins.set(plugin.id, plugin);

      if (plugin.active) {
        await activatePlugin(plugin.id);
      }
    } catch (err) {
      logger.warn(`[Plugins] Failed to load manifest for "${dir}": ${err.message}`);
    }
  }

  startCronRunner();
  logger.info(`[Plugins] Loaded ${plugins.size} plugins (${[...plugins.values()].filter(p => p.active).length} active)`);
}

export async function activatePlugin(pluginId) {
  const plugin = plugins.get(pluginId);
  if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

  const api = createPluginApi(plugin, { callPluginMethod });
  plugin._api = api;

  // Load server module
  const serverFile = path.join(plugin.path, 'server.js');
  if (fs.existsSync(serverFile)) {
    try {
      const mod = await import(pathToFileURL(serverFile).href);
      if (typeof mod.default === 'function') {
        const result = mod.default(api);
        if (result && typeof result === 'object') {
          plugin._methods = result;
        }
      }
      plugin._serverModule = mod;
    } catch (err) {
      logger.warn(`[Plugins] Failed to load server.js for "${pluginId}": ${err.message}`);
    }
  }

  // Load client module metadata (frontend loads it separately)
  const clientFile = path.join(plugin.path, 'client.js');
  if (fs.existsSync(clientFile)) {
    plugin._clientModule = clientFile;
  }

  plugin.active = true;
  updateActiveList(pluginId, true);
  logger.info(`[Plugins] Activated "${pluginId}"`);
}

export async function deactivatePlugin(pluginId) {
  const plugin = plugins.get(pluginId);
  if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

  if (plugin._api) {
    plugin._api._cleanup();
  }
  removeAllHooks(pluginId);

  plugin.active = false;
  plugin._router = null;
  plugin._pages = null;
  plugin._sidebarItems = [];
  plugin._serverTabs = [];
  plugin._dashboardWidgets = [];
  plugin._adminTabs = [];
  plugin._serverModule = null;
  plugin._api = null;
  plugin._methods = {};

  updateActiveList(pluginId, false);
  logger.info(`[Plugins] Deactivated "${pluginId}"`);
}

function updateActiveList(pluginId, add) {
  const config = loadConfig();
  if (!config.plugins) config.plugins = { enabled: true, active: [] };
  if (!config.plugins.active) config.plugins.active = [];

  if (add && !config.plugins.active.includes(pluginId)) {
    config.plugins.active.push(pluginId);
  } else if (!add) {
    config.plugins.active = config.plugins.active.filter(id => id !== pluginId);
  }
  saveConfig(config);
}

export function callPluginMethod(pluginId, method, ...args) {
  const plugin = plugins.get(pluginId);
  if (!plugin?.active) throw new Error(`Plugin "${pluginId}" is not active`);
  if (typeof plugin._methods[method] !== 'function') {
    throw new Error(`Plugin "${pluginId}" has no method "${method}"`);
  }
  return plugin._methods[method](...args);
}

export function getPlugin(pluginId) {
  return plugins.get(pluginId);
}

export function getAllPlugins() {
  return [...plugins.values()].map(p => ({
    id: p.id,
    name: p.manifest.name,
    version: p.manifest.version,
    type: p.manifest.type,
    author: p.manifest.author,
    description: p.manifest.description,
    active: p.active,
    hooks: p.manifest.hooks || [],
    permissions: p.manifest.permissions || [],
    settings: p.manifest.settings || {}
  }));
}

export function getPluginRouters() {
  const routers = [];
  for (const plugin of plugins.values()) {
    if (plugin.active && plugin._router) {
      routers.push({ id: plugin.id, router: plugin._router });
    }
  }
  return routers;
}

export function getPluginClientData() {
  const data = [];
  for (const plugin of plugins.values()) {
    if (!plugin.active) continue;
    data.push({
      id: plugin.id,
      name: plugin.manifest.name,
      type: plugin.manifest.type,
      pages: plugin._pages || null,
      sidebarItems: plugin._sidebarItems || [],
      serverTabs: plugin._serverTabs || [],
      dashboardWidgets: plugin._dashboardWidgets || [],
      adminTabs: plugin._adminTabs || [],
      hasClient: !!plugin._clientModule
    });
  }
  return data;
}

export function getPluginSettings(pluginId) {
  const plugin = plugins.get(pluginId);
  if (!plugin) return null;
  const config = loadConfig();
  return {
    schema: plugin.manifest.settings || {},
    values: config.plugins?.settings?.[pluginId] || {}
  };
}

export function savePluginSettings(pluginId, values) {
  const config = loadConfig();
  if (!config.plugins) config.plugins = {};
  if (!config.plugins.settings) config.plugins.settings = {};
  config.plugins.settings[pluginId] = values;
  saveConfig(config);
}

// Cron runner
function startCronRunner() {
  if (cronRunner) clearInterval(cronRunner);

  cronRunner = setInterval(() => {
    const now = new Date();
    for (const plugin of plugins.values()) {
      if (!plugin.active || !plugin._api) continue;
      const crons = plugin._api._getCrons();
      for (const cron of crons) {
        if (matchesCron(cron.schedule, now)) {
          cron.handler().catch(err =>
            logger.warn(`[Plugins] Cron "${cron.id}" error: ${err.message}`)
          );
        }
      }
    }
  }, 60000);
}

function matchesCron(schedule, date) {
  const parts = schedule.split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, day, month, dow] = parts;
  return matchPart(min, date.getMinutes())
    && matchPart(hour, date.getHours())
    && matchPart(day, date.getDate())
    && matchPart(month, date.getMonth() + 1)
    && matchPart(dow, date.getDay());
}

function matchPart(part, value) {
  if (part === '*') return true;
  if (part.includes('/')) {
    const [, step] = part.split('/');
    return value % parseInt(step, 10) === 0;
  }
  if (part.includes(',')) {
    return part.split(',').map(Number).includes(value);
  }
  return parseInt(part, 10) === value;
}
