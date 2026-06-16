/**
 * Enrollment namespace
 * @namespace Models.Enrollment
 * @version 2.0.0
 *
 * @description 수강 정보
 * | Indexes      | Properties  |
 * | :-----       | ----------  |
 * | _id          | UNIQUE      |
 * | student_1_season_1  | COMPOUND      |
 * | syllabus_1_student_1  | UNIQUE; COMPOUND      |
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import encrypt from "mongoose-encryption";
import { isEmptyValue } from "../utils/isEmptyValue.js";

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
    coverImage: String,
    coverColor: String,
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
    // evaluation은 암호화 필드라 DB에서 내용 조회가 불가능하다.
    // 평가 데이터 존재 여부를 인덱스로 빠르게 판별하기 위한 비암호화 파생 플래그.
    hasEvaluation: {
      type: Boolean,
      default: false,
    },
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

// 학기별 평가 데이터 존재 여부를 인덱스 조회로 판별하기 위한 복합 인덱스.
enrollmentSchema.index({
  season: 1,
  hasEvaluation: 1,
});

// evaluation 평문값으로부터 hasEvaluation 플래그를 파생한다.
// 반드시 encrypt 플러그인 등록 전에 선언해야 한다.
// (플러그인의 pre-save 훅이 evaluation을 암호화하며 평문을 제거하기 때문)
// 플러그인이 evaluation을 재암호화하는 조건(isNew || _ct 선택)과 동일하게 동작시켜,
// evaluation이 메모리에 적재된 저장에서만 플래그를 갱신하고 그 외에는 기존 값을 보존한다.
enrollmentSchema.pre("save", function (next) {
  if (this.isNew || this.isSelected("_ct")) {
    this.hasEvaluation = !isEmptyValue(this.evaluation);
  }
  next();
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
