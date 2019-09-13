const dbdriver = require('./cosmosdb');

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
    
  getFutureEventsOrderedByDate: function() {
    return dbdriver.getFutureEventsOrderedByDate();
  },
  
  getEvent(eventId) {
    return dbdriver.getEvent(eventId);
  },
  
  addEvent(event) {
    dbdriver.addEvent(event);
  },
  
  updateEvent(eventId, event) {
    dbdriver.updateEvent(eventId, event);
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
  }
}