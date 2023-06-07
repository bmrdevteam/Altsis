import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import _ from "lodash";

const subjectSchema = mongoose.Schema(
  {
    label: [String],
    data: Array,
  },
  { _id: false }
);

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

const formEvlauationAuthItemSchema = mongoose.Schema(
  {
    student: Boolean,
    teacher: Boolean,
  },
  { _id: false }
);

const formEvlauationAuthSchema = mongoose.Schema(
  {
    edit: formEvlauationAuthItemSchema,
    view: formEvlauationAuthItemSchema,
  },
  { _id: false }
);

const formEvaluationSchema = mongoose.Schema(
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
      start: String,
      end: String,
    },
    permissionSyllabus: {}, //deprecated
    permissionEnrollment: {}, //deprecated
    permissionEvaluation: {}, //deprecated
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
    formTimetable: Object,
    formSyllabus: Object,
    formEvaluation: {
      type: [formEvaluationSchema],
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
  };
};

export const Season = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};
