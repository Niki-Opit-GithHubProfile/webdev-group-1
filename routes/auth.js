const express = require('express');
const passport = require('passport');
const router = express.Router();
const { 
  authStatus, registerUser, loginUser, logoutUser, verifyEmail,
  getLoginForm, getSignupForm 
} = require('../controllers/authController');

// Authentication Status
router.get('/auth-status', authStatus);

// Auth Forms Routes
router.get('/login', getLoginForm);
router.get('/signup', getSignupForm);

// Google Authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { 
  failureRedirect: '/auth/login' 
}), (req, res) => {
  req.session.userId = req.user.id;
  req.session.isLoggedIn = true;
  
  if (!req.user.completedOnboarding) {
    return res.redirect('/onboarding');
  }
  return res.redirect('/dashboard');
});

// Registration
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Logout
router.get('/logout', logoutUser);

// Email verification
router.get('/verify/:token', verifyEmail);

module.exports = router;