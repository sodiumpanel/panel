import express from 'express';
import { registerHook, removeAllHooks } from './hooks.js';
import logger from '../utils/logger.js';
import * as db from '../db.js';
import { authenticateUser, requireAdmin } from '../utils/auth.js';

export function createPluginApi(plugin, manager) {
  const pluginId = plugin.id;
  const collectionPrefix = `plugins_${pluginId}_`;
  const registeredCollections = [];
  const registeredCrons = [];

  plugin._middlewares = [];
  plugin._adminPages = [];
  plugin._eventHandlers = [];

  const pluginLogger = {
    info: (msg) => logger.info(`Plugin:${pluginId}: ${msg}`),
    warn: (msg) => logger.warn(`Plugin:${pluginId}: ${msg}`),
    error: (msg) => logger.error(`Plugin:${pluginId}: ${msg}`)
  };

  const sodium = {
    db: {
      registerCollections(names) {
        for (const name of names) {
          const fullName = `${collectionPrefix}${name}`;
          db.registerDynamicCollection(fullName);
          registeredCollections.push(fullName);
        }
      },
      find(collection, query = {}) {
        const fullName = `${collectionPrefix}${collection}`;
        const all = db.getAll(fullName);
        if (!Object.keys(query).length) return all;
        return all.filter(record =>
          Object.entries(query).every(([k, v]) => record[k] === v)
        );
      },
      findOne(collection, query = {}) {
        return sodium.db.find(collection, query)[0] || null;
      },
      insert(collection, record) {
        const fullName = `${collectionPrefix}${collection}`;
        if (!record.id) record.id = crypto.randomUUID();
        return db.insert(fullName, record);
      },
      update(collection, id, updates) {
        const fullName = `${collectionPrefix}${collection}`;
        return db.updateById(fullName, id, updates);
      },
      delete(collection, id) {
        const fullName = `${collectionPrefix}${collection}`;
        return db.deleteById(fullName, id);
      }
    },

    http: {
      registerRoutes(fn) {
        const router = express.Router();
        fn(router);
        plugin._router = router;
      },
      addMiddleware(fn) {
        plugin._middlewares.push(fn);
      }
    },

    hooks: {
      on(event, handler, priority = 10) {
        if (plugin.manifest.hooks && !plugin.manifest.hooks.includes(event)) {
          pluginLogger.warn(`Hook "${event}" not declared in manifest, skipping`);
          return;
        }
        handler._pluginId = pluginId;
        registerHook(event, handler, priority);
      }
    },

    cron: {
      register(id, schedule, handler) {
        registeredCrons.push({ id: `${pluginId}:${id}`, schedule, handler });
      }
    },

    config: {
      get(key) {
        const config = db.loadConfig();
        return config.plugins?.settings?.[pluginId]?.[key];
      },
      set(key, value) {
        const config = db.loadConfig();
        if (!config.plugins) config.plugins = {};
        if (!config.plugins.settings) config.plugins.settings = {};
        if (!config.plugins.settings[pluginId]) config.plugins.settings[pluginId] = {};
        config.plugins.settings[pluginId][key] = value;
        db.saveConfig(config);
      },
      getAll() {
        const config = db.loadConfig();
        return config.plugins?.settings?.[pluginId] || {};
      }
    },

    plugins: {
      call(targetPluginId, method, ...args) {
        return manager.callPluginMethod(targetPluginId, method, ...args);
      }
    },

    logger: pluginLogger,

    data: {
      getUsers() { return db.getAll('users'); },
      getServers() { return db.getAll('servers'); },
      getNodes() { return db.getAll('nodes'); },
      findUser(id) { return db.findById('users', id); },
      findServer(id) { return db.findById('servers', id); },
      findNode(id) { return db.findById('nodes', id); }
    },

    auth: {
      requireUser: authenticateUser,
      requireAdmin: requireAdmin
    },

    events: {
      on(event, handler) {
        plugin._eventHandlers.push({ event, handler });
      },
      emit(event, data) {
        manager.emitEvent(event, data);
      }
    },

    meta: {
      id: pluginId,
      name: plugin.manifest.name,
      version: plugin.manifest.version
    },

    ui: {
      registerPages(pages) {
        if (Array.isArray(pages)) {
          plugin._pages = pages;
        } else {
          plugin._pages = Object.entries(pages).map(([id, page]) => ({ id, ...page }));
        }
      },
      addPage(page) {
        if (!plugin._pages) plugin._pages = [];
        plugin._pages.push(page);
      },
      addAdminPage(page) {
        plugin._adminPages.push(page);
      },
      addSidebarItem(item) {
        if (!plugin._sidebarItems) plugin._sidebarItems = [];
        plugin._sidebarItems.push(item);
      },
      addServerTab(tab) {
        if (!plugin._serverTabs) plugin._serverTabs = [];
        plugin._serverTabs.push(tab);
      },
      addDashboardWidget(widget) {
        if (!plugin._dashboardWidgets) plugin._dashboardWidgets = [];
        plugin._dashboardWidgets.push(widget);
      },
      addAdminTab(tab) {
        if (!plugin._adminTabs) plugin._adminTabs = [];
        plugin._adminTabs.push(tab);
      }
    }
  };

  sodium._cleanup = () => {
    removeAllHooks(pluginId);
    registeredCrons.length = 0;
    plugin._eventHandlers.length = 0;
  };

  sodium._getCrons = () => registeredCrons;
  sodium._getCollections = () => registeredCollections;

  return sodium;
}
