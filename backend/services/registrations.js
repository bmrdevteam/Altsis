import { Registration } from "../models/index.js";
import { getSeasonSubRecord } from "./seasons.js";

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
    });

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
}
