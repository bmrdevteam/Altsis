const mongoose = require("mongoose");
const root = require("./root");
const Academy = require("../models/Academy");

const getURL = (dbName) => {
  return `${process.env[
    "DB_URL"
  ].trim()}/${dbName}?retryWrites=true&w=majority`;
};

const conn = { root: root };

Academy.find({}, (err, academies) => {
  academies.forEach((academy) => {
    if (academy.academyId != "root") {
      conn[academy.academyId] = mongoose.createConnection(
        getURL(academy.dbName)
      );
    }
  });
  console.log(Object.keys(conn));
});

exports.addConnection = (academyId, dbName) => {
  conn[academyId] = mongoose.createConnection(getURL(dbName));
  console.log(`coonection to [${academyId}(${dbName})]is added`);
};

exports.deleteConnection = async (academyId) => {
  await conn[academyId].db.dropDatabase();
  delete conn[academyId];
  console.log(`coonection to [${academyId}]is deleted`);
};

exports.conn = conn;
