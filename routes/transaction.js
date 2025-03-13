const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const { listTransactions, createTransaction, getTransaction, updateTransaction, deleteTransaction } = require('../controllers/transactionController');

// All transaction routes require authentication
router.use(ensureAuthenticated);

router.get('/', listTransactions); 
router.post('/', createTransaction); 
router.get('/:id', getTransaction); 
router.post('/:id/update', updateTransaction); 
router.post('/:id/delete', deleteTransaction);

module.exports = router;