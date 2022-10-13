const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const TimeBlock = require("./TimeBlock");
const syllabus = require("./Syllabus");
//subdocument
var syllabusSchema = mongoose.Schema({}, { _id: false });

const enrollmentSchema = mongoose.Schema(
  {
    // syllabus data
    syllabus: String,
    schoolId: String,
    schoolName: String,
    year: String,
    term: String,
    userId: String,
    userName: String,
    classTitle: String,
    time: [TimeBlock],
    classroom: String,
    subject: [String],
    point: Number,
    limit: Number,
    info: Object,
    teachers: Object,
    // enrollment data
    studentId: String,
    studentName: String,
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
