const mongoose = require("mongoose");
const moment = require("moment");
const { conn } = require("../databases/connection");
const TimeBlock = require("./TimeBlock");

const syllabusSchema = mongoose.Schema(
  {
    classTitle: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    schoolId: {
      type: String,
      required: true,
    },
    schoolName: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    time: {
      type: [TimeBlock],
      validate: (v) => Array.isArray(v) && v.length > 0,
      required: true,
    },
    classroom: String,
    point: {
      type: Number,
      default: 0,
    },
    subject: {
      type: Array,
      required: true,
    },
    teachers: {
      type: [
        mongoose.Schema(
          {
            userId: {
              type: String,
              required: true,
            },
            userName: {
              type: String,
              required: true,
            },
          },
          { _id: false }
        ),
      ],
      validate: (v) => Array.isArray(v) && v.length > 0,
      required: true,
    },
    limit: {
      type: Number,
      default: 0,
    },
    info: Object,
  },
  { timestamps: true }
);

syllabusSchema.methods.getSubdocument = function () {
  console.log("methods... ", this);
  return {
    _id: this._id,
    schoolId: this.schoolId,
    schoolName: this.schoolName,
    year: this.year,
    term: this.term,
    classTitle: this.classTitle,
    time: this.time,
    point: this.point,
    subject: this.subject,
  };
};

syllabusSchema.methods.isTimeEqual = function (time) {
  if (this.time.length != time.legth) {
    return false;
  }
  for (let i = 0; i < this.time; i++) {
    if (!this.time[i].isEqual(time[i])) {
      return false;
    }
  }
  return true;
};

syllabusSchema.methods.isTimeOverlapped = function (syllabus) {
  for (let block1 of this.time) {
    for (let block2 of syllabus.time) {
      if (block1.isOverlapped(block2)) {
        return block1;
      }
    }
  }
  return null;
};

syllabusSchema.methods.isTeachersEqual = function (teachers) {
  if (this.teachers.length != teachers.legth) {
    return false;
  }
  for (let i = 0; i < this.teachers; i++) {
    if (!this.teachers[i].userId != teachers[i].userId) {
      return false;
    }
  }
  return true;
};

module.exports = (dbName) => {
  return conn[dbName].model("Syllabus", syllabusSchema);
};
