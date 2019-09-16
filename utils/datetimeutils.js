const moment = require('moment');

function makeDateTime(date, time, utcOffset = -120) {
  const parsedTime = moment(time, 'HH:mm').utcOffset(utcOffset)    
  return moment(date).set({ 'hour': parsedTime.get('hour'), 'minute': parsedTime.get('minute') });  
}

module.exports = {
  
  decorateEventWithQualifiedTimes: function(event) {
    return { 
      ...event, 
      qualifiedStartTime: makeDateTime(event.date, event.startTime), 
      qualifiedEndTime: makeDateTime(event.date, event.endTime) 
    }
  }
}
