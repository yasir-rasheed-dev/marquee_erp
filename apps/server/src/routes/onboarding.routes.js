const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../common/middleware/auth');
const { getOnboardingStatus } = require('../controllers/onboarding.controller');

router.use(authMiddleware);

router.get('/status', getOnboardingStatus); // GET /api/onboarding/status

module.exports = router;
