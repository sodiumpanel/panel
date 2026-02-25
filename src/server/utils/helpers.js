import crypto from 'crypto';
import { loadConfig } from '../db.js';

export function isAdmin(user) {
  return user && (user.isAdmin === true || user.role === 'admin');
}

export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .replace(/\\/g, '&#92;');
}

export function sanitizeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.hostname.includes('<') || parsed.hostname.includes('>')) return '';
    return parsed.href;
  } catch {
    // Invalid URL format
    return '';
  }
}

export function validateUsername(username) {
  if (typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function sanitizeLinks(links) {
  if (!links || typeof links !== 'object') return {};
  const allowed = ['website', 'twitter', 'github', 'discord', 'instagram'];
  const sanitized = {};
  for (const key of allowed) {
    if (links[key]) {
      sanitized[key] = sanitizeUrl(links[key]);
    }
  }
  return sanitized;
}

export function generateUUID() {
  return crypto.randomUUID();
}

export function generateToken(length = 64) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

export class NodeError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'NodeError';
    this.code = code;
    this.originalError = originalError;
  }
}

function classifyNodeError(error, node) {
  const msg = error?.message?.toLowerCase() || '';
  const cause = error?.cause?.code || error?.code || '';

  if (cause === 'ECONNREFUSED' || msg.includes('econnrefused')) {
    return new NodeError(
      `Node "${node.name}" is not responding (connection refused on ${node.fqdn}:${node.daemon_port})`,
      'NODE_OFFLINE', error
    );
  }

  if (cause === 'ECONNRESET' || msg.includes('econnreset')) {
    return new NodeError(
      `Connection to node "${node.name}" was reset`,
      'NODE_CONNECTION_RESET', error
    );
  }

  if (cause === 'ETIMEDOUT' || cause === 'ETIME' || msg.includes('etimedout') || msg.includes('timeout') || error.name === 'AbortError' || msg.includes('aborted')) {
    return new NodeError(
      `Node "${node.name}" did not respond in time (timeout)`,
      'NODE_TIMEOUT', error
    );
  }

  if (cause === 'ENOTFOUND' || msg.includes('enotfound') || msg.includes('getaddrinfo')) {
    return new NodeError(
      `Node "${node.name}" hostname could not be resolved (${node.fqdn})`,
      'NODE_DNS_ERROR', error
    );
  }

  if (cause === 'EHOSTUNREACH' || msg.includes('ehostunreach')) {
    return new NodeError(
      `Node "${node.name}" is unreachable (${node.fqdn})`,
      'NODE_UNREACHABLE', error
    );
  }

  if (cause === 'ENETUNREACH' || msg.includes('enetunreach')) {
    return new NodeError(
      `Network unreachable when connecting to node "${node.name}"`,
      'NODE_NETWORK_ERROR', error
    );
  }

  if (msg.includes('ssl') || msg.includes('tls') || msg.includes('cert') || msg.includes('self-signed') || cause === 'DEPTH_ZERO_SELF_SIGNED_CERT' || cause === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return new NodeError(
      `SSL/TLS error connecting to node "${node.name}" (${node.fqdn})`,
      'NODE_SSL_ERROR', error
    );
  }

  if (msg.includes('fetch failed') || msg.includes('failed to fetch') || msg === 'fetch failed') {
    return new NodeError(
      `Cannot connect to node "${node.name}" (${node.fqdn}:${node.daemon_port})`,
      'NODE_OFFLINE', error
    );
  }

  return new NodeError(
    `Node "${node.name}" communication error: ${error.message || 'Unknown error'}`,
    'NODE_UNKNOWN_ERROR', error
  );
}

