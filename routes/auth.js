const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, verifyEmail } = require('../controllers/authController');

// Registration
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Logout
router.post('/logout', logoutUser);

// Email verification link: http://yourdomain.com/auth/verify/:token
router.get('/verify/:token', verifyEmail);

module.exports = router;