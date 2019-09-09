module.exports = {

    // app.get('/examplerout', ensureAuthenticated, function(req, res) {
    // ...
    // });
    ensureAuthenticated: function (req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.send(401);
    },
  
    isAdmin: function(oid) {
      return true; //oid == '26a373b0-4945-4c83-81fb-8e50548a9d37'
    }  
}