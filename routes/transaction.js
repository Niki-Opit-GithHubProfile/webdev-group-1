const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const { createTransaction, listTransactions } = require('../controllers/transactionController');

// All transaction routes require authentication
router.post('/create', isAuthenticated, createTransaction);
router.get('/', isAuthenticated, listTransactions);

module.exports = router;