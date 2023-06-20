/**
 * Season namespace
 * @namespace Models.Season
 * @version 2.0.0
 *
 * @description 학기
 * | Indexes                  | Properties        |
 * | :-----                   | ----------        |
 * | _id                      | UNIQUE            |
 * | school_1_year_-1_term_1  | UNIQUE; COMPOUND  |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import _ from "lodash";

/**
 * @memberof Models.Season
 * @typedef TPeriod
 *
 * @prop {string} start - ex) "YYYY-MM-DD" || ""
 * @prop {string} end - - ex) "YYYY-MM-DD" || ""
 */
const periodSchema = mongoose.Schema(
  {
    start: String, // "YYYY-MM-DD" || ""
    end: String, // "YYYY-MM-DD" || ""
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TSubject
 *
 * @prop {string[]} label - ex) ["교과","과목"]
 * @prop {string[][]} data - ex) [["국어","현대시"],["수학","미적분"],...]
 */
const subjectSchema = mongoose.Schema(
  {
    label: [String],
    data: [[String]],
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TPermissionException
 *
 * @prop {string} registration - registration._id
 * @prop {string} role - registration.role
 * @prop {string} user - registration.user
 * @prop {string} userId - registration.userId
 * @prop {string} userName - registration.userName
 * @prop {boolean} isAllowed
 */
const permissionExceptionSchema = mongoose.Schema(
  {
    registration: String,
    role: String,
    user: String,
    userId: String,
    userName: String,
    isAllowed: Boolean,
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TPermission
 *
 * @prop {boolean} teacher
 * @prop {boolean} student
 * @prop {TPermissionException[]} exceptions
 */
const permissionSchema = mongoose.Schema(
  {
    teacher: Boolean,
    student: Boolean,
    exceptions: [permissionExceptionSchema],
  },
  { _id: false }
);

const permissionDefault = {
  teacher: false,
  student: false,
  exceptions: [],
};

/**
 * @memberof Models.Season
 * @typedef TFormEvlauationAuthItemSchema
 *
 * @prop {boolean} teacher
 * @prop {boolean} student
 */
const formEvlauationAuthItemSchema = mongoose.Schema(
  {
    student: Boolean,
    teacher: Boolean,
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TFormEvaluationAuth
 *
 * @prop {TFormEvlauationAuthItemSchema} edit
 * @prop {TFormEvlauationAuthItemSchema} view
 */
const formEvlauationAuthSchema = mongoose.Schema(
  {
    edit: formEvlauationAuthItemSchema,
    view: formEvlauationAuthItemSchema,
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TFormEvaluationItem
 *
 * @prop {string} label - ex) "멘토평가"
 * @prop {"input"|"input-number"|"select"} type="input"
 * @prop {string[]} options - type==="select"인 경우 선택 옵션
 * @prop {"term"|"year"} combineBy="term" - 평가가 동기화되는 단위
 * @prop {"editByStudent"|"editByTeacher"|"editByTeacherAndStudentCanView"} authOption="editByTeacher"
 * @prop {TFormEvaluationAuth} auth - authOption에 따라 자동 설정된다
 */
const formEvaluationItemSchema = mongoose.Schema(
  {
    label: String,
    type: {
      type: String,
      enum: ["input", "input-number", "select"],
      defualt: "input",
    },
    options: [String],
    combineBy: {
      type: String,
      enum: ["term", "year"],
      default: "term",
    },
    authOption: {
      type: String,
      enum: [
        "editByStudent",
        "editByTeacher",
        "editByTeacherAndStudentCanView",
      ],
      default: "editByTeacher",
    },
    auth: formEvlauationAuthSchema,
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TFormTimetable
 *
 * @prop {string} title
 * @prop {Object} data - 에디터에 의해 설정된다
 */
const formTimetableSchema = mongoose.Schema(
  {
    title: String,
    data: [Object],
  },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TFormSyllabus
 *
 * @prop {string} title
 * @prop {Object} data - 에디터에 의해 설정된다
 */
const formSyllabusSchema = mongoose.Schema(
  { title: String, data: [Object] },
  { _id: false }
);

/**
 * @memberof Models.Season
 * @typedef TSeason
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} school - school._id
 * @prop {string} schoolId - school.schoolId
 * @prop {string} schoolName - school.schoolName
 * @prop {string[]} classrooms - 강의실 목록
 * @prop {TSubject} subjects - 교과목
 * @prop {string} year - 학년도
 * @prop {string} term - 학기
 * @prop {TPeriod} period - 기간
 * @prop {TPermission} permissionSyllabusV2 - 수업 개설 권한
 * @prop {TPermission} permissionEnrollmentV2 - 수강신청 권한
 * @prop {TPermission} permissionEvaluationV2 - 평가 권한
 * @prop {TFormTimetable} formTimetable - 시간표 양식
 * @prop {TFormSyllabus} formSyllabus - 강의계획서 양식
 * @prop {TFormEvaluationItem[]} formEvaluation - 평가 양식
 * @prop {boolean} isActivated=false - 학기 활성화 상태
 * @prop {boolean} isActivated=false - 학기 최초 활성화 여부
 *
 */
const seasonSchema = mongoose.Schema(
  {
    school: {
      type: mongoose.Types.ObjectId,
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
    classrooms: [String],
    subjects: { type: subjectSchema, default: { label: [], data: [] } },
    year: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    period: {
      type: periodSchema,
      default: {
        start: "",
        end: "",
      },
    },
    permissionSyllabusV2: {
      type: permissionSchema,
      default: permissionDefault,
    },
    permissionEnrollmentV2: {
      type: permissionSchema,
      default: permissionDefault,
    },
    permissionEvaluationV2: {
      type: permissionSchema,
      default: permissionDefault,
    },
    formTimetable: formTimetableSchema,
    formSyllabus: formSyllabusSchema,
    formEvaluation: {
      type: [formEvaluationItemSchema],
    },
    temp: Object,
    isActivated: {
      type: Boolean,
      default: false,
    },
    isActivatedFirst: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

seasonSchema.index(
  {
    school: 1,
    year: -1,
    term: 1,
  },
  { unique: true }
);

seasonSchema.methods.getSubdocument = function () {
  return {
    season: this._id,
    school: this.school,
    schoolId: this.schoolId,
    schoolName: this.schoolName,
    year: this.year,
    term: this.term,
    isActivated: this.isActivated,
    period: this.period,
    formEvaluation: this.formEvaluation,
  };
};

export const Season = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};
