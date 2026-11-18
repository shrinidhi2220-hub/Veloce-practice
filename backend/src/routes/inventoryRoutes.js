
const express = require('express');
const router = express.Router();

const inventoryController = require('../controllers/inventoryController');

const {
  authenticate,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// All inventory-event endpoints require administrator access.
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/events', inventoryController.getInventoryEvents);

module.exports = router;

