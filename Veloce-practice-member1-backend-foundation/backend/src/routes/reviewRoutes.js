
const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/authMiddleware');

// Public: customers can view product reviews.
router.get('/:productId', reviewController.getProductReviews);

// Protected: only authenticated customers can submit reviews.
router.post('/', authenticate, reviewController.createReview);

module.exports = router;
