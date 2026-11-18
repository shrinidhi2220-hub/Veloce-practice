const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const adminOrderController = require('../controllers/adminOrderController');

const {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// ADMIN: view all orders, including guest COD orders.
router.get(
  '/admin',
  authenticate,
  authorizeRoles('ADMIN'),
  adminOrderController.getAdminOrders
);

// ADMIN: advance an order through its permitted delivery stages.
router.patch(
  '/admin/:id/status',
  authenticate,
  authorizeRoles('ADMIN'),
  adminOrderController.updateOrderStatus
);

// Guests may checkout using COD.
// Logged-in customers have their userId attached to the order.
router.post('/', optionalAuthenticate, orderController.placeOrder);

// Authenticated customers can retrieve only their own orders.
router.get('/:id', authenticate, orderController.getOrderById);

module.exports = router;
