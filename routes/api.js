const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');

// Crypto API routes
router.get('/prices', cryptoController.getPrices);
router.get('/coins', cryptoController.getCoinsList);
router.get('/history/:coinId/:days', cryptoController.getHistoricalData);

module.exports = router;