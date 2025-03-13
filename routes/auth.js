const express = require('express');
const router = express.Router();
const { 
    showHome, 
    showDashboard, 
    registerUser, 
    loginUser, 
    logoutUser, 
    verifyEmail 
} = require('../controllers/authController');
const { ensureAuthenticated, ensureGuest } = require('../middlewares/auth');

// Routes accessible without authentication
router.get('/', ensureGuest, showHome);
router.post('/register', ensureGuest, registerUser);
router.post('/login', ensureGuest, loginUser);
router.get('/verify-email', verifyEmail);

// Routes accessible only if authenticated
router.get('/dashboard', ensureAuthenticated, showDashboard);
router.post('/logout', ensureAuthenticated, logoutUser);

module.exports = router;