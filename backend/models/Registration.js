/**
 * Registration namespace
 * @namespace Models.Registration
 * @version 2.0.0
 *
 * @description 학기 등록 정보
 * | Indexes          | Properties          |
 * | :-----           | ----------          |
 * | _id              | UNIQUE              |
 * | season_1_user_1  | UNIQUE; COMPOUND   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Registration
 * @typedef TMemo
 *
 * @prop {string} title
 * @prop {string} day
 * @prop {string} start
 * @prop {string} end
 * @prop {string} memo
 */
const memoSchema = mongoose.Schema({
  title: String,
  day: String,
  start: String,
  end: String,
  memo: String,
});

/**
 * @memberof Models.Registration
 * @typedef TRegistration
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} season - season._id
 * @prop {string} school - season.school
 * @prop {string} schoolId - season.schoolId
 * @prop {string} schoolName - season.schoolName
 * @prop {string} year - season.year
 * @prop {string} term - season.term
 * @prop {Object} period - season.period
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {"student"|"teacher"} role="student" - 역할
 * @prop {string?} grade - 학년
 * @prop {string?} group - 그룹
 * @prop {ObjectId?} teacher - teacher(user)._id
 * @prop {string?} teacherId - teacher(user).userId
 * @prop {string?} teacherName - teacher(user).userName
 * @prop {ObjectId?} subTeacher - subTeacher(user)._id
 * @prop {string?} subTeacherId - subTeacher(user).userId
 * @prop {string?} subTeacherName - subTeacher(user).userName
 * @prop {boolean} isActivated - season.isActivated
 * @prop {TMemo[]} memos
 * @prop {boolean} permissionSyllabusV2=false - 수업 개설 권한; season.permissionSyllabusV2에 의해 설정된다
 * @prop {boolean} permissionEnrollmentV2=false - 수강신청 권한; season.permissionEnrollmentV2에 의해 설정된다
 * @prop {boolean} permissionEvaluationV2=false - 평가 권한; season.permissionEvaluationV2에 의해 설정된다
 * @prop {Object[]} formEvaluation - season.formEvaluation
 *
 */
const registrationSchema = mongoose.Schema({
  season: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  school: mongoose.Types.ObjectId,
  schoolId: String,
  schoolName: String,
  year: String,
  term: String,
  period: Object,
  user: { type: mongoose.Types.ObjectId, required: true },
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "teacher"],
    default: "student",
    required: true,
  },
  grade: String,
  group: String,
  teacher: mongoose.Types.ObjectId,
  teacherId: String,
  teacherName: String,
  subTeacher: mongoose.Types.ObjectId,
  subTeacherId: String,
  subTeacherName: String,
  isActivated: {
    type: Boolean,
    default: false,
  },
  memos: [memoSchema],
  permissionSyllabusV2: {
    type: Boolean,
    default: false,
  },
  permissionEnrollmentV2: {
    type: Boolean,
    default: false,
  },
  permissionEvaluationV2: {
    type: Boolean,
    default: false,
  },
  formEvaluation: {
    type: [],
  },
});

registrationSchema.index({
  user: 1,
});

registrationSchema.index(
  {
    season: 1,
    user: 1,
  },
  { unique: true }
);

registrationSchema.methods.getSubdocument = function () {
  return {
    season: this.season,
    school: this.school,
    schoolId: this.schoolId,
    schoolName: this.schoolName,
    year: this.year,
    term: this.term,
    isActivated: this.isActivated,
    period: this.period,
    user: this.user,
    userId: this.userId,
    userName: this.userName,
  };
};

export const Registration = (dbName) => {
  return conn[dbName].model("Registration", registrationSchema);
};
