const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
// For sending verification emails
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY');

exports.registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).send('Missing email or password');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    // Hash password
    const hashedPass = await bcrypt.hash(password, 10);

    // Generate a token for email verification
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create user in DB
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPass,
        verified: false,
        verificationToken
      }
    });

    // Send verification email
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@example.com',
      subject: 'Verify your account',
      text: `Click the link to verify http://localhost:3000/auth/verify/${verificationToken}`,
      html: `<p>Click <a href="http://localhost:3000/auth/verify/${verificationToken}">here</a> to verify your account.</p>`
    };
    await sgMail.send(msg);

    // Once registered, you can either auto-login or redirect
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server error');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('Missing email or password');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).send('Invalid credentials');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Invalid credentials');
    }

    // Check if verified
    if (!user.verified) {
      return res.status(403).send('Please verify your email first.');
    }

    // Store user ID in session
    req.session.userId = user.id;

    // Redirect to dashboard
    return res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server error');
  }
};

exports.logoutUser = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
      }
      // Clear session cookie
      res.clearCookie('connect.sid');
      return res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server error');
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).send('Invalid verification token');
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verificationToken: '' }
    });

    return res.send('Email verified! You can now login.');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server error');
  }
};