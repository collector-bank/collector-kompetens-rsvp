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
  
  app.get('/events', asyncHandler(async function(request, response) {  
    const allEvents = request.query.all == 'true';
    const page = request.query.page ? parseInt(request.query.page) : 1  ;
    const pageSize = request.query.pageSize ? parseInt(request.query.pageSize) : 10;
    const skip = pageSize * (page - 1)
    let events = await db.getEventsOrderedByDate({ skip: skip, limit: pageSize+1, future: !allEvents});  // read one more event than we actually need to so that we know if we reached the end
    let pagination = { isFirstPage: page == 1, isLastPage: events.length <= pageSize }
    pagination.isOnlyPage = pagination.isFirstPage && pagination.isLastPage;
    if (!pagination.isFirstPage) {
      pagination.prevLink = `/events?page=${page - 1}&pageSize=${pageSize}&all=${allEvents ? 'true' : 'false' }`
    }
    if (!pagination.isLastPage) {
      pagination.nextLink = `/events?page=${page + 1}&pageSize=${pageSize}&all=${allEvents ? 'true' : 'false' }`
    }    
    if (!pagination.isLastPage) {
      events.pop(); // skip the superfluous last event
    }
    response.render('events.ejs', { ...makeStdViewParams(request), events, pagination });
  }));

  app.get('/events/:eventId', asyncHandler(async function(request, response) {
    console.log("event details " + request.params.eventId);
    const event = await db.getEvent(request.params.eventId);
    console.log(event);
    response.render('eventdetails.ejs', { ...makeStdViewParams(request), event });
  }));
  
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
    response.redirect(request.query.route ? request.query.route : '/');
  }));

  app.get('/api/events/:eventId/_leave', ensureAuthenticated, asyncHandler(async function (request, response) {
    console.log("leave event: " + request.params.eventId);
    console.log("user: " + request.user);    
    console.log("query: " + request.query);
    
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
    response.redirect(request.query.route ? request.query.route : '/');
  }));  

  app.get('/api/events/:eventId/_delete', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("event delete " + request.params.eventId);
    await db.deleteEvent(request.params.eventId);
    response.redirect('/');
  }));  
  
 app.get('/api/events/:eventId/_downloadparticipantscsv', ensureAuthenticated, asyncHandler(async function (request, response) {
    const event = await db.getEvent(request.params.eventId);
    sendEventParticipantListAsCsv(event, response);
 }));  

 app.get('/api/events/:eventId/_downloadparticipantsexcel', ensureAuthenticated, asyncHandler(async function (request, response) {
    const event = await db.getEvent(request.params.eventId);
    sendEventParticipantListAsExcel(event, response);
 }));  
  
  app.get('/api/events/:eventId/_ical', ensureAuthenticated, asyncHandler(async function(request, response) {
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
  
  app.post('/api/events/:eventId/_addreview', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("addreview");
    console.log("body:" + request.body);
    await db.addReviewToEvent(request.params.eventId, { ...request.body, rate: parseInt(request.body.rate) });
    response.redirect(request.query.route ? request.query.route : '/');
  }));
  
}