export async function wingsRequest(node, method, endpoint, data = null, rawContent = false) {
  const url = `${node.scheme}://${node.fqdn}:${node.daemon_port}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${node.daemon_token}`,
    'Accept': 'application/json'
  };
  
  if (rawContent) {
    headers['Content-Type'] = 'text/plain';
  } else {
    headers['Content-Type'] = 'application/json';
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const options = { method, headers, signal: controller.signal };
  if (data !== null) {
    options.body = rawContent ? data : JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const statusMessages = {
        401: `Node "${node.name}" rejected authentication (invalid token)`,
        403: `Node "${node.name}" denied access`,
        404: `Resource not found on node "${node.name}"`,
        409: `Conflict: resource is busy on node "${node.name}"`,
        429: `Node "${node.name}" is rate limiting requests`,
        500: `Node "${node.name}" internal error`,
        502: `Node "${node.name}" returned a bad gateway error`,
        503: `Node "${node.name}" is temporarily unavailable`,
      };
      const message = error.error || statusMessages[response.status] || `Node "${node.name}" returned HTTP ${response.status}`;
      throw new NodeError(message, `NODE_HTTP_${response.status}`);
    }

    return response.json().catch(() => ({}));
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof NodeError) throw error;
    throw classifyNodeError(error, node);
  }
}

export function generateNodeConfig(node) {
  return {
    debug: false,
    uuid: node.id,
    token_id: node.daemon_token_id,
    token: node.daemon_token,
    api: {
      host: '0.0.0.0',
      port: node.daemon_port,
      ssl: { enabled: node.scheme === 'https', cert: '/etc/letsencrypt/live/node/fullchain.pem', key: '/etc/letsencrypt/live/node/privkey.pem' },
      upload_limit: node.upload_size
    },
    system: { data: '/var/lib/pterodactyl/volumes', sftp: { bind_port: node.daemon_sftp_port } },
    docker: {
      network: {
        name: 'pterodactyl_nw',
        interfaces: {
          v4: {
            subnet: '172.50.0.0/16',
            gateway: '172.50.0.1'
          }
        }
      }
    },
    remote: loadConfig().panel?.url || 'http://localhost:3000',
    allowed_origins: ['*']
  };
}

export function configToYaml(obj, indent = 0) {
  let yaml = '';
  const spaces = '  '.repeat(indent);
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n${configToYaml(value, indent + 1)}`;
    } else if (typeof value === 'boolean') {
      yaml += `${spaces}${key}: ${value}\n`;
    } else if (typeof value === 'number') {
      yaml += `${spaces}${key}: ${value}\n`;
    } else {
      yaml += `${spaces}${key}: "${value}"\n`;
    }
  }
  return yaml;
}

export function validateVariableValue(value, rulesString) {
  if (!rulesString) return null;
  
  const parts = rulesString.split('|');
  const rules = {
    required: false,
    nullable: false,
    type: null,
    min: null,
    max: null,
    in: []
  };
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === 'required') rules.required = true;
    else if (trimmed === 'nullable') rules.nullable = true;
    else if (trimmed === 'string') rules.type = 'string';
    else if (trimmed === 'numeric' || trimmed === 'integer') rules.type = 'number';
    else if (trimmed === 'boolean') rules.type = 'boolean';
    else if (trimmed.startsWith('min:')) rules.min = parseInt(trimmed.split(':')[1]);
    else if (trimmed.startsWith('max:')) rules.max = parseInt(trimmed.split(':')[1]);
    else if (trimmed.startsWith('in:')) rules.in = trimmed.split(':')[1].split(',');
  }
  
  const strValue = String(value ?? '');
  
  if (rules.required && strValue === '') {
    return 'This field is required';
  }
  
  if (rules.nullable && strValue === '') {
    return null;
  }
  
  if (rules.type === 'number' && strValue !== '') {
    if (isNaN(Number(strValue))) {
      return 'Must be a number';
    }
    const num = Number(strValue);
    if (rules.min !== null && num < rules.min) {
      return `Minimum value is ${rules.min}`;
    }
    if (rules.max !== null && num > rules.max) {
      return `Maximum value is ${rules.max}`;
    }
  }
  
  if (rules.type === 'string' && strValue !== '') {
    if (rules.min !== null && strValue.length < rules.min) {
      return `Minimum length is ${rules.min}`;
    }
    if (rules.max !== null && strValue.length > rules.max) {
      return `Maximum length is ${rules.max}`;
    }
  }
  
  if (rules.in.length > 0 && strValue !== '' && !rules.in.includes(strValue)) {
    return `Must be one of: ${rules.in.join(', ')}`;
  }
  
  return null;
}
