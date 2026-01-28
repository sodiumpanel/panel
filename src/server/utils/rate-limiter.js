const attempts = new Map();

export function rateLimit(options = {}) {
  const { windowMs = 60000, max = 10, message = 'Too many requests' } = options;
  
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of attempts) {
      if (now - data.startTime > windowMs) {
        attempts.delete(key);
      }
    }
  }, 60000);
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    let data = attempts.get(key);
    if (!data || now - data.startTime > windowMs) {
      data = { count: 0, startTime: now };
      attempts.set(key, data);
    }
    
    data.count++;
    
    if (data.count > max) {
      return res.status(429).json({ error: message });
    }
    
    next();
  };
}
