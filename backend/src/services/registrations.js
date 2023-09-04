import { Registration } from "../models/index.js";
import {
  SeasonService,
  getSeasonSubRecord,
  hasPermission,
  removePermissionExcepted,
} from "./seasons.js";

export class RegistrationService {
  constructor(academyId) {
    this.academyId = academyId;
  }

  create = async ({
    season: seasonRecord,
    user: userRecord,
    role,
    teacher: teacherRecord,
    subTeacher: subTeacherRecord,
    grade,
    group,
  }) => {
    const permissionSyllabusV2 = hasPermission(
      "syllabus",
      seasonRecord,
      userRecord.userId,
      role
    );
    const permissionEnrollmentV2 = hasPermission(
      "enrollment",
      seasonRecord,
      userRecord.userId,
      role
    );
    const permissionEvaluationV2 = hasPermission(
      "evaluation",
      seasonRecord,
      userRecord.userId,
      role
    );

    const registrationRecord = await Registration(this.academyId).create({
      ...getSeasonSubRecord(seasonRecord),
      user: userRecord._id,
      userId: userRecord.userId,
      userName: userRecord.userName,
      role,
      teacher: teacherRecord._id,
      teacherId: teacherRecord.userId,
      teacherName: teacherRecord.userName,
      subTeacher: subTeacherRecord._id,
      subTeacherId: subTeacherRecord.userId,
      subTeacherName: subTeacherRecord.userName,
      grade,
      group,
      permissionSyllabusV2,
      permissionEnrollmentV2,
      permissionEvaluationV2,
    });

    return { registration: registrationRecord };
  };

  /**
   * @param {ObjectId|string} registrationId - registration._id
   */
  findById = async (registrationId) => {
    const registrationRecord = await Registration(this.academyId).findById(
      registrationId
    );
    return { registration: registrationRecord };
  };

  /**
   * @param {ObjectId} seasonId - season._id
   * @param {ObjectId} uid - user._id
   */
  findBySeasonIdAndUID = async (seasonId, uid) => {
    const registrationRecord = await Registration(this.academyId).findOne({
      season: seasonId,
      user: uid,
    });
    return { registration: registrationRecord };
  };

  remove = async (registrationRecord) => {
    const seasonService = new SeasonService(this.academyId);

    const { season: seasonRecord } = await seasonService.findById(
      registrationRecord.season
    );
    if (seasonRecord) {
      await removePermissionExcepted(seasonRecord, registrationRecord.userId);
    }
    await registrationRecord.remove();
  };
}

export const updateRegistrationPermission = async (
  type,
  registrationRecord,
  isAllowed
) => {
  switch (type) {
    case "syllabus":
      registrationRecord.permissionSyllabusV2 = isAllowed;
      break;
    case "enrollment":
      registrationRecord.permissionEnrollmentV2 = isAllowed;
      break;
    case "evaluation":
      registrationRecord.permissionEvaluationV2 = isAllowed;
      break;
    default:
      return;
  }
  await registrationRecord.save();
};
