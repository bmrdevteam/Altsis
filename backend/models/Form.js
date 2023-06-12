import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const formSchema = mongoose.Schema(
  {
    userId: String,
    userName: String,
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Array,
    },
  },
  { timestamps: true }
);

// formSchema.index(
//   {
//     type: 1,
//     title: 1,
//   },
//   { unique: true }
// );

export const Form = (dbName) => {
  return conn[dbName].model("Form", formSchema);
};
