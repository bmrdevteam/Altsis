const mongoose = require("mongoose");
const config = require("../config/config");
const root = require("./root");
const Academy = require("../models/Academy");

const conn = { root: root };

Academy.find({}, (err, academies) => {
  academies.forEach((academy) => {
    if (academy.academyId != "root") {
      conn[academy.dbName] = mongoose.createConnection(
        config["url"](academy.dbName)
      );
    }
  });
  console.log(Object.keys(conn));
});

exports.addConnection = ({ dbName, newConn }) => {
  conn[dbName] = newConn;
  console.log(`coonection to [${dbName}]is added`);
};

exports.deleteConnection = (academyId) => {
  delete conn[academyId];
  console.log("coonection is deleted");
};

exports.conn = conn;
