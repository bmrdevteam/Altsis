const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const validate = require("mongoose-validator");
const _ = require("lodash");

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
      minLength: 2,
      maxLength: 20,
      validate: validate({ validator: "isAlphanumeric" }),
    },
    schoolName: {
      type: String,
      minLength: 2,
      maxLength: 20,
    },
    classrooms: [String],
    subjects: subjectSchema,
    formArchive: String,
  },
  { timestamps: true }
);

module.exports = (dbName) => {
  return conn[dbName].model("School", schoolSchema);
};
