const { runAsync } = require('../db');

// In-memory sliding window rate limiter stores
const loginAttemptMap = new Map();
const apiRequestMap = new Map();

/**
 * Clean up old entries from rate limiter maps every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttemptMap.entries()) {
    if (now - record.firstAttempt > 5 * 60 * 1000) {
      loginAttemptMap.delete(key);
    }
  }
  for (const [key, record] of apiRequestMap.entries()) {
    if (now - record.windowStart > 60 * 1000) {
      apiRequestMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Apply essential HTTP security headers
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}

/**
 * Rate limiter for sensitive login endpoint to protect against brute-force
 */
function loginRateLimiter(maxAttempts = 15, windowMs = 5 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `login_${ip}`;
    const now = Date.now();

    const record = loginAttemptMap.get(key) || { count: 0, firstAttempt: now };

    if (now - record.firstAttempt > windowMs) {
      record.count = 1;
      record.firstAttempt = now;
    } else {
      record.count++;
    }

    loginAttemptMap.set(key, record);

    if (record.count > maxAttempts) {
      const waitMinutes = Math.ceil((windowMs - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({
        error: `Too many login attempts from this IP. Please wait ${waitMinutes} minute(s) before trying again.`
      });
    }

    next();
  };
}

/**
 * General API Rate Limiter to prevent DoS
 */
function apiRateLimiter(maxRequests = 300, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `api_${ip}`;
    const now = Date.now();

    const record = apiRequestMap.get(key) || { count: 0, windowStart: now };

    if (now - record.windowStart > windowMs) {
      record.count = 1;
      record.windowStart = now;
    } else {
      record.count++;
    }

    apiRequestMap.set(key, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many API requests. Please slow down.'
      });
    }

    next();
  };
}

/**
 * Helper to log security incidents into audit_logs
 */
async function logSecurityEvent(username, action, entityType, entityId, notes) {
  try {
    await runAsync(
      'INSERT INTO audit_logs (username, action, entity_type, entity_id, notes) VALUES (?, ?, ?, ?, ?)',
      [username || 'anonymous', action, entityType, entityId || 'SECURITY', notes]
    );
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

module.exports = {
  securityHeaders,
  loginRateLimiter,
  apiRateLimiter,
  logSecurityEvent
};
