const rateLimit = require('express-rate-limit');

/**
 * Setup rate limiting for different endpoints
 */

// Public rate limiter (for unauthenticated requests)
const publicLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later'
    });
  }
});

// API key rate limiter (for authenticated requests)
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000, // Per hour per API key
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: {
    success: false,
    error: 'API rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: {
    success: false,
    error: 'Rate limit exceeded for this operation'
  }
});

/**
 * Apply rate limiting based on endpoint type
 */
const setupRateLimiting = () => {
  return (req, res, next) => {
    // Skip rate limiting for health checks and webhooks
    if (req.path === '/api/hub/v1/health' || req.path.includes('/webhooks')) {
      return next();
    }
    
    // Apply public limiter to all requests by default
    publicLimiter(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  };
};

module.exports = {
  publicLimiter,
  apiLimiter,
  strictLimiter,
  setupRateLimiting
};
