const db = require('./db');
const {ensureAuthenticated,adminUsers,ensureAuthenticatedApiCall} = require('../utils/checkauth');
const asyncHandler = require('express-async-handler');
const moment = require('moment');
const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const stringify = require('csv-stringify/lib/sync');
const { decorateEventWithQualifiedTimes } = require('../utils/datetimeutils');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function findMatches(match) {
  const maxDate = moment().add(match.dueInHours, 'hours').toDate();
  const minDate = moment().toDate();
  //console.log("minDate " + minDate.toISOString())
  //console.log("maxDate " + maxDate.toISOString())
  return db.findEvents(match.state, match.eventType, minDate, maxDate);
}

function processTemplate(messageTemplate, context){
  return messageTemplate;    
}

function sendMail(args, context) {
  console.log("sending mail: " + JSON.stringify(args));
  
  let msg = {
    to: args.to[0],
    from: "no.reply.kompetensgruppen@collectorbank.se",
    subject: ejs.render(args.subject, { event: context }),
    text: ejs.render(args.text, { event: context })
  };
  
  if (args.attachParticipantsList) {
    
    let data = stringify(context.participants);
    let buff = new Buffer(data);
    let base64data = buff.toString('base64');    
    msg.attachments = [
      {
        content: base64data,
        filename: 'participants.csv',
        type: 'text/csv',
        disposition: 'attachment',
        contentId: 'participants-' + context._id 
      }
    ]    
  }
  
  console.log("msg=" + JSON.stringify(msg));
  sgMail.send(msg);  
}

async function evalRule(rule) {  
  const matches = await findMatches(rule.match);
  let alreadyApplied = (await db.getRuleMatches(rule.id)).map(x => x.toString());
  const applied = matches.filter(match => !alreadyApplied.includes(match._id.toString())).map(matchIn => {
      let match = decorateEventWithQualifiedTimes(matchIn);
      rule.actions.forEach(action => {
        switch(action.type) {
          case 'mailAdmins':
            sendMail({ ...action.args, to:adminUsers}, match);
            break;
          case 'mail': 
            sendMail(action.args, match);
            break;
          case 'closeEvent':
            db.updateEvent(match._id, { 'state': 'Closed' });
            break;
        }        
      });
    
      return match._id;
  });
  
  db.addRuleMatches(rule.id, applied);    
  return { ruleid: rule.id, entityIds: applied };
}

module.exports = function(app) {

  app.post('/api/automation/_eval', ensureAuthenticatedApiCall, asyncHandler(async function(request, response) {
    let result = []
    for(let rule of request.body.rules)
    {
      const temp = await evalRule(rule);
      result.push(temp)
    }
    response.json(result);
  }));

}

