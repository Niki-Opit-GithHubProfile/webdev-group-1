require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'PgSession'
    }),
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 * 4, // 1 month
    }
  })
);

// CSRF setup
const {
  doubleCsrfProtection,
  generateToken
} = doubleCsrf({
  getSecret: () => process.env.CSRF_KEY,
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token']
});

// CSRF token for all requests
app.use((req, res, next) => {
  res.locals.csrfToken = generateToken(req, res);
  next();
});


// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');

// Home route - Generate CSRF token
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  
  return res.render('home');
});

// Use CSRF protection for all POST requests
app.use(doubleCsrfProtection);

// Protected dashboard route
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  
  try {
    // Import PrismaClient at the top of your file if not already done
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Fetch the user data from the database
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { transactions: true }
    });
    
    if (!user) {
      req.session.destroy();
      return res.redirect('/');
    }
    
    return res.render('dashboard', { user });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).send('Server error');
  }
});

// Mount route handlers
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).send(err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});