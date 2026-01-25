import { Router } from 'express';
import auth from '../middleware/auth.js';
import Server from '../models/Server.js';
import Node from '../models/Node.js';
import Allocation from '../models/Allocation.js';
import daemonManager from '../services/daemon-manager.js';

const router = Router();

// Get the node for a server
async function getServerNode(serverUuid) {
  const server = Server.findByUuid(serverUuid);
  if (!server) return null;
  
  // Get node from allocation
  const allocations = Allocation.findByServer(server.id);
  if (!allocations || allocations.length === 0) return null;
  
  return Node.findById(allocations[0].node_id);
}

// Check server ownership
async function checkOwnership(req, serverUuid) {
  const server = Server.findByUuid(serverUuid);
  if (!server) {
    throw { status: 404, message: 'Server not found' };
  }
  if (server.owner_id !== req.user.id && req.user.role !== 'admin') {
    throw { status: 403, message: 'Access denied' };
  }
  return server;
}

// Make request to daemon
async function daemonRequest(node, serverUuid, endpoint, options = {}) {
  const url = `${node.scheme}://${node.fqdn}:${node.daemon_port}/api/servers/${serverUuid}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${node.daemon_token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Daemon request failed' }));
      throw { status: response.status, message: error.error || 'Daemon error' };
    }

    return response;
  } catch (err) {
    if (err.status) throw err;
    throw { status: 503, message: 'Daemon not reachable' };
  }
}

// List directory - daemon uses /files?path=
router.get('/:serverId/files/list', auth, async (req, res) => {
  try {
    const server = await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    // Check if daemon is connected
    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const path = req.query.path || '/';
    const response = await daemonRequest(node, req.params.serverId, `/files?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Read file - daemon uses /files/contents?path=
router.get('/:serverId/files/read', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const path = req.query.path || '/';
    const response = await daemonRequest(node, req.params.serverId, `/files/contents?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Write file
router.post('/:serverId/files/write', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { path, content } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/write', {
      method: 'POST',
      body: { path, content }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Create directory
router.post('/:serverId/files/mkdir', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { path } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/mkdir', {
      method: 'POST',
      body: { path }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Delete file/directory
router.post('/:serverId/files/delete', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { paths } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/delete', {
      method: 'POST',
      body: { paths }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Rename/move file
router.post('/:serverId/files/rename', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { from, to } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/rename', {
      method: 'POST',
      body: { from, to }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Copy file
router.post('/:serverId/files/copy', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { path } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/copy', {
      method: 'POST',
      body: { path }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Compress files
router.post('/:serverId/files/compress', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { paths, destination } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/compress', {
      method: 'POST',
      body: { paths, destination }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Decompress file
router.post('/:serverId/files/decompress', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const { path } = req.body;
    const response = await daemonRequest(node, req.params.serverId, '/files/decompress', {
      method: 'POST',
      body: { path }
    });
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Download file (redirect to daemon)
router.get('/:serverId/files/download', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    // Generate a signed download URL or proxy the download
    const path = req.query.path || '/';
    const downloadUrl = `${node.scheme}://${node.fqdn}:${node.daemon_port}/api/servers/${req.params.serverId}/files/download?path=${encodeURIComponent(path)}&token=${node.daemon_token}`;
    
    res.json({ data: { url: downloadUrl } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Upload URL (get signed upload URL from daemon)
router.get('/:serverId/files/upload-url', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const path = req.query.path || '/';
    const uploadUrl = `${node.scheme}://${node.fqdn}:${node.daemon_port}/api/servers/${req.params.serverId}/files/upload?path=${encodeURIComponent(path)}&token=${node.daemon_token}`;
    
    res.json({ data: { url: uploadUrl } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Search files
router.get('/:serverId/files/search', auth, async (req, res) => {
  try {
    await checkOwnership(req, req.params.serverId);
    const node = await getServerNode(req.params.serverId);
    
    if (!node) {
      return res.status(400).json({ error: 'Server has no assigned node' });
    }

    if (!daemonManager.isDaemonConnected(node.uuid)) {
      return res.status(503).json({ error: 'Daemon not connected' });
    }

    const query = req.query.query || '';
    const response = await daemonRequest(node, req.params.serverId, `/files/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
