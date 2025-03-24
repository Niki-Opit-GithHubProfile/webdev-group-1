const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.use(isAuthenticated);

router.get('/', assetController.getAllAssets);
router.get('/:id', assetController.getAssetDetails);

module.exports = router;