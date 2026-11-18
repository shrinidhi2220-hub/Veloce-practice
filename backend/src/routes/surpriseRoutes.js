const express = require('express');
const router = express.Router();

const surpriseController = require('../controllers/surpriseController');
const adminSurpriseController = require('../controllers/adminSurpriseController');

const {
  authenticate,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// All admin surprise routes require ADMIN authorization.
router.use('/admin', authenticate, authorizeRoles('ADMIN'));

router.get('/admin', adminSurpriseController.getAdminSurprises);

router.patch(
  '/admin/:id/status',
  adminSurpriseController.updateSurpriseStatus
);

// Existing customer routes remain protected.
router.post('/', authenticate, surpriseController.createSurpriseRequest);
router.get('/', authenticate, surpriseController.getUserSurprises);

module.exports = router;
