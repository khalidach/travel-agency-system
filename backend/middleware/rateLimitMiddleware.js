// backend/middleware/rateLimitMiddleware.js
const rateLimit = require("express-rate-limit");

const isDev = process.env.NODE_ENV !== "production";

/**
 * Rate limiter for the login route to prevent brute-force attacks.
 * It limits each IP to 10 login requests per 15 minutes (relaxed in dev).
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 10, // Relax in development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  },
});

/**
 * A more general rate limiter for all other API requests.
 * Limits requests per window (relaxed in dev to avoid throttling localhost).
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 350, // Relax in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

module.exports = {
  loginLimiter,
  apiLimiter,
};
