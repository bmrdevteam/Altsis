import mongoose from "mongoose";
import { root } from "./root.js";
import { Academy } from "../../models/index.js";
import { logger } from "../../log/logger.js";

const getURL = (dbName) => {
  return `${process.env[
    "DB_URL"
  ].trim()}/${dbName}?retryWrites=true&w=majority`;
};

const conn = { root };
let isConnected = false;

if (process.env.NODE_ENV.trim() !== "test") {
  Academy.find({}, (err, academies) => {
    academies.forEach((academy) => {
      if (academy.academyId != "root") {
        conn[academy.academyId] = mongoose.createConnection(
          getURL(academy.dbName)
        );
      }
    });

    console.log("✅ MongoDB is connected");
    isConnected = true;
  }).select("+dbName");
}

const addConnection = (academy) => {
  conn[academy.academyId] = mongoose.createConnection(getURL(academy.dbName));

  console.log(
    `🌿 Connection is made: [${academy.academyId}(${academy.dbName})]`
  );
};

const deleteConnection = async (academyId) => {
  await conn[academyId].db.dropDatabase();
  delete conn[academyId];

  logger.info(`🍂 Connection is removed: [${academyId}]`);
};

export { conn, addConnection, deleteConnection, isConnected };
