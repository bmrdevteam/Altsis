const mongoose = require("mongoose");
const root = require("./root");
const Academy = require("../models/Academy");

const getURL = (dbname) => {
  return `${process.env["DB_URL"]}/${dbname}?retryWrites=true&w=majority`;
};

const conn = { root: root };

Academy.find({}, (err, academies) => {
  academies.forEach((academy) => {
    if (academy.academyId != "root") {
      conn[academy.dbName] = mongoose.createConnection(getURL(academy.dbName));
    }
  });
  console.log(Object.keys(conn));
});

exports.addConnection = (dbName) => {
  conn[dbName] = mongoose.createConnection(getURL(dbName));
  console.log(`coonection to [${dbName}]is added`);
};

exports.deleteConnection = async (dbName) => {
  await conn[dbName].db.dropDatabase();
  delete conn[dbName];
  console.log("coonection is deleted");
};

exports.conn = conn;
