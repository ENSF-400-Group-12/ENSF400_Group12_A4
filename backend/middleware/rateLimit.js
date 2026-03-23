const buckets = new Map();

function nowMs() {
  return Date.now();
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function routeLimiter(key, { windowMs, max }) {
  const winMs = Number(windowMs) || 60000;
  const limit = Number(max) || 10;
  return (req, res, next) => {
    const ip = clientIp(req);
    const bucketKey = `${key}:${ip}`;
    const cur = buckets.get(bucketKey);
    const ts = nowMs();

    if (!cur || ts >= cur.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: ts + winMs });
      return next();
    }

    if (cur.count >= limit) {
      const retryAfterSec = Math.max(1, Math.ceil((cur.resetAt - ts) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    cur.count += 1;
    buckets.set(bucketKey, cur);
    return next();
  };
}

module.exports = { routeLimiter };
