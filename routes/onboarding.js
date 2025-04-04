const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.use(isAuthenticated);

router.get('/', onboardingController.getOnboardingStart);
router.post('/', onboardingController.processOnboardingChoice);
router.get('/initial-assets', onboardingController.getInitialAssetsPage);
router.post('/initial-assets', onboardingController.processInitialAssets);

module.exports = router;