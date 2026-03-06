import { createClient } from 'redis';
import { loadFullConfig } from './config.js';
import logger from './utils/logger.js';

let client = null;
let subscriber = null;
let connected = false;
const INVALIDATION_CHANNEL = 'sodium:cache:invalidate';

export async function initRedis() {
  const config = loadFullConfig();
  if (!config.redis?.enabled) return false;

  try {
    const url = config.redis.password
      ? `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`
      : `redis://${config.redis.host}:${config.redis.port}`;

    client = createClient({ url });

    client.on('error', (err) => {
      logger.warn(`[REDIS] ${err.message}`);
      connected = false;
    });

    client.on('reconnecting', () => {
      logger.info('[REDIS] Reconnecting...');
    });

    await client.connect();
    connected = true;
    logger.info(`[REDIS] Connected to ${config.redis.host}:${config.redis.port}`);
    
    // Set up pub/sub subscriber for cache invalidation across panels
    subscriber = client.duplicate();
    subscriber.on('error', () => {});
    await subscriber.connect();
    await subscriber.subscribe(INVALIDATION_CHANNEL, (message) => {
      try {
        const key = message;
        // Delete from local Redis cache (another panel invalidated it)
        client.del(key).catch(() => {});
      } catch {}
    });
    
    return true;
  } catch (err) {
    logger.warn(`[REDIS] Failed to connect: ${err.message}`);
    client = null;
    connected = false;
    return false;
  }
}

export function isRedisConnected() {
  return connected && client !== null;
}

export async function redisGet(key) {
  if (!isRedisConnected()) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`[REDIS] GET ${key} failed: ${err.message}`);
    return null;
  }
}

export async function redisSet(key, value, ttl = 300) {
  if (!isRedisConnected()) return false;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttl });
    return true;
  } catch (err) {
    logger.warn(`[REDIS] SET ${key} failed: ${err.message}`);
    return false;
  }
}

export async function redisDel(key) {
  if (!isRedisConnected()) return false;
  try {
    await client.del(key);
    // Notify other panels to invalidate this key
    await client.publish(INVALIDATION_CHANNEL, key);
    return true;
  } catch (err) {
    logger.warn(`[REDIS] DEL ${key} failed: ${err.message}`);
    return false;
  }
}

export async function redisInvalidate(key) {
  if (!isRedisConnected()) return false;
  try {
    await client.del(key);
    await client.publish(INVALIDATION_CHANNEL, key);
    return true;
  } catch (err) {
    logger.warn(`[REDIS] INVALIDATE ${key} failed: ${err.message}`);
    return false;
  }
}

export async function redisFlush() {
  if (!isRedisConnected()) return false;
  try {
    await client.flushDb();
    return true;
  } catch (err) {
    logger.warn(`[REDIS] FLUSH failed: ${err.message}`);
    return false;
  }
}

export async function closeRedis() {
  if (subscriber) {
    try {
      await subscriber.unsubscribe(INVALIDATION_CHANNEL);
      await subscriber.quit();
    } catch (_) {}
    subscriber = null;
  }
  if (client) {
    try {
      await client.quit();
    } catch (_) {}
    client = null;
    connected = false;
  }
}

export function getRedisInfo() {
  const config = loadFullConfig();
  return {
    enabled: config.redis?.enabled || false,
    connected,
    host: config.redis?.host || 'localhost',
    port: config.redis?.port || 6379
  };
}
