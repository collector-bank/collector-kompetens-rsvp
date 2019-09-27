RSVP for Collector Kompetens Events
===================================

A simple web app for RSVP

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
Example of a ruleset.
```json
{
     "rules": [
          {
               "id": "5d8e2b93abe8268f25027d07",
               "match": {
                    "entity": "Event",
                    "state": "Open",
                    "eventType": "Lunch",
                    "dueInHours": 24
               },
               "actions": [
                    {
                         "type": "mailAdmins",
                         "args": {
                              "subject": "Warning: Event <%= event.title %> is still open",
                              "text": "Food will be automatically ordered in two hours for event <%= event.title %>"
                         }
                    }
               ]
          },
          {
               "id": "5d8e2baed8f59a82f105d61b",
               "match": {
                    "entity": "Event",
                    "state": "Open",
                    "eventType": "Lunch",
                    "dueInHours": 5
               },
               "actions": [
                    {
                         "type": "closeEvent"
                    },
                    {
                         "type": "mail",
                         "args": {
                              "subject": "Food for event ${event.title} thas is taking place tomorrow",
                              "text": "Many thanks!",
                              "to": [
                                   "test@test.com"
                              ],
                              "attachParticipantsList": true
                         }
                    }
               ]
          }
     ]
}
```

*Rule ids can be generated here https://observablehq.com/@hugodf/mongodb-objectid-generator*

Evaluate the ruleset using
```powershell
$ruleSet = ... # from above
Invoke-RestMethod -Uri https://hostname/api/automation/_eval -Method Post -Headers @{ "X-Api-Key" = "..." } -Body $ruleSet -ContentType "application/json"
```