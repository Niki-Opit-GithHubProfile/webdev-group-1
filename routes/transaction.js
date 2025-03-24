const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.use(isAuthenticated);

router.get('/', transactionController.getAllTransactions);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);
router.get('/add', transactionController.getAddTransactionPage);

module.exports = router;