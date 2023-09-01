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
