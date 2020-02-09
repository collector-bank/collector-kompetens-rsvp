const db = require('./db');
const {ensureAuthenticated,adminUsers} = require('../utils/checkauth');
const asyncHandler = require('express-async-handler');
const sgMail = require('@sendgrid/mail');
const md = require('markdown-it')({
  breaks: true,
  linkify: true
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

module.exports = function(app) {

  app.post('/api/events/:eventId/comments', ensureAuthenticated, asyncHandler(async function(request, response) {
    let comment = { ...request.body, user: { name: request.user.displayName, email: request.user.email }, createdAt: new Date() };
    let event = await db.addCommentToEvent(request.params.eventId, comment);
    if (event == null) {
      response.sendStatus(500);
      return;
    }
    
    console.log("added comment", comment, event);
    
    if (process.env.NOTIFY_PARTICIPANTS_WHEN_COMMENT_ADDED === "1") 
    {
      let msgBody = md.renderInline(comment.message);
            
      let msg = {
        to: event.participants.map(participant => participant.email).concat(adminUsers).filter(onlyUnique).filter(email => email !== request.user.email),
        from: "no.reply.kompetensgruppen@collectorbank.se",
        subject: `Collector Kompetens: A new comment was added to the event ${event.title}`,
        text: `${comment.user.name} says\n\n${comment.message}\n\nLink to event: ${"https://" + process.env.HOST + "/events/" + event._id}">`,
        html: `<p>${comment.user.name} says</p><p>${msgBody}</p><a href="${"https://" + process.env.HOST + "/events/" + event._id}">Link to event</a>`
      };
      console.log("sending mail", msg);
      sgMail.sendMultiple(msg); 
      console.log("done sending mail");        
    }
    else
    {
      console.log("Email notifications disabled.", process.env.NOTIFY_PARTICIPANTS_WHEN_COMMENT_ADDED);
    }
    
    response.redirect(request.query.route ? request.query.route : '/');
  }));

  app.get('/api/events/:eventId/comments/:commentId/_delete', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("delete comment", request.params);
    await db.deleteCommentFromEvent(request.params.eventId, request.params.commentId, request.user);
    response.redirect(request.query.route ? request.query.route : '/');
  }));
}