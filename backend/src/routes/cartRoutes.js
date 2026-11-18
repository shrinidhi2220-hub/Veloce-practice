
const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');

router.post('/', cartController.addToCart);

router.get('/:sessionId', cartController.getCart);

router.patch(
  '/:sessionId/items/:productId',
  cartController.updateCartItem
);

router.delete(
  '/:sessionId/items/:productId',
  cartController.removeFromCart
);

module.exports = router;
