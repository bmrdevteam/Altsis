import { existsSync } from "fs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { conn } from "../../_database/mongodb/index.js";

/** This VM already cached a mongod binary. Other machines download one. */
const CACHED_BINARY =
  "/home/ubuntu/local-mongo/node_modules/.cache/mongodb-memory-server/mongod-x64-ubuntu-7.0.24";

export const EVAL_ACADEMY = "eval";

let server = null;
let connection = null;

export const startEvalMongo = async () => {
  if (connection) return connection;
  if (!process.env.MONGOMS_SYSTEM_BINARY && existsSync(CACHED_BINARY)) {
    process.env.MONGOMS_SYSTEM_BINARY = CACHED_BINARY;
  }
  server = await MongoMemoryServer.create({ binary: { version: "7.0.24" } });
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
