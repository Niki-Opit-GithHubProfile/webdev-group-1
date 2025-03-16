require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { doubleCsrf } = require('csrf-csrf');

const {
  doubleCsrfProtection,
  generateToken
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'dev_csrf_secret',
  getSessionIdentifier: (req) => req.sessionID || '',
  cookieName: 'psifi.x-csrf-token',
  cookieOptions: {
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.body._csrf
});

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');

const app = express();
app.use(helmet());

// Session middleware
app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/your_db'
    }),
    secret: process.env.SESSION_SECRET || 'y0ur_sess_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60
    }
  })
);

app.use(cookieParser('cookie_parser_secret'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// If you want a specific route to just generate+return a token (optional)
app.get('/csrf-token', (req, res) => {
  const csrfToken = generateToken(req, res);
  return res.json({ csrfToken });
});

// Or generate a token right before rendering the home page:
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  // Generate a token and pass it to the EJS template
  const csrfToken = generateToken(req, res);
  return res.render('home', { csrfToken });
});

// Protect non-GET routes
app.use(doubleCsrfProtection);

// Example: protected dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  return res.render('dashboard');
});

// Other routes
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});