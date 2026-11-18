const express = require('express');
const router = express.Router();

const consentController = require('../controllers/consentController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', consentController.getMyConsents);
router.put('/:dataType', consentController.setMyConsent);

module.exports = router;
