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

    const text = "✅ MongoDB is connected";
    console.log(text);
    logger.info(text);
    isConnected = true;
  }).select("+dbName");
}

const addConnection = (academy) => {
  conn[academy.academyId] = mongoose.createConnection(getURL(academy.dbName));

  const text = `🌿 Connection is made: [${academy.academyId}(${academy.dbName})]`;
  console.log(text);
  logger.info(text);
};

const deleteConnection = async (academyId) => {
  await conn[academyId].db.dropDatabase();
  delete conn[academyId];

  const text = `🍂 Connection is removed: [${academyId}]`;
  console.log(text);
  logger.info(text);
};

export { conn, addConnection, deleteConnection, isConnected };
