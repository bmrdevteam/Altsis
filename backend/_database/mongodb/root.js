import mongoose from "mongoose";

let root = undefined;

if (process.env.NODE_ENV.trim() !== "test") {
  root = mongoose.createConnection(
    `${process.env["DB_URL"].trim()}/root?retryWrites=true&w=majority`
  );
}

export { root };
