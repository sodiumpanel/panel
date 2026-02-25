import logger from '../utils/logger.js';

const hooks = {};

export function registerHook(event, handler, priority = 10) {
  if (!hooks[event]) hooks[event] = [];
  hooks[event].push({ handler, priority });
  hooks[event].sort((a, b) => a.priority - b.priority);
}

export function removeHook(event, handler) {
  if (!hooks[event]) return;
  hooks[event] = hooks[event].filter(h => h.handler !== handler);
}

export function removeAllHooks(pluginId) {
  for (const event of Object.keys(hooks)) {
    hooks[event] = hooks[event].filter(h => h.handler._pluginId !== pluginId);
  }
}

export async function executeHook(event, context = {}) {
  if (!hooks[event]) return context;

  const ctx = { ...context, _denied: false, _denyReason: null };
  ctx.deny = (reason) => {
    ctx._denied = true;
    ctx._denyReason = reason;
  };

  for (const { handler } of hooks[event]) {
    try {
      await handler(ctx);
      if (ctx._denied) break;
    } catch (err) {
      logger.warn(`[Plugins] Hook "${event}" error: ${err.message}`);
    }
  }

  return ctx;
}

export function getRegisteredHooks() {
  const result = {};
  for (const [event, handlers] of Object.entries(hooks)) {
    result[event] = handlers.length;
  }
  return result;
}
