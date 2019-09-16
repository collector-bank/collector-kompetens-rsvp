module.exports = function(app) {

  

ical({
    domain: 'sebbo.net',
    prodId: '//superman-industries.com//ical-generator//EN',
    events: [
        {
            start: moment(),
            end: moment().add(1, 'hour'),
            timestamp: moment(),
            summary: 'My Event',
            organizer: 'Sebastian Pekarek <mail@example.com>'
        }
    ]
}).toString();
  
}