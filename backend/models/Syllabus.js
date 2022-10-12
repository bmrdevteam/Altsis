const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const TimeBlock = require("./TimeBlock");

const syllabusSchema = mongoose.Schema(
  {
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
    userId: {
      type: String,
      required: true,
    },
    userName: {
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

module.exports = (dbName) => {
  return conn[dbName].model("Syllabus", syllabusSchema);
};
