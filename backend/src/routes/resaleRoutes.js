const express = require('express');
const router = express.Router();

const resaleController = require('../controllers/resaleController');
const {
  authenticate,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Every /admin endpoint requires an authenticated ADMIN.
router.use('/admin', authenticate, authorizeRoles('ADMIN'));

// Admin moderation endpoints.
router.get('/admin/listings', resaleController.getAdminResaleListings);

router.patch(
  '/admin/listings/:id/approve',
  resaleController.approveResaleListing
);

router.patch(
  '/admin/listings/:id/reject',
  resaleController.rejectResaleListing
);

// Public: only approved resale listings.
router.get('/', resaleController.getResaleListings);

// Authenticated customers can submit listings.
router.post('/', authenticate, resaleController.createResaleListing);

module.exports = router;
