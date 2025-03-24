const express = require('express');
const router = express.Router();
const { 
  getForms, registerUser, loginUser, logoutUser, verifyEmail,
  getLoginForm, getSignupForm 
} = require('../controllers/authController');

// Legacy route (for backward compatibility)
router.get('/authForms', getForms);

// Auth Forms Routes
router.get('/login', getLoginForm);
router.get('/signup', getSignupForm);

// Registration
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Logout
router.get('/logout', logoutUser);

// Email verification
router.get('/verify/:token', verifyEmail);

module.exports = router;