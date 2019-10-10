const express = require('express');
const app = express();
const ejs = require('ejs')
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const methodOverride = require('method-override');
const db = require('./server/db');
const events = require('./server/events');
const auth = require('./server/auth');
const asyncHandler = require('express-async-handler');
const { makeStdViewParams } = require('./utils/viewhelpers');
const { decorateEventWithQualifiedTimes } = require('./utils/datetimeutils');
const rules = require('./server/rules');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(methodOverride());
app.use(cookieParser());
app.use(expressSession({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: false, cookie: { maxAge: 1*60*60*1000 } }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

auth(app);

app.get('/', asyncHandler(async function(request, response) {  
    response.redirect('/events');
}));

app.get('/clientsettings/set', function(request, response) {  
  console.log("client settings " + request.params);
  response.cookie('clientsettings', request.params, { maxAge: 900000, httpOnly: true });
});

events(app);
rules(app);

const listener = app.listen(process.env.PORT, function() {
  console.log('App is listening on port' + listener.address().port);
});
