function redirectIfAuthenticated(req, res, next) {
  
    if (req.isAuthenticated()) {
      return res.redirect('/'); 
    }
    next();
  }

module.exports = redirectIfAuthenticated