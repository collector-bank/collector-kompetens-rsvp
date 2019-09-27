const moment = require('moment');

function makeDateTime(date, time) {
  // we can sefaely assume that the date and time is swedish time, so lets define that 
  const parsedTime = moment(time, 'HH:mm') 
  return moment.tz(date, "Europe/Stockholm").set({ 'hour': parsedTime.get('hour'), 'minute': parsedTime.get('minute') }).toDate();  
}

module.exports = {
  
  decorateEventWithQualifiedTimes: function(event) {
    if (event.date) {
      var date = new Date(event.date);    
      return { 
        ...event, 
        date,
        qualifiedStartTime: makeDateTime(date, event.startTime), 
        qualifiedEndTime: makeDateTime(date, event.endTime) 
      }      
    } else {
      return event;
    }
  }
  
}
