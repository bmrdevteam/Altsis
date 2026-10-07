import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { conn } from "../../_database/mongodb/index.js";

export const EVAL_ACADEMY = "eval";

let server = null;
let connection = null;

export const startEvalMongo = async () => {
  if (connection) return connection;
  server = await MongoMemoryServer.create();
  connection = mongoose.createConnection(server.getUri(), { dbName: "alter-eval" });
  await connection.asPromise();
  conn[EVAL_ACADEMY] = connection;
  return connection;
};

export const stopEvalMongo = async () => {
  delete conn[EVAL_ACADEMY];
  if (connection) {
    await connection.close();
    connection = null;
  }
  if (server) {
    await server.stop();
    server = null;
  }
};
