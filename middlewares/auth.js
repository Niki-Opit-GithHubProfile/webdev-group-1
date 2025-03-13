module.exports = {
    ensureAuthenticated: (req, res, next) => {
      if (req.session && req.session.user) {
        return next();
      } else {
        // If not authenticated, show home
        return res.redirect('/');
      }
    },
  
    ensureGuest: (req, res, next) => {
      if (req.session && req.session.user) {
        // If already authenticated, go to dashboard
        return res.redirect('/dashboard');
      } else {
        return next();
      }
    }
  };