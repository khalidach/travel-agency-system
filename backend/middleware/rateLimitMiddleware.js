// backend/middleware/rateLimitMiddleware.js
const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for the login route to prevent brute-force attacks.
 * It limits each IP to 10 login requests per 15 minutes.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  },
});

/**
 * A more general rate limiter for all other API requests.
 * It limits each IP to 500 requests per 15 minutes to allow for active users.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 350, // Limit each IP to 500 requests per window
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
