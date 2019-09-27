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

module.exports = {
    
  getFutureEventsOrderedByDate: async function() {
    let db = await getEventsCollection();
    let now = new Date();      
    now.setHours(0,0,0,0)
    const findCondition = { $or: [{date: null}, {date: {$gte: now }}] } 
    let result =  db.find(findCondition).sort({ date: 1 }).toArray();   
    return result;
  },
  
  getEvent: async function(eventId) {
    let db = await getEventsCollection();
    let result = await db.findOne({ _id: ObjectID(eventId) });
    return result;
  },
  
  addEvent: async function(event) {    
    let db = await getEventsCollection();
    await db.insertOne({ ...event, date: new Date(event.date) } );
  },
  
  updateEvent: async function(eventId, event) {
    let db = await getEventsCollection();
    await db.updateOne({ _id: ObjectID(eventId) }, { $set:{...event, date: new Date(event.date) } });
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
  }  
}