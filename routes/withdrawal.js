const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.use(isAuthenticated);

router.get('/', withdrawalController.getAllWithdrawals);
router.post('/', withdrawalController.createWithdrawal);
router.delete('/:id', withdrawalController.deleteWithdrawal);
router.get('/add', withdrawalController.getAddWithdrawalPage);

module.exports = router;