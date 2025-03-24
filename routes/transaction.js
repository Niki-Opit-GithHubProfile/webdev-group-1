const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const { createTransaction, listTransactions } = require('../controllers/transactionController');

router.get('/', isAuthenticated, listTransactions);
router.post('/create', isAuthenticated, createTransaction);


module.exports = router;