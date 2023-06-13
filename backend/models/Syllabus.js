/**
 * Syllabus namespace
 * @namespace Models.Syllabus
 * @version 2.0.0
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import { timeBlockSchema as TimeBlock } from "./TimeBlock.js";

/**
 * @memberof Models.Syllabus
 * @typedef TTeacher
 *
 * @prop {string} _id - ex) teacher(user)._id
 * @prop {string} userId - ex) teacher(user).userId
 * @prop {string} userName - ex) teacher(user).userName
 * @prop {boolean} confirmed=false - 승인 상태
 * @prop {boolean} isHiddenFromCalendar=false - 캘린더에서 숨김 설정
 */

/**
 * @memberof Models.Syllabus
 * @typedef TTimeBlock
 *
 * @prop {string} label - ex) 월8
 * @prop {string} day - ex) 월
 * @prop {string} start - ex) "10:00"
 * @prop {string} end - ex) "11:00"
 */

/**
 * @memberof Models.Syllabus
 * @typedef TSyllabus
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} season - season._id
 * @prop {string} school - season.school
 * @prop {string} schoolId - season.schoolId
 * @prop {string} schoolName - season.schoolName
 * @prop {string} year - season.year
 * @prop {string} term - season.term
 * @prop {ObjectId} user - user._id; 수업 개설자
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {string} classTitle - 제목
 * @prop {TTimeBlock[]} time - 시간
 * @prop {string} classroom - 강의실
 * @prop {string[]} subject - 교과목
 * @prop {number} point=0 - 학점
 * @prop {number} limit=0 - 수강정원; 0인 경우 수강 제한 없음
 * @prop {number} count=0 - 수강생 수
 * @prop {Object} info - 세부정보; 에디터에 의해 설정된다
 * @prop {TTeacher[]} teachers - 멘토 목록
 *
 * @description 강의계획서
 */
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
    count: {
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
            isHiddenFromCalendar: {
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
