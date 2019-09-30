module.exports = function(app) {
  
  const db = require('./db');
  const {ensureAuthenticated} = require('../utils/checkauth');
  const asyncHandler = require('express-async-handler');
  const { makeStdViewParams } = require('../utils/viewhelpers');
  const ical = require('ical-generator');
  const cal = ical();
  const moment = require('moment');
  const { decorateEventWithQualifiedTimes } = require('../utils/datetimeutils');
  const { sendEventParticipantListAsCsv, sendEventParticipantListAsExcel } = require('../utils/export');
  
  let mkLink = (link) => {
    if (link) {
      let [p1,p2] = link.split(',').map(x => x.trim())
      if (p2) {
        return { title: p1, href: p2 };
      } else  {
        return { title: p1, href: p1 };
      }
    } else {
      return null;
    }
  };
  
  //app.get('/api/events', asyncHandler(async function(request, response) {
  //  response.json(await db.getFutureEventsOrderedByDate());
  //}));

  app.post('/api/events', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("event created");

    console.log(request.body);
    
    await db.addEvent({
      ...request.body,
      link: mkLink(request.body.link),
      date: request.body.date,
      participants: []
    });

    response.redirect('/');
  }));

  app.post('/api/events/:eventId/_signup', ensureAuthenticated, asyncHandler(async function (request, response) {
    console.log("signup for event " + request.params.eventId);
    console.log(request.body);

    await db.addParticipantToEvent(request.params.eventId, request.body)
    response.redirect('/');
  }));

  app.get('/api/events/:eventId/_leave', ensureAuthenticated, asyncHandler(async function (request, response) {
    console.log("leave event " + request.params.eventId);
    console.log(request.user);
    console.log(request.query);
    
    await db.leaveEvent(request.params.eventId, request.user);
    response.redirect(request.query.route ? request.query.route : '/');
  }));

 app.get('/api/events/:eventId/_leaveguest/:guest', ensureAuthenticated, asyncHandler(async function (request, response) {
    console.log("leave event guest " + request.params.eventId + " " + request.params.guest);
    console.log(request.user);

    await db.leaveEventGuest(request.params.eventId, request.user, request.params.guest);
    response.redirect(request.query.route ? request.query.route : '/');
  }));
  
  app.post('/api/events/:eventId/_update', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("event update " + request.params.eventId);
    console.log(request.body);
    await db.updateEvent(request.params.eventId, {
      ...request.body, 
      link: mkLink(request.body.link)
    });
    response.redirect('/');
  }));  

  app.get('/api/events/:eventId/_delete', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("event delete " + request.params.eventId);
    await db.deleteEvent(request.params.eventId);
    response.redirect('/');
  }));  

  
  app.get('/eventdetails/:eventId', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("event details " + request.params.eventId);
    const event = await db.getEvent(request.params.eventId);
    console.log(event);
    response.render('eventdetails.ejs', { ...makeStdViewParams(request), event });
  }));
  
 app.get('/api/events/:eventId/_downloadparticipantscsv', ensureAuthenticated, asyncHandler(async function (request, response) {
    const event = await db.getEvent(request.params.eventId);
    sendEventParticipantListAsCsv(event, response);
 }));  

 app.get('/api/events/:eventId/_downloadparticipantsexcel', ensureAuthenticated, asyncHandler(async function (request, response) {
    const event = await db.getEvent(request.params.eventId);
    sendEventParticipantListAsExcel(event, response);
 }));  
  
  app.get('/api/events/:eventId/_ical', asyncHandler(async function(request, response) {
    const event = await db.getEvent(request.params.eventId);
    const eventEx = decorateEventWithQualifiedTimes(event);    
    
    const cal = ical({
        domain: request.headers.host,
        prodId: {company: 'collectorbank.se', product: 'kompetens-rsvp'},
        name: "Kompetens @ Collector",
        timezone: 'Europe/Stockholm',
//        method: 'request',
        events: [
            {
                start: eventEx.qualifiedStartTime,
                end: eventEx.qualifiedEndTime,
                timestamp: moment(),
                summary: event.title
            }
        ]      
    });
        
    cal.serve(response);
  }));
}