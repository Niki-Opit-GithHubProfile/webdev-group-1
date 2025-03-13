const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = {
  showHome: (req, res) => {
    // Render the home page if guest
    const title = 'Home';
    return res.render('home', { title });
  },

  showDashboard: (req, res) => {
    // Render the dashboard page if logged in
    const title = 'Home';
    return res.render('dashboard', { user: req.session.user , title });
  },

  registerUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user in DB
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          emailVerified: false
        }
      });

      // Send verification email
      const verificationURL = `http://localhost:3000/verify-email?email=${encodeURIComponent(user.email)}`;

      const msg = {
        to: user.email,
        from: process.env.SENDGRID_SENDER_EMAIL,
        subject: 'Verify your email',
        text: `Please verify your email by visiting: ${verificationURL}`,
        html: `<strong>Please verify by visiting: <a href="${verificationURL}">${verificationURL}</a></strong>`,
      };

      await sgMail.send(msg);

      return res.redirect('/');
    } catch (error) {
      console.error(error);
      return res.redirect('/');
    }
  },

  verifyEmail: async (req, res) => {
    try {
      const { email } = req.query;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && !user.emailVerified) {
        await prisma.user.update({
          where: { email },
          data: { emailVerified: true }
        });
      }
    } catch (error) {
      console.error(error);
    }
    return res.redirect('/');
  },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.redirect('/');

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return res.redirect('/');

      // Check if email is verified
      if (!user.emailVerified) {
        // If not, ask user to verify
        return res.send('Please verify your email before logging in.');
      }

      // Set user session
      req.session.user = { id: user.id, email: user.email };
      return res.redirect('/dashboard');
    } catch (error) {
      console.error(error);
      return res.redirect('/');
    }
  },

  logoutUser: (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error(err);
      res.clearCookie('connect.sid');
      return res.redirect('/');
    });
  }
};