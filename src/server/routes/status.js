import express from 'express';
import { loadNodes, loadLocations, loadServers, loadUsers, loadIncidents } from '../db.js';
import { wingsRequest } from '../utils/helpers.js';
import { getNodeAvailableResources } from '../utils/node-resources.js';
import { authenticateUser } from '../utils/auth.js';

const router = express.Router();

router.get('/status/nodes', async (req, res) => {
  const data = await loadNodes();
  const locations = await loadLocations();
  const publicNodes = await Promise.all(data.nodes.map(async node => {
    let status = 'offline';
    let stats = { memory: 0, disk: 0 };
    try {
      const info = await wingsRequest(node, 'GET', '/api/system');
      status = 'online';
      stats = info;
    } catch {
      // Node offline, use default values
    }
    
    const servers = await loadServers();
    const nodeServers = servers.servers.filter(s => s.node_id === node.id);
    const serverCount = nodeServers.length;
    
    // Calculate allocated resources
    const allocatedMemory = nodeServers.reduce((sum, s) => sum + (s.limits?.memory || 0), 0);
    const allocatedDisk = nodeServers.reduce((sum, s) => sum + (s.limits?.disk || 0), 0);
    
    const location = locations.locations.find(l => l.id === node.location_id);
    
    return {
      id: node.id,
      name: node.name,
      location: location?.short || 'Unknown',
      status,
      memory: { 
        total: node.memory, 
        used: stats.memory_bytes || 0,
        allocated: allocatedMemory
      },
      disk: { 
        total: node.disk, 
        used: stats.disk_bytes || 0,
        allocated: allocatedDisk
      },
      servers: serverCount
    };
  }));
  res.json({ nodes: publicNodes });
});

router.get('/status/incidents', async (req, res) => {
  const data = await loadIncidents();
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const incidents = (data.incidents || [])
    .filter(i => now - new Date(i.created_at).getTime() < ninetyDays)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(i => ({
      id: i.id,
      title: i.title,
      description: i.description,
      status: i.status,
      impact: i.impact,
      affected_nodes: i.affected_nodes,
      updates: i.updates,
      resolved_at: i.resolved_at,
      created_at: i.created_at
    }));
  res.json({ incidents });
});

router.get('/status/uptime', async (req, res) => {
  try {
    const { getAllUptimeHistory } = await import('../utils/node-health.js');
    const history = await getAllUptimeHistory();
    res.json({ history });
  } catch (err) {
    res.json({ history: {} });
  }
});

router.get('/nodes/available', authenticateUser, async (req, res) => {
  const nodes = await loadNodes();
  const allNodes = await Promise.all(nodes.nodes
    .filter(n => !n.maintenance_mode)
    .map(async n => {
      const resources = await getNodeAvailableResources(n.id);
      return {
        id: n.id,
        name: n.name,
        fqdn: n.fqdn,
        location_id: n.location_id,
        available_memory: resources?.available_memory || 0,
        available_disk: resources?.available_disk || 0,
        available_ports: resources?.available_ports?.length || 0
      };
    }));
  const availableNodes = allNodes.filter(n => n.available_ports > 0);
  
  res.json({ nodes: availableNodes });
});

router.get('/nodes/:id/ports', authenticateUser, async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  
  const users = await loadUsers();
  const user = users.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const resources = await getNodeAvailableResources(req.params.id);
  if (!resources) return res.status(404).json({ error: 'Node not found' });
  
  res.json({ 
    ports: resources.available_ports,
    allocation_start: resources.allocation_start,
    allocation_end: resources.allocation_end
  });
});

export default router;
