let admins = process.env.ADMIN_USERS != null ? process.env.ADMIN_USERS.split(',') : [];

console.log("Admin users are " + admins)

module.exports = {
    ensureAuthenticated: function (req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.send(401);
    },
  
    isAdminUser: function(userEmail) {
      return admins.length == 0 ? true : admins.map((x) => x.toLowerCase()).includes(userEmail.toLowerCase());
    }
}