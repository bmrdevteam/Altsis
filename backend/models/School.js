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
    subjects: subjectSchema,
    formArchive: [],
    activatedSeason: mongoose.Types.ObjectId,
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
