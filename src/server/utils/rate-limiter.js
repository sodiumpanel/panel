const attempts = new Map();

// Single global cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attempts) {
    if (now - data.startTime > data.windowMs) {
      attempts.delete(key);
    }
  }
}, 60000).unref();

let limiterIdCounter = 0;

export function rateLimit(options = {}) {
  const { windowMs = 60000, max = 10, message = 'Too many requests' } = options;
  const limiterId = ++limiterIdCounter;
  
  return (req, res, next) => {
    const key = `${req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'}:rl${limiterId}`;
    const now = Date.now();
    
    let data = attempts.get(key);
    if (!data || now - data.startTime > windowMs) {
      data = { count: 0, startTime: now, windowMs };
      attempts.set(key, data);
    }
    
    data.count++;
    
    if (data.count > max) {
      return res.status(429).json({ error: message });
    }
    
    next();
  };
}
