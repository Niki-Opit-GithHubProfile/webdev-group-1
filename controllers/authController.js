const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// For sending verification emails
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Authentication Status
exports.authStatus = (req, res) => {
  return res.json({
    isAuthenticated: !!req.session.userId,
    csrfToken: req.csrfToken()
  });
};

// Authentification Forms
exports.getLoginForm = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  return res.render('auth/login', { 
    error: req.query.error 
  });
}

exports.getSignupForm = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  return res.render('auth/signup', { 
    error: req.query.error 
  });
}

// Register user
exports.registerUser = async (req, res) => {
  try {
    const { email, password, confirmPassword, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Email, name, and password are required'));
    }

    if (password != confirmPassword) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Passwords do not match'));
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Email already in use'));
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(20).toString('hex');
    
    // Create user with portfolio in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          emailVerified: false,
          verificationToken
        }
      });
      
      // Create portfolio for the user
      await tx.portfolio.create({
        data: {
          userId: user.id
        }
      });
      
      return user;
    });

    // Send verification email
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Verify your account',
      text: `Click the link to verify your account: http://localhost:3000/auth/verify/${verificationToken}`,
      html: `
      <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MoneyTrail!</h2>
        <p>Thank you for signing up. Please verify your email to continue:</p>
        <a href="https://moneytrail.it/auth/verify/${verificationToken}" 
        style="background-color: #172836; 
          color: white; 
          padding: 14px 28px; 
          text-align: center; 
          text-decoration: none; 
          display: inline-block; 
          font-size: 18px; 
          margin: 10px 5px; 
          cursor: pointer; 
          border-radius: 8px;
          border: 2px solid #FFD700;
          font-weight: 500;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;">
        Verify your account
        </a>
      </div>
      `
    };
    await sgMail.send(msg);

    return res.redirect('/auth/login?error=' + encodeURIComponent('Registration successful! Please verify your email.'));
  } catch (error) {
    console.error(error);
    return res.redirect('/auth/signup?error=' + encodeURIComponent('Server error. Please try again.'));
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.render('auth/login', { 
        error: 'Invalid email or password',
        csrfToken: req.csrfToken()
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.render('auth/login', { 
        error: 'Invalid email or password',
        csrfToken: req.csrfToken()
      });
    }
    
    // Check if user is verified
    if (!user.emailVerified) {
      return res.render('auth/login', {
        error: 'Please verify your email before logging in',
        csrfToken: req.csrfToken() 
      });
    }
    
    // Set user session
    req.session.userId = user.id;
    req.session.isLoggedIn = true;

    // Save session explicitly before redirecting
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('auth/login', {
          error: 'Login failed. Please try again.',
          csrfToken: req.csrfToken()
        });
      }
    
      // Check if first login (onboarding needed)
      if (!user.completedOnboarding) {
        return res.redirect('/onboarding');
      }
      
      // Regular login - redirect to dashboard
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.render('auth/login', { 
      error: 'Login failed. Please try again.',
      csrfToken: req.csrfToken() 
    });
  }
};

// Logout user
exports.logoutUser = async (req, res) => {
  try {
    req.session.userId = null;
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).send('Error during logout');
      }
      
      res.clearCookie('sessionId', {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        domain: process.env.NODE_ENV === 'production' ? 'moneytrail.it' : undefined
      });
      
      return res.redirect('/');
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).send('Server error during logout');
  }
};

// Email verification
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid verification token'));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        emailVerified: true, 
        verificationToken: null 
      }
    });

    return res.redirect('/auth/login?error=' + encodeURIComponent('Email verified! You can now log in.'));
  } catch (error) {
    console.error(error);
    return res.redirect('/auth/login?error=' + encodeURIComponent('Server error during verification'));
  }
};