const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
// const validate = require("mongoose-validator");
const _ = require("lodash");
const validate = require("../utils/validate");

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
     * "viewAndEdit"
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

module.exports = (dbName) => {
  return conn[dbName].model("School", schoolSchema);
};
