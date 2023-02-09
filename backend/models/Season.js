const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const _ = require("lodash");

const subjectSchema = mongoose.Schema(
  {
    label: [String],
    data: Array,
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
    permissionSyllabus: [[]],
    permissionEnrollment: [[]],
    permissionEvaluation: [[]],
    formTimetable: Object,
    formSyllabus: Object,
    formEvaluation: [],
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

seasonSchema.methods.checkPermission = function (permissionType, userId, role) {
  console.log("checkPermission(", permissionType, userId, role, ")");
  let permission = null;
  if (permissionType == "syllabus") permission = this.permissionSyllabus;
  else if (permissionType == "enrollment")
    permission = this.permissionEnrollment;
  else if (permissionType == "evaluation")
    permission = this.permissionEvaluation;
  console.log("permission is ", permission);

  for (let i = 0; i < permission?.length; i++) {
    if (permission[i][0] == "userId" && permission[i][1] == userId) {
      return permission[i][2];
    }
    if (permission[i][0] == "role" && permission[i][1] == role)
      return permission[i][2];
  }
  return false;
};

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

module.exports = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};
