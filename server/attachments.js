const { ensureAuthenticated } = require("../utils/checkauth");
const asyncHandler = require("express-async-handler");
const db = require("./db");
const multer = require("multer");
const ObjectID = require("mongodb").ObjectID;
const MongoClient = require("mongodb").MongoClient;

const dbName = process.env.DBNAME != null ? process.env.DBNAME : "rsvp";
const url = `mongodb://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@${process.env.DBUSERNAME}.documents.azure.com:10255/${dbName}?ssl=true&replicaSet=globaldb`;

const storage = require("multer-gridfs-storage")({
  url: url,
  file: (req, file) => {
    return {
      bucketName: "attachments", //Setting collection name, default name is fs
      filename: file.originalname //Setting file name to original name of file
    };
  }
});

// Set multer storage engine to the newly created object
const upload = multer({ storage: storage });

let client;

async function getDb() {
  // https://techsparx.com/nodejs/async/asynchronous-mongodb.html
  if (!client)
    client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  return {
    db: client.db(dbName),
    client: client
  };
}

async function getEventsCollection() {
  const { db } = await getDb();
  return db.collection("events");
}

async function getAttachmentsCollections() {
  const { db } = await getDb();
  return {
    files: db.collection("attachments.files"),
    chunks: db.collection("attachments.chunks")
  };
}

async function addAttachments(eventId, files) {
  console.log("addAttachments : " + files);
  let db = await getEventsCollection();
  await db.updateOne(
    { _id: ObjectID(eventId) },
    { $push: { attachments: { $each: files } } }
  );
}

async function removeAttachment(eventId, fileId) {
  let db = await getEventsCollection();
  await db.updateOne(
    { _id: ObjectID(eventId) },
    { $pull: { attachments: { id: ObjectID(fileId) } } }
  );
}

module.exports = function(app) {
  app.post(
    "/api/events/:eventId/attachments",
    [ensureAuthenticated, upload.array("attachments")],
    asyncHandler(async function(request, response) {
      console.log("event update " + request.params.eventId);
      console.log(request.body);
      console.log("num files : " + request.files.length);
      console.log("files=" + JSON.stringify(request.files));
      await addAttachments(request.params.eventId, request.files);        
      response.redirect(request.query.route ? request.query.route : "/");
    })
  );

  app.get(
    "/api/events/:eventId/attachments/:attachmentId",
    [ensureAuthenticated, upload.array("attachments")],
    asyncHandler(async function(request, response) {
      const { files, chunks } = await getAttachmentsCollections();
      const attachments = await files
        .find({ _id: ObjectID(request.params.attachmentId) })
        .toArray();
      if (attachments.length == 0) {
        response
          .status(404)
          .send("Could not find attachment " + request.params.attachmentId);
        return;
      }

      const attachment = attachments[0];
      console.log("attachment = " + JSON.stringify(attachment));

      response.writeHead(200, {
        "Content-Type": attachment.contentType,
        "Content-Disposition":
          'attachment; filename="' + attachment.filename + '"'
      });

      const attachmentChunks = await chunks
        .find({ files_id: attachment._id })
        .sort({ n: 1 })
        .toArray();
      console.log("num chunks " + attachmentChunks.length);
      let fileData = [];
      for (let i = 0; i < attachmentChunks.length; i++) {
        //This is in Binary JSON or BSON format, which is stored
        //in fileData array in base64 endocoded string format
        fileData.push(attachmentChunks[i].data.toString("base64"));
      }

      response.end(fileData.join(), "base64");
    })
  );

  app.get(
    "/api/events/:eventId/attachments/:attachmentId/_delete",
    ensureAuthenticated,
    asyncHandler(async function(request, response) {
      const eventId = request.params.eventId;
      const attachmentId = request.params.attachmentId;
      console.log("removing attachment " + attachmentId);
      const { files, chunks } = await getAttachmentsCollections();
      
      await files.deleteOne({ _id: ObjectID(attachmentId) });
      await chunks.deleteMany({ files_id: ObjectID(attachmentId) });      
      removeAttachment(eventId, attachmentId);      
      
      response.redirect(request.query.route ? request.query.route : "/");
    })
  );
};
