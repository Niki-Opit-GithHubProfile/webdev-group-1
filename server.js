require("./instrument.js");
require('dotenv').config();
const Sentry = require("@sentry/node");
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
const passport = require('passport');
const passportService = require('./services/passportService');
const app = express();
app.set('trust proxy', 1);
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://moneytrail.it'
    : 'http://localhost:3000',
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? 'moneytrail.it' : undefined
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CSRF setup
const {
  doubleCsrfProtection,
  generateToken
} = doubleCsrf({
  getSecret: () => process.env.CSRF_KEY,
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.NODE_ENV === 'production' ? 'moneytrail.it' : undefined,
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

// Use CSRF protection for all POST requests
app.use(doubleCsrfProtection);

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
const portfolioRoutes = require('./routes/portfolio');
const assetRoutes = require('./routes/asset');
const onboardingRoutes = require('./routes/onboarding');
const depositRoutes = require('./routes/deposit');
const withdrawalRoutes = require('./routes/withdrawal');
const quickConverterRoutes = require('./routes/quickConverter');

// Home route - Generate CSRF token
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  
  return res.render('home');
});

app.use((req, res, next) => {
  console.log('Session debug:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    isLoggedIn: req.session?.isLoggedIn,
    cookies: req.cookies,
  });
  next();
});

// Performance monitoring middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Protected dashboard route
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  
  try {
    // Updated to include portfolio with holdings
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { 
        transactions: {
          include: {
            pair: {
              include: {
                base: true,
                quote: true
              }
            }
          }
        },
        portfolio: {
          include: {
            holdings: {
              include: {
                asset: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      req.session.destroy();
      return res.redirect('/');
    }
    
    // Check for onboarding completion message
    const onboardingComplete = req.session.onboardingComplete;
    
    // Clear the flag after use
    if (onboardingComplete) {
      req.session.onboardingComplete = null;
    }
    
    return res.render('dashboard', { 
      user,
      onboardingComplete
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).send('Server error');
  }
});

// Mount route handlers
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/deposits', depositRoutes);
app.use('/withdrawals', withdrawalRoutes);
app.use('/api', apiRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/assets', assetRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/quickConverter', quickConverterRoutes);

// Sentry error tracking
Sentry.setupExpressErrorHandler(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).send(err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});