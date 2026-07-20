const rateMap = new Map();

function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const phone = req.body?.phone || req.body?.farmerPhone || key;
    const now = Date.now();

    if (!rateMap.has(phone)) {
      rateMap.set(phone, []);
    }

    const timestamps = rateMap.get(phone).filter(t => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    timestamps.push(now);
    rateMap.set(phone, timestamps);
    next();
  };
}

function getRateLimitStatus(phone) {
  const timestamps = rateMap.get(phone) || [];
  const now = Date.now();
  const active = timestamps.filter(t => now - t < 60000);
  return { phone, requestsInLastMinute: active.length };
}

module.exports = { rateLimit, getRateLimitStatus };
