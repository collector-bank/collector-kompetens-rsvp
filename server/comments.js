const db = require('./db');
const {ensureAuthenticated,adminUsers} = require('../utils/checkauth');
const asyncHandler = require('express-async-handler');

module.exports = function(app) {

  app.post('/api/events/:eventId/comments', ensureAuthenticated, asyncHandler(async function(request, response) {
    let comment = { ...request.body, user: request.user.email, createdAt: new Date() };
    await db.addCommentToEvent(request.params.eventId, comment);
    response.redirect(request.query.route ? request.query.route : '/');
  }));

  app.get('/api/events/:eventId/comments/:commentId/_delete', ensureAuthenticated, asyncHandler(async function(request, response) {
    console.log("delete comment", request.params);
    await db.deleteCommentFromEvent(request.params.eventId, request.params.commentId, request.user);
    response.redirect(request.query.route ? request.query.route : '/');
  }));
}