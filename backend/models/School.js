import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
// const validate = require("mongoose-validator");
import _ from "lodash";
import { validate } from "../utils/validate.js";

const LinkSchema = mongoose.Schema(
  {
    url: String,
    title: String,
  },
  { _id: false }
);

const formArchiveFieldSchema = mongoose.Schema(
  {
    label: String,
    type: {
      type: String,
      enum: ["select", "input", "input-number", "file", "file-image"],
      default: "input",
    },
    options: [String],
    runningTotal: {
      type: Boolean,
      default: false,
    },
    total: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const formArchiveItemSchema = mongoose.Schema(
  {
    label: String,
    dataType: { type: String, enum: ["array", "object"], default: "array" },
    fields: [formArchiveFieldSchema],
    authTeacher: {
      type: String,
      enum: ["undefined", "viewAndEditStudents", "viewAndEditMyStudents"],
      default: "undefined",
    },
    authStudent: {
      type: String,
      eunum: ["undefined", "view"],
      default: "undefined",
    },
  },
  { _id: false }
);

const schoolSchema = mongoose.Schema(
  {
    schoolId: {
      type: String,
      unique: true,
      validate: (val) => validate("schoolId", val),
    },
    schoolName: {
      type: String,
      validate: (val) => validate("schoolName", val),
    },
    formArchive: { type: [formArchiveItemSchema] },
    activatedSeason: mongoose.Types.ObjectId,
    links: { type: [LinkSchema] },
    calendar: String,
    calendarTimetable: String,
  },
  { timestamps: true }
);

export const School = (dbName) => {
  return conn[dbName].model("School", schoolSchema);
};
