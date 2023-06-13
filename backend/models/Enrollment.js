/**
 * Enrollment namespace
 * @namespace Models.Enrollment
 * @version 2.0.0
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import encrypt from "mongoose-encryption";

/**
 * @memberof Models.Enrollment
 * @typedef TEnrollment
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} syllabus - syllabus._id
 * @prop {ObjectId} season - syllabus._id
 * @prop {string} school - syllabus.school
 * @prop {string} schoolId - syllabus.schoolId
 * @prop {string} schoolName - syllabus.schoolName
 * @prop {string} year - syllabus.year
 * @prop {string} term - syllabus.term
 * @prop {ObjectId} user - syllabus._id; 수업 개설자
 * @prop {string} userId - syllabus.userId
 * @prop {string} userName - syllabus.userName
 * @prop {string} classTitle - syllabus.classTitle
 * @prop {Object[]} time - syllabus.classTitle
 * @prop {string} classroom - syllabus.classTitle
 * @prop {string[]} subject - syllabus.subject
 * @prop {number} point - syllabus.point
 * @prop {number} limit - syllabus.limit
 * @prop {Object} info - syllabus.info
 * @prop {Object[]} teachers - syllabus.teachers
 * @prop {ObjectId} student - student(user)._id; 수강생
 * @prop {string} studentId - student(user).userId
 * @prop {string} studentName - student(user).userName
 * @prop {string} grade - registration.grade
 * @prop {Object} evaluation - 평가; ex) {멘토평가: "asdf", 자기평가: 'asdf}; 암호화되어 저장되며 특정 API 이외에는 응답값에 evaluation을 포함하지 않는다
 * @prop {string?} memo
 * @prop {boolean} isHiddenFromCalendar=false - 캘린더에서 숨김 설정
 *
 * @description 수강 정보
 */
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
    user: mongoose.Types.ObjectId,
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
    },
    // enrollment data
    student: { type: mongoose.Types.ObjectId, required: true },
    studentId: String,
    studentName: String,
    studentGrade: String,
    evaluation: Object,
    temp: Object,
    memo: String,
    isHiddenFromCalendar: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index(
  {
    syllabus: 1,
    student: 1,
  },
  { unique: true }
);

enrollmentSchema.index({
  student: 1,
  season: 1,
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

export const Enrollment = (dbName) => {
  return conn[dbName].model("Enrollment", enrollmentSchema);
};
