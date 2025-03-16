module.exports = function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    // If not logged in, redirect to '/' which renders home
    return res.redirect('/');
  }
  next();
};