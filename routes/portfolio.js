const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.use(isAuthenticated);

router.get('/', portfolioController.getPortfolio);
router.post('/add-funds', portfolioController.addFunds);

module.exports = router;