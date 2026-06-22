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

const permissionDefault = {
  teacher: false,
  student: false,
  exceptions: [],
};

const getSeasonPermissionFieldName = (type) => {
  switch (type) {
    case "syllabus":
      return "permissionSyllabusV2";
    case "enrollment":
      return "permissionEnrollmentV2";
    case "activity":
      return "permissionActivityV2";
    case "evaluation":
      return "permissionEvaluationV2";
    default:
      return null;
  }
};

const ensureSeasonPermissionField = (seasonRecord, type) => {
  const fieldName = getSeasonPermissionFieldName(type);
  if (!fieldName) {
    return null;
  }
  if (!seasonRecord[fieldName]) {
    seasonRecord[fieldName] = { ...permissionDefault, exceptions: [] };
  }
  return seasonRecord[fieldName];
};

/**
 * @param {"syllabus"|"enrollment"|"activity"|"evaluation"} type
 * @param {{permissionSyllabusV2,permissionEnrollmentV2,permissionActivityV2,permissionEvaluationV2}} seasonRecord
 * @param {{_id,userId,userName,role}} registrationRecord
 * @param {boolean} isAllowed
 */
export const addSeasonPermissionException = async (
  type,
  seasonRecord,
  registrationRecord,
  isAllowed
) => {
  const permission = ensureSeasonPermissionField(seasonRecord, type);
  if (!permission) {
    return;
  }

  for (let i = 0; i < permission.exceptions.length; i++) {
    if (permission.exceptions[i].userId === registrationRecord.userId) {
      if (permission.exceptions[i].isAllowed !== isAllowed) {
        permission.exceptions[i].isAllowed = isAllowed;
        await seasonRecord.save();
      }
      return;
    }
  }

  permission.exceptions.push({
    registration: registrationRecord._id,
    role: registrationRecord.role,
    user: registrationRecord.user,
    userName: registrationRecord.userName,
    userId: registrationRecord.userId,
    isAllowed,
  });

  await seasonRecord.save();
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
 * @param {"syllabus"|"enrollment"|"activity"|"evaluation"} type
 * @param {{permissionSyllabusV2,permissionEnrollmentV2,permissionActivityV2,permissionEvaluationV2}} seasonRecord
 * @param {string} userId
 * @param {"teacher"|"student"} role
 */
export const hasPermission = (type, seasonRecord, userId, role) => {
  const fieldName = getSeasonPermissionFieldName(type);
  if (!fieldName) {
    return false;
  }
  const permission = seasonRecord[fieldName] || permissionDefault;
  return _hasPermission(permission, userId, role);
};

/**
 * @param {{permissionSyllabusV2,permissionEnrollmentV2,permissionActivityV2,permissionEvaluationV2}} seasonRecord
 * @param {string} userId
 */
export const removePermissionExcepted = async (seasonRecord, userId) => {
  let isUpdated = false;
  const permissionFields = [
    "permissionSyllabusV2",
    "permissionEnrollmentV2",
    "permissionActivityV2",
    "permissionEvaluationV2",
  ];

  for (const fieldName of permissionFields) {
    const permission = seasonRecord[fieldName];
    if (!permission?.exceptions?.length) {
      continue;
    }
    for (let i = 0; i < permission.exceptions.length; i++) {
      if (permission.exceptions[i].userId === userId) {
        permission.exceptions.splice(i, 1);
        isUpdated = true;
        break;
      }
    }
  }

  if (isUpdated) {
    await seasonRecord.save();
  }
};
