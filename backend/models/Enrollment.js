const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const encrypt = require("mongoose-encryption");

const enrollmentSchema = mongoose.Schema(
  {
    // syllabus data
    syllabus: { type: mongoose.Types.ObjectId, required: true },
    season: mongoose.Types.ObjectId,
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
    year: String,
    term: String,
    userId: String,
    userName: String,
    classTitle: String,
    time: [],
    classroom: String,
    subject: [String],
    point: Number,
    limit: Number,
    count_limit: String,
    info: Object,
    teachers: Object,
    // enrollment data
    studentId: String,
    studentName: String,
    studentGrade: String,
    evaluation: Object,
    temp: Object,
  },
  { timestamps: true }
);

enrollmentSchema.index(
  {
    syllabus: 1,
    studentId: 1,
  },
  { unique: true }
);

enrollmentSchema.index({
  season: 1,
  studentId: 1,
});

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

enrollmentSchema.plugin(encrypt, {
  encryptionKey: process.env["ENCKEY_E"],
  signingKey: process.env["SIGKEY_E"],
  encryptedFields: ["evaluation"],
});

module.exports = (dbName) => {
  return conn[dbName].model("Enrollment", enrollmentSchema);
};
