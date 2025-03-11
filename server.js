const express = require('express');
const app = express();
// Import Modules
const path = require('path');
// Import Routes
const generalRoutes = require('./routes/general');

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes Setup
app.use('/', generalRoutes);

// Middleware Setup

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));