RSVP for Collector Kompetens Events
===================================

A web app for managing educational events at Collector. 
[Demo app](https://collector-bank-collector-kompetens-rsvp.glitch.me)

Configuration
---------------
Expected environment variables are:

```
TENANT_ID=<azuread tenant id>
CLIENT_ID=<azuread app id>
CLIENT_SECRET=<azuread app secret>
SESSION_SECRET=<random string for session encryption>
DBUSERNAME=<user to cosmosdb/mongodb backend database>
DBPASSWORD=<password to cosmosdb/mongodb backend database>
HOST=<name of host such as collector-kompetenslunch-rsvp.glitch.me>
ADMIN_USERS=<a comma separated list of emails identifying admins. no spaces in the list!>
APIKEY=<apikey for automation rest calls>
SENDGRID_API_KEY=<sendgrid api key>
```

Azure Web App deploy
---------------------

Preconditions: 
  * Web app created
  * Backend database created and configured with username and password
  * Client app registered in azure ad
  * Client redirect-uri set to `https://<host name>/auth/openid/return`

Steps:
  1. git clone https://github.com/collector-bank/collector-kompetens-rsvp.git
  2. git remote add azure `https://<webapp-name>.scm.azurewebsites.net:443/<webapp-name>.git`
  3. git push azure

Rule configuration
------------------
Example rule 1.
```json
{
     "match": {
          "entity": "Event",
          "state": "Open",
          "eventType": "Lunch",
          "dueInHours": 24
     },
     "actions": [
          {
               "type": "sendMail",
               "args": {
                    "subject": "Heads up: Event <%= event.title %> is still open",
                    "text": "Automatic rules will close the event and order food in an hour or so, if the event remains open.",
                    "to": "[[[ADMINS]]]"
               }
          }
     ]
}
```

Example rule 2:
```json
{
     "match": {
          "entity": "Event",
          "state": "Open",
          "eventType": "Lunch",
          "dueInHours": 23
     },
     "actions": [
          {
               "type": "closeEvent"
          },
          {
               "type": "sendMail",
               "args": {
                    "subject": "Beställning av mat till morgondagens kompetenslunch (<%= event.title %>)",
                    "text": "Hej! Här kommer matbeställning. Tack för hjälpen! Mvh Kompetensgruppen",
                    "to": [ "$receptionMail" ],
                    "cc": "[[[ADMINS]]]",
                    "attachParticipantsList": true
               }
          }
     ]
}
```


Api calls:
```powershell
$hostname = "collector-bank-collector-kompetens-rsvp.glitch.me"
$apiKey = "..."

# Add a rule
Invoke-RestMethod `
   -Uri "https://$hostname/api/rules/" `
   -Method Post `
   -Headers @{ "X-Api-Key" = $apiKey } `
   -Body $rule `
   -ContentType "application/json; charset=utf-8"
   
# Get configured rules
Invoke-RestMethod `
     -Uri "https://$hostname/api/rules/" `
     -Method GET `
     -Headers @{ "X-Api-Key" = $apiKey }
       
# Evaluate rules       
Invoke-RestMethod `
       -Uri "https://$hostname/api/rules/_eval" `
       -Method GET `
       -Headers @{ "X-Api-Key" = $apiKey }
       
# Delete a rule
$id = ...
Invoke-RestMethod `
       -Uri "https://$hostname/api/rules/$id" `
       -Method DELETE `
       -Headers @{ "X-Api-Key" = $apiKey }       
```

v2
