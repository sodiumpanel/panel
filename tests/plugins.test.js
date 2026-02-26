import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('Plugin System', () => {

  describe('Manager', () => {
    it('should export all required functions', async () => {
      const manager = await import('../src/server/plugins/manager.js');

      assert.ok(typeof manager.loadPlugins === 'function');
      assert.ok(typeof manager.activatePlugin === 'function');
      assert.ok(typeof manager.deactivatePlugin === 'function');
      assert.ok(typeof manager.getPlugin === 'function');
      assert.ok(typeof manager.getAllPlugins === 'function');
      assert.ok(typeof manager.getPluginRouters === 'function');
      assert.ok(typeof manager.getPluginClientData === 'function');
      assert.ok(typeof manager.getPluginSettings === 'function');
      assert.ok(typeof manager.savePluginSettings === 'function');
      assert.ok(typeof manager.callPluginMethod === 'function');
      assert.ok(typeof manager.getPluginsDir === 'function');
    });

    it('should return plugins dir inside data/', async () => {
      const { getPluginsDir } = await import('../src/server/plugins/manager.js');
      const dir = getPluginsDir();
      assert.ok(dir.includes('data'));
      assert.ok(dir.endsWith('plugins'));
    });

    it('getAllPlugins should return an array', async () => {
      const { getAllPlugins } = await import('../src/server/plugins/manager.js');
      const plugins = getAllPlugins();
      assert.ok(Array.isArray(plugins));
    });

    it('getPluginRouters should return an array', async () => {
      const { getPluginRouters } = await import('../src/server/plugins/manager.js');
      const routers = getPluginRouters();
      assert.ok(Array.isArray(routers));
    });

    it('getPluginClientData should return an array', async () => {
      const { getPluginClientData } = await import('../src/server/plugins/manager.js');
      const data = getPluginClientData();
      assert.ok(Array.isArray(data));
    });

    it('getPlugin should return undefined for non-existent plugin', async () => {
      const { getPlugin } = await import('../src/server/plugins/manager.js');
      const result = getPlugin('non-existent-plugin');
      assert.strictEqual(result, undefined);
    });

    it('getPluginSettings should return null for non-existent plugin', async () => {
      const { getPluginSettings } = await import('../src/server/plugins/manager.js');
      const result = getPluginSettings('non-existent-plugin');
      assert.strictEqual(result, null);
    });

    it('callPluginMethod should throw for inactive plugin', async () => {
      const { callPluginMethod } = await import('../src/server/plugins/manager.js');
      assert.throws(() => callPluginMethod('non-existent', 'someMethod'), {
        message: /not active/
      });
    });
  });

  describe('Hooks', () => {
    it('should export all required functions', async () => {
      const hooks = await import('../src/server/plugins/hooks.js');

      assert.ok(typeof hooks.registerHook === 'function');
      assert.ok(typeof hooks.removeHook === 'function');
      assert.ok(typeof hooks.removeAllHooks === 'function');
      assert.ok(typeof hooks.executeHook === 'function');
      assert.ok(typeof hooks.getRegisteredHooks === 'function');
    });

    it('should register and execute a hook', async () => {
      const { registerHook, executeHook, removeHook } = await import('../src/server/plugins/hooks.js');
      let called = false;
      const handler = async (ctx) => { called = true; };

      registerHook('test:event', handler);
      await executeHook('test:event');

      assert.strictEqual(called, true);
      removeHook('test:event', handler);
    });

    it('should execute hooks in priority order', async () => {
      const { registerHook, executeHook, removeHook } = await import('../src/server/plugins/hooks.js');
      const order = [];
      const h1 = async () => { order.push('low'); };
      const h2 = async () => { order.push('high'); };

      registerHook('test:priority', h1, 20);
      registerHook('test:priority', h2, 5);
      await executeHook('test:priority');

      assert.deepStrictEqual(order, ['high', 'low']);
      removeHook('test:priority', h1);
      removeHook('test:priority', h2);
    });

    it('should support deny in hook context', async () => {
      const { registerHook, executeHook, removeHook } = await import('../src/server/plugins/hooks.js');
      const handler = async (ctx) => { ctx.deny('blocked'); };
      const after = async () => { throw new Error('Should not be called'); };

      registerHook('test:deny', handler, 1);
      registerHook('test:deny', after, 10);
      const result = await executeHook('test:deny');

      assert.strictEqual(result._denied, true);
      assert.strictEqual(result._denyReason, 'blocked');
      removeHook('test:deny', handler);
      removeHook('test:deny', after);
    });

    it('should return context from executeHook for unused events', async () => {
      const { executeHook } = await import('../src/server/plugins/hooks.js');
      const ctx = await executeHook('nonexistent:event', { foo: 'bar' });
      assert.strictEqual(ctx.foo, 'bar');
    });

    it('getRegisteredHooks should return an object', async () => {
      const { getRegisteredHooks } = await import('../src/server/plugins/hooks.js');
      const result = getRegisteredHooks();
      assert.strictEqual(typeof result, 'object');
    });

    it('removeAllHooks should remove hooks by pluginId', async () => {
      const { registerHook, removeAllHooks, executeHook } = await import('../src/server/plugins/hooks.js');
      let called = false;
      const handler = async () => { called = true; };
      handler._pluginId = 'test-plugin';

      registerHook('test:remove', handler);
      removeAllHooks('test-plugin');
      await executeHook('test:remove');

      assert.strictEqual(called, false);
    });
  });

  describe('Plugin API factory', () => {
    it('should export createPluginApi', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      assert.ok(typeof createPluginApi === 'function');
    });

    it('should create api with all namespaces', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      const mockPlugin = {
        id: 'test-plugin',
        path: '/tmp/test-plugin',
        manifest: { hooks: [] },
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: []
      };
      const mockManager = { callPluginMethod: () => {} };

      const api = createPluginApi(mockPlugin, mockManager);

      assert.ok(api.db);
      assert.ok(api.http);
      assert.ok(api.hooks);
      assert.ok(api.cron);
      assert.ok(api.config);
      assert.ok(api.plugins);
      assert.ok(api.logger);
      assert.ok(api.ui);
      assert.ok(typeof api._cleanup === 'function');
      assert.ok(typeof api._getCrons === 'function');
      assert.ok(typeof api._getCollections === 'function');
    });

    it('should register UI elements via api', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      const mockPlugin = {
        id: 'ui-test',
        path: '/tmp/ui-test',
        manifest: { hooks: [] },
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: []
      };
      const api = createPluginApi(mockPlugin, { callPluginMethod: () => {} });

      api.ui.addSidebarItem({ id: 'test', label: 'Test' });
      api.ui.addDashboardWidget({ id: 'w1', title: 'Widget' });
      api.ui.addServerTab({ id: 't1', label: 'Tab' });
      api.ui.addAdminTab({ id: 'a1', label: 'Admin' });

      assert.strictEqual(mockPlugin._sidebarItems.length, 1);
      assert.strictEqual(mockPlugin._dashboardWidgets.length, 1);
      assert.strictEqual(mockPlugin._serverTabs.length, 1);
      assert.strictEqual(mockPlugin._adminTabs.length, 1);
    });

    it('should register crons and return them', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      const mockPlugin = {
        id: 'cron-test',
        path: '/tmp/cron-test',
        manifest: { hooks: [] },
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: []
      };
      const api = createPluginApi(mockPlugin, { callPluginMethod: () => {} });

      api.cron.register('daily', '0 0 * * *', async () => {});
      const crons = api._getCrons();

      assert.strictEqual(crons.length, 1);
      assert.strictEqual(crons[0].id, 'cron-test:daily');
      assert.strictEqual(crons[0].schedule, '0 0 * * *');
    });
  });

  describe('Hello World test plugin', () => {
    const pluginDir = path.join(ROOT, 'data', 'plugins', 'hello-world');

    it('should have a valid plugin.json manifest', () => {
      const manifestPath = path.join(pluginDir, 'plugin.json');
      assert.ok(fs.existsSync(manifestPath), 'plugin.json should exist');

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.strictEqual(manifest.id, 'hello-world');
      assert.ok(manifest.name);
      assert.ok(manifest.version);
      assert.ok(manifest.description);
      assert.ok(manifest.author);
    });

    it('should have a valid server.js module', async () => {
      const serverPath = path.join(pluginDir, 'server.js');
      assert.ok(fs.existsSync(serverPath), 'server.js should exist');

      const mod = await import(`file://${serverPath}`);
      assert.ok(typeof mod.default === 'function', 'server.js should export a default function');
    });

    it('server.js should return methods when called with api', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      const serverPath = path.join(pluginDir, 'server.js');
      const mod = await import(`file://${serverPath}`);

      const mockPlugin = {
        id: 'hello-world',
        path: pluginDir,
        manifest: { hooks: ['server:beforeCreate'] },
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: []
      };
      const api = createPluginApi(mockPlugin, { callPluginMethod: () => {} });
      const methods = mod.default(api);

      assert.ok(methods);
      assert.ok(typeof methods.getGreeting === 'function');
      assert.ok(typeof methods.addGreeting === 'function');
    });

    it('should register a dashboard widget', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      const serverPath = path.join(pluginDir, 'server.js');
      const mod = await import(`file://${serverPath}?widget`);

      const mockPlugin = {
        id: 'hello-world-widget',
        path: pluginDir,
        manifest: { hooks: ['server:beforeCreate'] },
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: []
      };
      const api = createPluginApi(mockPlugin, { callPluginMethod: () => {} });
      mod.default(api);

      assert.ok(mockPlugin._dashboardWidgets.length > 0);
      assert.strictEqual(mockPlugin._dashboardWidgets[0].id, 'hello-widget');
    });

    it('should register an HTTP router', async () => {
      const { createPluginApi } = await import('../src/server/plugins/api.js');
      const serverPath = path.join(pluginDir, 'server.js');
      const mod = await import(`file://${serverPath}?router`);

      const mockPlugin = {
        id: 'hello-world-router',
        path: pluginDir,
        manifest: { hooks: ['server:beforeCreate'] },
        _sidebarItems: [],
        _serverTabs: [],
        _dashboardWidgets: [],
        _adminTabs: []
      };
      const api = createPluginApi(mockPlugin, { callPluginMethod: () => {} });
      mod.default(api);

      assert.ok(mockPlugin._router, 'Plugin should register a router');
    });
  });
});
