import mongoose from "mongoose";
import { conn } from "../_database/mongodb/connection.js";

const appsSchema = mongoose.Schema(
  {
    title: String,
    description: String,
  },
  { timestamps: true }
);

appsSchema.index(
  {
    title: 1,
  },
  { unique: true }
);

export const Apps = (dbName) => {
  return conn[dbName].model("Apps", appsSchema);
};
