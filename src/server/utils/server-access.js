import { loadServers, loadNodes } from '../db.js';
import { hasPermission } from './permissions.js';

export async function getServerAndNode(serverId, user, requiredPermission = null) {
  const data = loadServers();
  const server = data.servers.find(s => s.id === serverId);
  if (!server) return { error: 'Server not found', status: 404 };
  
  if (server.suspended) {
    return { error: 'Server is suspended', status: 403 };
  }
  
  if (!user) return { error: 'User not found', status: 404 };
  
  const nodes = loadNodes();
  const node = nodes.nodes.find(n => n.id === server.node_id);
  
  if (user.isAdmin || server.user_id === user.id) {
    if (!node) return { error: 'Node not available', status: 400 };
    return { server, node, user, isOwner: true };
  }
  
  const subuser = (server.subusers || []).find(s => s.user_id === user.id);
  if (!subuser) return { error: 'Forbidden', status: 403 };
  
  if (requiredPermission && !hasPermission(subuser, requiredPermission)) {
    return { error: 'Permission denied', status: 403 };
  }
  
  if (!node) return { error: 'Node not available', status: 400 };
  return { server, node, user, isOwner: false, subuser };
}
