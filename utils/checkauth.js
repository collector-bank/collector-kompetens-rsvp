let admins = process.env.ADMIN_USERS != null ? process.env.ADMIN_USERS.split(',') : [];

console.log("Admin users are " + admins)

module.exports = {
    ensureAuthenticated: function (req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.send(401);
    },
  
    isAdmin: function(oid) {
      return admins.length == 0 ? true : admins.includes(oid);
    },

  /*
    ensureAuthenticatedAndAdmin: function (req, res, next) {
      if (req.isAuthenticated() && this.isAdmin(req.user.oid)) { return next(); }
      res.send(401);
    }*/
}