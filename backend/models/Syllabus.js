import mongoose from "mongoose";
import { conn } from "../databases/connection.js";
import { timeBlockSchema as TimeBlock } from "./TimeBlock.js";

const syllabusSchema = mongoose.Schema(
  {
    season: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
    year: String,
    term: String,
    user: { type: mongoose.Types.ObjectId, required: true },
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
    },
    classroom: String,
    subject: {
      type: [String],
    },
    point: {
      type: Number,
      default: 0,
    },
    limit: {
      type: Number,
      default: 0,
    },
    count_limit: String,

    info: Object,
    teachers: {
      type: [
        mongoose.Schema(
          {
            _id: mongoose.Types.ObjectId,
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
    temp: Object,
  },
  { timestamps: true }
);

syllabusSchema.index({
  season: 1,
});

const days = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
const compare = (timeBlock1, timeBlock2) => {
  if (timeBlock1["day"] === timeBlock2["day"])
    return timeBlock1["start"] < timeBlock2["start"] ? -1 : 1;
  return days[timeBlock1["day"]] - days[timeBlock2["day"]];
};

syllabusSchema.pre("save", function (next) {
  var syllabus = this;

  //timeBlock 정렬해서 저장
  if (syllabus.isModified("time")) {
    syllabus.time.sort(compare);
  }
  next();
});

syllabusSchema.methods.getSubdocument = function () {
  return {
    syllabus: this._id,
    user: this.user,
    userId: this.userId,
    userName: this.userName,
    season: this.season,
    school: this.school,
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

export const Syllabus = (dbName) => {
  return conn[dbName].model("Syllabus", syllabusSchema);
};
