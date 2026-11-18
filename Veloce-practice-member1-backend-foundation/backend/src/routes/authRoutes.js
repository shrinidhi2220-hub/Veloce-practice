const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const {
  loginLimiter,
  registerLimiter,
} = require('../middleware/authRateLimit');

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, authController.updateMe);

module.exports = router;
