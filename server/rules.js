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
  const maxDate = moment().add(match.dueInHours, 'hours').toDate();
  const minDate = moment().toDate();
  return db.findEvents(match.state, match.eventType, minDate, maxDate);
}

function processTemplate(messageTemplate, context){
  return messageTemplate;    
}

function sendMail(margs, context) {
  console.log("sending mail: ", margs, context);
  
  let msg = {
    to: margs.to == "[[[ADMINS]]]" ? adminUsers : margs.to,
    cc: margs.cc == "[[[ADMINS]]]" ? adminUsers : margs.cc,
    from: margs.from || "no.reply.kompetensgruppen@collectorbank.se",
    subject: ejs.render(margs.subject, { event: context }),
    text: ejs.render(margs.text, { event: context })
  };
  
  if (margs.attachParticipantsList && context.participants && context.participants.length > 0) {
    
    let data = eventParticipantListAsExcel(context); // stringify(context.participants);
    let buff = new Buffer(data);
    let base64data = buff.toString('base64');    
    let filename = 'participants-in-' + context.title.toLowerCase().replace(/[^a-zA-Z]/g,'-') + '.xlsx';
    console.log("filename=" + filename);
    msg.attachments = [
      {
        content: base64data,
        filename: filename,
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
  let alreadyApplied = (rule.matches || []).map(x => x.toString());  // objectid does not work with ==, use toString to remedy this
  const applied = matches.filter(match => !alreadyApplied.includes(match._id.toString())).map(match => {
      rule.actions.forEach(action => {
        console.log('executing action of type ' + action.type);
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
    console.log("eval rules");
    let rules = await db.getRules();
    let result = []
    for(let rule of rules)
    {
      const temp = await evalRule(rule);
      result.push(temp)
    }
    response.json(result);
  }));

  /*
$hostname = "collector-bank-collector-kompetens-rsvp.glitch.me"
$apiKey = "..."
$sendTo = "..."

$sendMailArgs = @{
  to = $sendTo
  subject = "test subject"
  text = "test body"
} | ConvertTo-Json

Invoke-RestMethod `
   -Uri "https://$hostname/api/test/sendmail" `
   -Method Post `
   -Headers @{ "X-Api-Key" = $apiKey } `
   -Body $sendMailArgs `
   -ContentType "application/json; charset=utf-8"  
  */
  app.post('/api/test/sendmail', ensureAuthenticatedApiCall, asyncHandler(async function(request, response) {
    console.log(request.body);
    try {
      sendMail(request.body);
      response.sendStatus(200);      
    } 
    catch(err) {
      console.log(err);
      response.send(err.toString());
    }
  }));
}

