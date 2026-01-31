import { Router } from 'express';
import os from 'os';
import { count, getDbInfo } from '../db.js';
import { loadFullConfig } from '../config.js';

const router = Router();

const startTime = Date.now();
let requestCount = 0;
let requestLatencies = [];

export function recordRequest(duration) {
  requestCount++;
  requestLatencies.push(duration);
  if (requestLatencies.length > 1000) {
    requestLatencies = requestLatencies.slice(-1000);
  }
}

function formatMetric(name, value, help, type = 'gauge', labels = {}) {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  const labelPart = labelStr ? `{${labelStr}}` : '';
  
  return [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} ${type}`,
    `${name}${labelPart} ${value}`
  ].join('\n');
}

router.get('/metrics', (req, res) => {
  const config = loadFullConfig();
  const dbInfo = getDbInfo();
  const memUsage = process.memoryUsage();
  const cpus = os.cpus();
  
  const avgLatency = requestLatencies.length > 0 
    ? requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length 
    : 0;
  
  const metrics = [
    formatMetric('sodium_up', 1, 'Sodium panel is up'),
    formatMetric('sodium_uptime_seconds', Math.floor((Date.now() - startTime) / 1000), 'Uptime in seconds'),
    
    // Process metrics
    formatMetric('sodium_process_memory_heap_bytes', memUsage.heapUsed, 'Process heap memory used'),
    formatMetric('sodium_process_memory_heap_total_bytes', memUsage.heapTotal, 'Process heap memory total'),
    formatMetric('sodium_process_memory_rss_bytes', memUsage.rss, 'Process resident set size'),
    formatMetric('sodium_process_memory_external_bytes', memUsage.external, 'Process external memory'),
    
    // System metrics
    formatMetric('sodium_system_memory_total_bytes', os.totalmem(), 'System total memory'),
    formatMetric('sodium_system_memory_free_bytes', os.freemem(), 'System free memory'),
    formatMetric('sodium_system_cpu_count', cpus.length, 'Number of CPUs'),
    formatMetric('sodium_system_load_1m', os.loadavg()[0], 'System load average 1 minute'),
    formatMetric('sodium_system_load_5m', os.loadavg()[1], 'System load average 5 minutes'),
    formatMetric('sodium_system_load_15m', os.loadavg()[2], 'System load average 15 minutes'),
    
    // Request metrics
    formatMetric('sodium_http_requests_total', requestCount, 'Total HTTP requests', 'counter'),
    formatMetric('sodium_http_request_duration_avg_ms', avgLatency.toFixed(2), 'Average request duration in ms'),
    
    // Database metrics
    formatMetric('sodium_database_connected', dbInfo.connected || dbInfo.type === 'file' ? 1 : 0, 'Database connection status'),
    formatMetric('sodium_users_total', count('users'), 'Total number of users'),
    formatMetric('sodium_nodes_total', count('nodes'), 'Total number of nodes'),
    formatMetric('sodium_servers_total', count('servers'), 'Total number of servers'),
    formatMetric('sodium_eggs_total', count('eggs'), 'Total number of eggs'),
    
    // Info metric with labels
    `# HELP sodium_info Sodium panel information`,
    `# TYPE sodium_info gauge`,
    `sodium_info{version="${process.env.npm_package_version || '1.0.0'}",node_version="${process.version}",db_type="${dbInfo.type}",platform="${process.platform}"} 1`
  ];
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.join('\n\n') + '\n');
});

export default router;
