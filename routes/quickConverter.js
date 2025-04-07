const express = require('express');
const router = express.Router();
const quickConverterController = require('../controllers/quickConverterController');

// Route to display the quick converter page
router.get('/', quickConverterController.getQuickConverterPage);

module.exports = router;