const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.use(isAuthenticated);

router.get('/', depositController.getAllDeposits);
router.post('/', depositController.createDeposit);
router.delete('/:id', depositController.deleteDeposit);
router.get('/add', depositController.getAddDepositPage);

module.exports = router;