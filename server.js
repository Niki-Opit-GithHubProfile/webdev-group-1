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
const isAuthenticated = require('./middlewares/isAuthenticated');
const app = express();
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: '*',
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
      tableName: 'PgSession',
      ttl: 60 * 60 * 24 * 30 // 30 days
    }),
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 1 month
      sameSite: 'lax'
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

// Temporary disable content security restrictions and allow loading resources from any domain
app.use((req, res, next) => {
  res.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';");
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const apiRoutes = require('./routes/api');

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
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).send(err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});