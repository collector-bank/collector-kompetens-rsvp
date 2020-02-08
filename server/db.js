const dbdriver = require('./cosmosdb');
const { decorateEventWithQualifiedTimes } = require('../utils/datetimeutils');

module.exports = {
  /*
  events: [
    {
       id: 1,
       title: "Defence in depth",
       description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
       tag: "security",
       link: { title: "Video", href: "https://www.youtube.com/watch?v=CPyhYF--GCw" },
       date: moment("2019-09-30"),
       contact: "Tobias Ahnoff",
       participants: [],    
       maxParticipants: 30
    }
  ],  
  
  */
  users: [],
  
  findUserByOid: function(upn, fn) {
    for (var i = 0, len = this.users.length; i < len; i++) {
      var user = this.users[i];
      console.log('we are using user: ', user);
      if (user.oid === upn) {
        return fn(null, user);
      }
    }
    return fn(null, null);
  },
    
  findEvents: function(state, eventType, minDate, maxDate) {
    return dbdriver.findEvents(state, eventType, minDate, maxDate);
  },
  
  getEventsOrderedByDate: function(filter) {
    return dbdriver.getEventsOrderedByDate(filter);
  },
  
  getEvent(eventId) {
    return dbdriver.getEvent(eventId);
  },
  
  addEvent(event) {
    const now = new Date();
    dbdriver.addEvent({...decorateEventWithQualifiedTimes(event), createdAt: now, lastModified: now });
  },
  
  updateEvent(eventId, event) {
    const now = new Date();
    dbdriver.updateEvent(eventId, {...decorateEventWithQualifiedTimes(event), lastModified: now });
  },
 
  deleteEvent(eventId) {
    dbdriver.deleteEvent(eventId);
  },
  
  addParticipantToEvent(eventId, participant) {
    dbdriver.addParticipantToEvent(eventId, participant);      
  },
  
  leaveEvent(eventId, user) {      
    dbdriver.leaveEvent(eventId, user);      
  },
  
  leaveEventGuest(eventId, user, guestEmail) {
    dbdriver.leaveEventGuest(eventId, user, guestEmail);          
  },
  
  addRule(rule) {
    return dbdriver.addRule(rule);
  },
  
  getRules() {
    return dbdriver.getRules()
  },
  
  getRuleById(ruleId) {
    return dbdriver.getRuleById(ruleId);    
  },
  
  addRuleMatches(ruleId, entityIds) {
    dbdriver.addRuleMatches(ruleId, entityIds);      
  },
  
  deleteRule(ruleId) {
    dbdriver.deleteRule(ruleId);      
  },
  
  addReviewToEvent(eventId, review) {
    dbdriver.addReviewToEvent(eventId, review);      
  },
  
  addCommentToEvent(eventId, comment) {
    return dbdriver.addCommentToEvent(eventId, comment);
  },
  
  deleteCommentFromEvent(eventId, commentId, user) {
    dbdriver.deleteCommentFromEvent(eventId, commentId, user);
  }
}