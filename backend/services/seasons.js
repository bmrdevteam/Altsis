import { Season } from "../models/index.js";

export class SeasonService {
  constructor(academyId) {
    this.academyId = academyId;
  }

  /**
   * @param {ObjectId} seasonId - season._id
   */
  findById = async (seasonId) => {
    const seasonRecord = await Season(this.academyId).findById(seasonId);
    return { season: seasonRecord };
  };
}

export const getSeasonSubRecord = (seasonRecord) => {
  return {
    season: seasonRecord._id,
    school: seasonRecord.school,
    schoolId: seasonRecord.schoolId,
    schoolName: seasonRecord.schoolName,
    year: seasonRecord.year,
    term: seasonRecord.term,
    isActivated: seasonRecord.isActivated,
    period: seasonRecord.period,
    formEvaluation: seasonRecord.formEvaluation,
  };
};

/**
 * @param {Object} permission
 * @param {boolean} permission.teacher
 * @param {boolean} permission.student
 * @param {{userId:string,isAllowed:boolean}[]} permission.exceptions
 * @param {string} userId
 * @param {"teacher"|"student"} role
 */
const _hasPermission = (permission, userId, role) => {
  for (let exception of permission.exceptions) {
    if (exception.userId === userId) {
      return exception.isAllowed;
    }
  }
  return permission[role];
};

/**
 * @param {"syllabus"|"enrollment"|"evaluation"} type
 * @param {{permissionSyllabusV2,permissionEnrollmentV2,permissionEvaluationV2}} seasonRecord
 * @param {string} userId
 * @param {"teacher"|"student"} role
 */
export const hasPermission = (type, seasonRecord, userId, role) => {
  switch (type) {
    case "syllabus":
      return _hasPermission(seasonRecord.permissionSyllabusV2, userId, role);
    case "enrollment":
      return _hasPermission(seasonRecord.permissionEnrollmentV2, userId, role);
    case "evaluation":
      return _hasPermission(seasonRecord.permissionEvaluationV2, userId, role);
  }
  return false;
};

/**
 * @param {{permissionSyllabusV2,permissionEnrollmentV2,permissionEvaluationV2}} seasonRecord
 * @param {string} userId
 */
export const removePermissionExcepted = async (seasonRecord, userId) => {
  let isUpdated = false;
  for (
    let i = 0;
    i < seasonRecord.permissionSyllabusV2.exceptions.length;
    i++
  ) {
    if (seasonRecord.permissionSyllabusV2.exceptions[i].userId === userId) {
      seasonRecord.permissionSyllabusV2.exceptions.splice(i, 1);
      isUpdated = true;
      break;
    }
  }
  for (
    let i = 0;
    i < seasonRecord.permissionEnrollmentV2.exceptions.length;
    i++
  ) {
    if (seasonRecord.permissionEnrollmentV2.exceptions[i].userId === userId) {
      seasonRecord.permissionEnrollmentV2.exceptions.splice(i, 1);
      isUpdated = true;
      break;
    }
  }
  for (
    let i = 0;
    i < seasonRecord.permissionEvaluationV2.exceptions.length;
    i++
  ) {
    if (seasonRecord.permissionEvaluationV2.exceptions[i].userId === userId) {
      seasonRecord.permissionEvaluationV2.exceptions.splice(i, 1);
      isUpdated = true;
      break;
    }
  }
  if (isUpdated) {
    await seasonRecord.save();
  }
};
