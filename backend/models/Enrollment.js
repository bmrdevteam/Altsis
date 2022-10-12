const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const TimeBlock = require("./TimeBlock");

//subdocument
var syllabusSchema = mongoose.Schema(
  {
    _id: String,
    schoolId: String,
    schoolName: String,
    year: String,
    term: String,
    classTitle: String,
    time: [],
    point: Number,
    subject: Array,
  },
  { _id: false }
);

const enrollmentSchema = mongoose.Schema(
  {
    userId: String,
    userName: String,
    schoolId: String,
    year: String,
    term: String,
    syllabus: syllabusSchema,
    evaluation: Object,
  },
  { timestamps: true }
);

enrollmentSchema.methods.isTimeOverlapped = function (time) {
  for (let block1 of this.syllabus.time) {
    for (let block2 of time) {
      if (block1.isOverlapped(block2)) {
        return block1;
      }
    }
  }
  return null;
};

module.exports = (dbName) => {
  return conn[dbName].model("Enrollment", enrollmentSchema);
};
