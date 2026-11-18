const express = require('express');
const router = express.Router();

const rewardController = require('../controllers/rewardController');
const {
  authenticate,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Customer: read only their own reward history and balance.
router.get('/me', authenticate, rewardController.getMyRewards);

// Admin: award points to a selected customer.
router.post(
  '/admin/award',
  authenticate,
  authorizeRoles('ADMIN'),
  rewardController.adminAwardPoints
);

module.exports = router;
