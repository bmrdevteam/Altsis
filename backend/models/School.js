import mongoose from "mongoose";
import { conn } from "../databases/connection.js";
// const validate = require("mongoose-validator");
import _ from "lodash";
import { validate } from "../utils/validate.js";

const subjectSchema = mongoose.Schema(
  {
    label: [String],
    data: Array,
  },
  { _id: false }
);

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
    classrooms: [String],
    subjects: { type: subjectSchema, default: { label: [], data: [] } },
    permissionSyllabus: [[]],
    permissionEnrollment: [[]],
    permissionEvaluation: [[]],
    formTimetable: Object,
    formSyllabus: Object,
    formEvaluation: [],
    formArchive: { type: [formArchiveSchema] },
    activatedSeason: mongoose.Types.ObjectId,
    links: { type: [LinkSchema] },
  },
  { timestamps: true }
);

schoolSchema.statics.isValid = function (school) {
  for (let field of ["schoolId", "schoolName"]) {
    if (!validate(field, school[field])) return false;
  }
  return true;
};

export const School = (dbName) => {
  return conn[dbName].model("School", schoolSchema);
};
