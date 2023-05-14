import mongoose from "mongoose";
import { root } from "./root.js";

import { Academy } from "../models/index.js";

const getURL = (dbName) => {
  return `${process.env[
    "DB_URL"
  ].trim()}/${dbName}?retryWrites=true&w=majority`;
};

const conn = { root };

Academy.find({}, (err, academies) => {
  academies.forEach((academy) => {
    if (academy.academyId != "root") {
      conn[academy.academyId] = mongoose.createConnection(
        getURL(academy.dbName)
      );
    }
  });
}).select("+dbName");

const addConnection = (academy) => {
  conn[academy.academyId] = mongoose.createConnection(getURL(academy.dbName));
  console.log(
    `coonection to [${academy.academyId}(${academy.dbName})]is added`
  );
};

const deleteConnection = async (academyId) => {
  await conn[academyId].db.dropDatabase();
  delete conn[academyId];
  console.log(`coonection to [${academyId}]is deleted`);
};

export { conn, addConnection, deleteConnection };
