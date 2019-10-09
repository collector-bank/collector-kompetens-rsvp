const db = require('./db');
const {ensureAuthenticated,adminUsers,ensureAuthenticatedApiCall} = require('../utils/checkauth');
const asyncHandler = require('express-async-handler');
const moment = require('moment');
const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const stringify = require('csv-stringify/lib/sync');
const { eventParticipantListAsExcel } = require('../utils/export');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function findMatches(match) {
  console.log("dueInHours="+match.dueInHours);
  const maxDate = moment().add(match.dueInHours, 'hours').toDate();
  const minDate = moment().toDate();
  console.log("minDate " + minDate.toISOString())	
  console.log("maxDate " + maxDate.toISOString())
  return db.findEvents(match.state, match.eventType, minDate, maxDate);
}

function processTemplate(messageTemplate, context){
  return messageTemplate;    
}

function sendMail(args, context) {
  console.log("sending mail: " + JSON.stringify(args));
  
  let msg = {
    to: args.to == "[[[ADMINS]]]" ? adminUsers : args.to,
    cc: args.cc == "[[[ADMINS]]]" ? adminUsers : args.cc,
    from: args.from || "no.reply.kompetensgruppen@collectorbank.se",
    subject: ejs.render(args.subject, { event: context }),
    text: ejs.render(args.text, { event: context })
  };
  
  if (args.attachParticipantsList && context.participants && context.participants.length > 0) {
    
    let data = eventParticipantListAsExcel(context); // stringify(context.participants);
    let buff = new Buffer(data);
    let base64data = buff.toString('base64');    
    msg.attachments = [
      {
        content: base64data,
        filename: 'participants-in-' + context.title.toLowerCase().replace(/\s/g,'-') + '.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  let alreadyApplied = rule.matches || [];
  const applied = matches.filter(match => !alreadyApplied.includes(match._id)).map(match => {
      rule.actions.forEach(action => {
        switch(action.type) {
          case 'sendMail': 
            sendMail(action.args, match);
            break;
          case 'closeEvent':
            db.updateEvent(match._id, { state: 'Closed' });
            break;
        }        
      });
    
      return match._id;
  });
  
  db.addRuleMatches(rule._id, applied);    
  return { ruleid: rule._id, entityIds: applied };
}

module.exports = function(app) {

  app.post('/api/rules/', ensureAuthenticatedApiCall, asyncHandler(async function(request, response) {
    await db.addRule(request.body);
    response.sendStatus(201);
  }));

  app.get('/api/rules/', ensureAuthenticatedApiCall, asyncHandler(async function(request, response) {
    let rules = await db.getRules();
    response.json(rules);
  }));

  app.delete('/api/rules/:ruleId', ensureAuthenticatedApiCall, asyncHandler(async function(request, response) {
    await db.deleteRule(request.params.ruleId);
    response.sendStatus(200);
  }));
  
  app.get('/api/rules/_eval', ensureAuthenticatedApiCall, asyncHandler(async function(request, response) {
    let rules = await db.getRules();
    let result = []
    for(let rule of rules)
    {
      const temp = await evalRule(rule);
      result.push(temp)
    }
    response.json(result);
  }));

}

