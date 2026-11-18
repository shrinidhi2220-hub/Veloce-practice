const { rateLimit } = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

// Limits only failed login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  },
});

// Limits all registration attempts to reduce automated account creation.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProduction ? 5 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many registration attempts. Please try again later.',
    });
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
};
