const express = require('express');
const router = express.Router();

// Routes
router.get('/', (req, res) => {
    res.render('home', { title: "Home" });
});

router.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: "Dashboard" });
});

module.exports = router;