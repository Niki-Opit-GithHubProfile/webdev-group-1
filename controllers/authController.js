const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// For sending verification emails
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Legacy handler (can be removed later)
exports.getForms = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  // Redirect to new login page
  return res.redirect('/auth/login');
}

// New dedicated handlers
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
    const { email, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Email and password are required'));
    }

    if (password != confirmPassword) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Passwords do not match'));
    }
    
    if (password.length < 8) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Password must be at least 8 characters'));
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('Email already in use'));
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(20).toString('hex');
    
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        emailVerified: false,
        verificationToken
      }
    });

    // Send verification email
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Verify your MoneyTrail account',
      text: `Click the link to verify your account: http://localhost:3000/auth/verify/${verificationToken}`,
      html: `
      <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MoneyTrail!</h2>
        <p>Thank you for signing up. Please verify your email to continue:</p>
        <a href="http://localhost:3000/auth/verify/${verificationToken}" 
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
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>http://localhost:3000/auth/verify/${verificationToken}</p>
      </div>
      `
    };
    await sgMail.send(msg);

    // Redirect with success message
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

    if (!email || !password) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Email and password are required'));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid credentials'));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid credentials'));
    }

    if (!user.emailVerified) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Please verify your email first'));
    }

    req.session.userId = user.id;
    return res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    return res.redirect('/auth/login?error=' + encodeURIComponent('Server error. Please try again.'));
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
        sameSite: 'lax'
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