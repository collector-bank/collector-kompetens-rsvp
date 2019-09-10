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
  2. git remove add azure `https://<webapp-name>.scm.azurewebsites.net:443/<webapp-name>.git`
  3. git push azure
