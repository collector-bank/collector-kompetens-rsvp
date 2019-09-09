// Ref: https://azure.microsoft.com/sv-se/resources/samples/active-directory-node-webapp-openidconnect/

const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const db = require('./db');
const {isAdmin} = require('../utils/checkauth');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

const idpUrl = `https://login.microsoftonline.com/${process.env.TENANT_ID}/.well-known/openid-configuration`;
const issuer = `https://sts.windows.net/${process.env.TENANT_ID}/`;
const reidrectUrl = `https://${process.env.HOST}/auth/openid/return`

passport.use(new OIDCStrategy({
    identityMetadata: idpUrl,
    redirectUrl: reidrectUrl,
    clientID: process.env.CLIENT_ID,
    responseType: 'id_token', // for login only flows use id_token. For accessing resources use `id_token code`
    responseMode: 'form_post',
    clientSecret: process.env.CLIENT_ID,
    issuer: issuer,
    scope: ['email', 'profile'],
    loggingLevel: 'info'
  },
  function(iss, sub, profile, accessToken, refreshToken, done) {
  
    console.log("passport callback: ");
    console.log({
      iss, sub, profile, accessToken, refreshToken
    });
  
    if (!profile.oid) {
      return done(new Error("No oid found"), null);
    }
  
    process.nextTick(function () {
      db.findUserByOid(profile.oid, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          // "Auto-registration"
          var newUser = {
            oid: profile.oid,
            displayName: profile.displayName,
            email: profile.upn,
            isAdmin: isAdmin(profile.oid)
          }
          db.users.push(newUser);
          return done(null, newUser);
        }
        return done(null, user);
      });
    });
  }
));

/*
  ensureAuthenticated: function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/')
  },

        app.get('/account', this.ensureAuthenticated, function(req, res){
      res.render('account', { user: req.user });
    });
*/
module.exports = function(app) {

    app.get('/login',
      passport.authenticate('azuread-openidconnect', { failureRedirect: '/loginerror' }),
      function(req, res) {
        console.log('Login was called in the Sample');
        res.redirect('/');
    });

    // POST /auth/openid
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in OpenID authentication will involve redirecting
    //   the user to their OpenID provider.  After authenticating, the OpenID
    //   provider will redirect the user back to this application at
    //   /auth/openid/return
    app.get('/auth/openid',
      passport.authenticate('azuread-openidconnect', { failureRedirect: '/loginerror' }),
      function(req, res) {
        console.log('Authentication was called in the Sample');
        res.redirect('/');
      });

    // GET /auth/openid/return
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.get('/auth/openid/return',
      passport.authenticate('azuread-openidconnect', { failureRedirect: '/loginerror' }),
      function(req, res) {
        console.log('We received a return from AzureAD (get).');
        res.redirect('/');
      });

    // GET /auth/openid/return
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.post('/auth/openid/return',
      passport.authenticate('azuread-openidconnect', { failureRedirect: '/loginerror' }),
      function(req, res) {
        console.log('We received a return from AzureAD (post).');
        res.redirect('/');
      });

    app.get('/logout', function(req, res){
      req.logout();
      res.redirect('/');
    });  

    app.get('/loginerror', function(req, res){
      console.log("loginerror");
      res.send("Failed to login");
    });      
}