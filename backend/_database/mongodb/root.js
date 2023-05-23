import mongoose from "mongoose";

const root = mongoose.createConnection(
  `${process.env["DB_URL"].trim()}/root?retryWrites=true&w=majority`
);

export { root };
