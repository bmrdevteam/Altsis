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

const formArchiveSchema = mongoose.Schema(
  {
    label: String,
    dataType: String, // "array" | "object"
    fields: [Object],
    authTeacher: { type: String, default: "undefined" },
    /*
     * "undefined"
     * "viewAndEditStudents"
     * "viewAndEditMyStudents"
     */
    authStudent: { type: String, default: "undefined" },
    /*
     * "undefined"
     * "view"
     */
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
    formArchive: { type: [formArchiveSchema] },
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
