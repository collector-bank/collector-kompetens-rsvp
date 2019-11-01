const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const url = `mongodb://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@${process.env.DBUSERNAME}.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`
const { isAdminUser } = require('../utils/checkauth');

const dbName = process.env.DBNAME != null ? process.env.DBNAME : 'rsvp';

let client;

async function getDb() { 
    // https://techsparx.com/nodejs/async/asynchronous-mongodb.html
    if (!client) client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    return { 
        db: client.db(dbName), 
        client: client
    };
}
      
async function getEventsCollection() {
  const { db } = await getDb();
  return db.collection('events'); 
}

async function getRulesCollection() {
  const { db } = await getDb();
  return db.collection('rules');   
}

module.exports = {

  findEvents: async function(state, eventType, minDate, maxDate) {
    let db = await getEventsCollection();
    const findCondition = { $and: [{qualifiedStartTime: {$gte: minDate}}, {qualifiedStartTime: {$lte: maxDate }}], state: state, eventType: eventType } 
    let result =  db.find(findCondition).toArray();   
    return result;  
  },
  
  getEventsOrderedByDate: async function(filter) {
    console.log("filter: " + JSON.stringify(filter));
    let db = await getEventsCollection();
    let condition = {};
    if (filter.future) {
      let now = new Date();      
      now.setHours(0,0,0,0)
      condition = { ...condition, $or: [{date: null}, {date: {$gte: now }}] }       
    }
    let result =  db.find(condition).sort({ date: 1 });
    if (filter.skip) {
      result.skip(filter.skip);
    }
    if (filter.limit) {
      result.limit(filter.limit);
    }
    return result.toArray();
  },
  
  getEvent: async function(eventId) {
    let db = await getEventsCollection();
    let result = await db.findOne({ _id: ObjectID(eventId) });
    return result;
  },
  
  addEvent: async function(event) {    
    let db = await getEventsCollection();
    await db.insertOne(event);
  },
  
  updateEvent: async function(eventId, event) {
    let db = await getEventsCollection();
    await db.updateOne({ _id: ObjectID(eventId) }, { $set: event });
  },
 
  deleteEvent: async function(eventId) {
    let db = await getEventsCollection();
    await db.deleteOne({ _id: ObjectID(eventId) });
  },
  
  addParticipantToEvent: async function(eventId, participantIn) {
    let db = await getEventsCollection();
    let event = await db.findOne({ _id: ObjectID(eventId)});
    let participant = { ...participantIn, email: participantIn.email.toLowerCase() }
    if (event.participants.length < event.maxParticipants)  
    {
      await db
        .updateOne(
          { _id: ObjectID(eventId)
          , state: "Open"
          , 'participants.email': {$ne: participant.email }
          , 'participants': {$size: event.participants.length}  // cosmosdb mongodb interface does not support 'participants': {$size: {$lt: "$maxParticipants"}} so this is a poor mans solution
          }, 
          { $push: { participants: participant } } );      
    }
  },
  
  leaveEvent: async function(eventId, user) {      
    let db = await getEventsCollection();
    let condition = { _id: ObjectID(eventId), state: "Open" }
    await db.updateOne(condition, { $pull: { participants: { email: user.email} } } );
  },

  leaveEventGuest: async function(eventId, user, guestEmail) {      
    let db = await getEventsCollection();
    let condition = { _id: ObjectID(eventId), state: "Open" }
    if (!isAdminUser(user.email)) {
      condition['participants.guestTo'] = user.email.toLowerCase()
    }
    await db.updateOne(condition, { $pull: { participants: { email: guestEmail.toLowerCase()} } } );
  },
  
  addRule: async function(rule) {
    console.log("adding rule " + rule);
    let db = await getRulesCollection();
    db.insertOne(rule);
  },

  getRules: async function() {
    let db = await getRulesCollection();
    return await db.find().toArray();
  },
  
  getRuleById: async function(ruleId) {
    let db = await getRulesCollection();
    let rule = await db.findOne({ _id: ObjectID(ruleId) });
    return rule;
  },

  deleteRule: async function(ruleId) {
    let db = await getRulesCollection();
    await db.deleteOne({ _id: ObjectID(ruleId) });
  },
  
  addRuleMatches: async function(ruleId, entityIds) {
    let db = await getRulesCollection();
    await db.updateOne({ _id: ObjectID(ruleId) }, { $addToSet: { matches: {$each: entityIds} } } );
  },
  
  addReviewToEvent: async function(eventId, reviewIn) {
    let db = await getEventsCollection();
    let event = await db.findOne({ _id: ObjectID(eventId)});
    let review = { ...reviewIn };
    
    await db
      .updateOne(
        { _id: ObjectID(eventId) }, 
        { $push: { reviews: review } }
      );      
  }  
}