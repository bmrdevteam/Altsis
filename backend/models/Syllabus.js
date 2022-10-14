const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const TimeBlock = require("./TimeBlock");

const syllabusSchema = mongoose.Schema(
  {
    season: {
      type: String,
      required: true,
    },
    schoolId: String,
    schoolName: String,
    year: String,
    term: String,
    userId: {
      type: String,
      required: true,
    },
    classTitle: {
      type: String,
      required: true,
    },
    time: {
      type: [TimeBlock],
      required: true,
    },
    classroom: String,
    subject: {
      type: [String],
      required: true,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },

    point: {
      type: Number,
      default: 0,
    },
    limit: {
      type: Number,
      default: 0,
    },

    info: Object,
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
            confirmed: {
              type: Boolean,
              default: false,
            },
          },
          { _id: false }
        ),
      ],
      validate: (v) => Array.isArray(v) && v.length > 0,
      required: true,
    },
  },
  { timestamps: true }
);

syllabusSchema.index({
  season: 1,
});

syllabusSchema.methods.getSubdocument = function () {
  return {
    syllabus: this._id,
    userId: this.userId,
    userName: this.userName,
    season: this.season,
    schoolId: this.schoolId,
    schoolName: this.schoolName,
    year: this.year,
    term: this.term,
    classTitle: this.classTitle,
    time: this.time,
    classroom: this.classroom,
    subject: this.subject,
    point: this.point,
    limit: this.limit,
    info: this.info,
    teachers: this.teachers,
  };
};

module.exports = (dbName) => {
  return conn[dbName].model("Syllabus", syllabusSchema);
};
