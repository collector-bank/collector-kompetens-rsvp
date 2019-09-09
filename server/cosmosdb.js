const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const url = `mongodb://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@${process.env.DBUSERNAME}.documents.azure.com:10255/?ssl=true&replicaSet=globaldb`

function getDbClient() {
  return MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
}
module.exports = {
    
  getFutureEventsOrderedByDate: async function() {
    let client = await getDbClient();
    let now = new Date();      
    const findCondition = { $or: [{date: null}, {date: {$gte: new Date()}}] } 
    let result =  await client.db("rsvp").collection("events").find(findCondition).sort({ date: 1 }).toArray();   
    client.close();
    return result;
  },
  
  getEvent: async function(eventId) {
    let client = await getDbClient();
    let result = await client.db("rsvp").collection("events").findOne({ _id: ObjectID(eventId) });
    client.close();
    return result;
  },
  
  addEvent: async function(event) {    
    let client = await getDbClient();
    await client.db("rsvp").collection("events").insertOne({ ...event, date: event.date ? new Date(event.date) : null } );
    client.close();
  },
  
  updateEvent: async function(eventId, event) {
    console.log("updatEvent " + JSON.stringify(event));
    let client = await getDbClient();
    await client.db("rsvp").collection("events").updateOne({ _id: ObjectID(eventId) }, { $set:{...event, date: event.date ? new Date(event.date) : null } });
    client.close(); 
  },
 
  deleteEvent: async function(eventId) {
    console.log("deleteEvent " + eventId);
    let client = await getDbClient();
    await client.db("rsvp").collection("events").deleteOne({ _id: ObjectID(eventId) });
    client.close(); 
  },
  
  addParticipantToEvent: async function(eventId, participant) {
    let client = await getDbClient();  
    await client.db("rsvp").collection("events").updateOne({ _id: ObjectID(eventId), 'participants.email': {$ne: participant.email} }, { $push: { participants: participant } } );
    client.close();
  },
  
  leaveEvent: async function(eventId, user) {      
    console.log("leave event" + JSON.stringify(user) + " " + eventId)
    let client = await getDbClient();  
    await client.db("rsvp").collection("events").updateOne({ _id: ObjectID(eventId) }, { $pull: { participants: { email: user.email} } } );
    client.close();
  }  

}