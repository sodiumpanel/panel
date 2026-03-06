import { loadNodes, loadNodeHealthHistory, saveNodeHealthHistory } from '../db.js';
import { wingsRequest } from './helpers.js';
import { triggerWebhook } from './webhooks.js';
import logger from './logger.js';

const nodeHealth = new Map();
let healthInterval = null;
let savePending = false;

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function hourStr(d) {
  return d.getUTCHours();
}

async function getHistoryRecord(nodeId) {
  const data = await loadNodeHealthHistory();
  const records = data.nodeHealthHistory || [];
  return records.find(r => r.id === nodeId) || null;
}

async function recordStatus(nodeId, status) {
  const data = await loadNodeHealthHistory();
  const records = data.nodeHealthHistory || [];
  let record = records.find(r => r.id === nodeId);

  if (!record) {
    record = { id: nodeId, days: {} };
    records.push(record);
  }

  const now = new Date();
  const day = dateStr(now);
  const hour = hourStr(now);

  if (!record.days[day]) record.days[day] = {};
  record.days[day][hour] = status;

  // Prune older than 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 91);
  const cutoffStr = dateStr(cutoff);
  for (const d of Object.keys(record.days)) {
    if (d < cutoffStr) delete record.days[d];
  }

  // Debounce saves — max once per 10s
  if (!savePending) {
    savePending = true;
    setTimeout(() => {
      savePending = false;
      saveNodeHealthHistory({ nodeHealthHistory: records });
    }, 10000);
  }
}

function getDayStatus(hourMap) {
  if (!hourMap || Object.keys(hourMap).length === 0) return 'unknown';
  const vals = Object.values(hourMap);
  const offlineCount = vals.filter(s => s === 'offline').length;
  if (offlineCount === 0) return 'online';
  if (offlineCount === vals.length) return 'offline';
  return 'degraded';
}

export function getNodeHealth(nodeId) {
  return nodeHealth.get(nodeId) || null;
}

export function getAllNodeHealth() {
  const result = {};
  for (const [id, health] of nodeHealth) {
    result[id] = health;
  }
  return result;
}

export async function getNodeUptimeHistory(nodeId) {
  const record = await getHistoryRecord(nodeId);
  const days = record?.days || {};
  const history = [];
  const now = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    const hourMap = days[ds];
    const status = getDayStatus(hourMap);

    let checks = 0;
    let checksOnline = 0;
    if (hourMap) {
      const vals = Object.values(hourMap);
      checks = vals.length;
      checksOnline = vals.filter(s => s !== 'offline').length;
    }

    history.push({ date: ds, status, checks, online: checksOnline });
  }

  return history;
}

export async function getAllUptimeHistory() {
  const data = await loadNodeHealthHistory();
  const records = data.nodeHealthHistory || [];
  const result = {};
  for (const record of records) {
    result[record.id] = await getNodeUptimeHistory(record.id);
  }
  return result;
}

async function checkNode(node) {
  const start = Date.now();
  const previous = nodeHealth.get(node.id);

  try {
    await wingsRequest(node, 'GET', '/api/system');
    const responseTime = Date.now() - start;
    const status = responseTime > 5000 ? 'degraded' : 'online';

    const health = {
      status,
      last_seen: new Date().toISOString(),
      response_time: responseTime,
      last_error: null,
      checked_at: new Date().toISOString()
    };

    nodeHealth.set(node.id, health);
    recordStatus(node.id, status);

    if (previous && previous.status === 'offline' && status !== 'offline') {
      logger.info(`Node "${node.name}" is back online (${responseTime}ms)`);
      triggerWebhook('node.online', {
        node_name: node.name,
        node_id: node.id,
        response_time: responseTime
      });
    }
  } catch (err) {
    const health = {
      status: 'offline',
      last_seen: previous?.last_seen || null,
      response_time: null,
      last_error: err.message,
      checked_at: new Date().toISOString()
    };

    nodeHealth.set(node.id, health);
    recordStatus(node.id, 'offline');

    if (!previous || previous.status !== 'offline') {
      logger.warn(`Node "${node.name}" went offline: ${err.message}`);
      triggerWebhook('node.offline', {
        node_name: node.name,
        node_id: node.id,
        error: err.message
      });
    }
  }
}

async function pollNodes() {
  try {
    const data = await loadNodes();
    const nodes = data.nodes || [];

    await Promise.allSettled(nodes.map(node => checkNode(node)));
  } catch (err) {
    logger.error(`Node health poll failed: ${err.message}`);
  }
}

export function startNodeHealthMonitor() {
  if (healthInterval) return;

  pollNodes();
  healthInterval = setInterval(pollNodes, 60000);
  logger.info('Node health monitor started');
}

export function stopNodeHealthMonitor() {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
}
