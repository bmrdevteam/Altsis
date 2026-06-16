import { Enrollment, Registration, Syllabus } from "../models/index.js";
import { logger } from "../log/logger.js";
import { isEmptyValue } from "../utils/isEmptyValue.js";

// 기존 import 호환을 위해 재노출한다.
export { isEmptyValue };

export const hasEvaluationData = async (academyId, seasonId) => {
  // evaluation은 암호화 필드라 DB에서 내용 조회가 불가능하므로,
  // Enrollment에 비정규화한 비암호화 플래그(hasEvaluation)를 인덱스로 조회한다.
  // 복호화 없이 O(인덱스) 비용으로 판별한다.
  //
  // 플래그 도입 이전에 생성된 enrollment에는 hasEvaluation 필드가 존재하지 않는다.
  // 이런 레거시 데이터는 평가 데이터 유무를 알 수 없으므로 보수적으로 "있음"으로 간주해 잠근다.
  // 따라서 명시적으로 false로 계산된 경우(= 평가 데이터 없음)만 수정 가능하도록,
  // hasEvaluation !== false(필드 없음 또는 true)인 enrollment가 하나라도 있으면 잠근다.
  return (
    (await Enrollment(academyId).countDocuments({
      season: seasonId,
      hasEvaluation: { $ne: false },
    })) > 0
  );
};

export const hasSyllabusInfoData = async (academyId, seasonId) => {
  const syllabusCount = await Syllabus(academyId).countDocuments({
    season: seasonId,
  });
  if (syllabusCount === 0) return false;

  const syllabuses = await Syllabus(academyId)
    .find({ season: seasonId })
    .select("info");

  return syllabuses.some((syllabus) => !isEmptyValue(syllabus.info));
};

export const hasTimetableData = async (academyId, seasonId) => {
  return (
    (await Syllabus(academyId).countDocuments({
      season: seasonId,
      "time.0": { $exists: true },
    })) > 0
  );
};

export const getSeasonFormUsage = async (academyId, seasonId) => {
  const [evaluation, syllabus, timetable] = await Promise.all([
    hasEvaluationData(academyId, seasonId),
    hasSyllabusInfoData(academyId, seasonId),
    hasTimetableData(academyId, seasonId),
  ]);

  return { evaluation, syllabus, timetable };
};

/**
 * 학기의 학년도/학기명을 하위 문서(Registration/Syllabus/Enrollment)에 전파한다.
 * 일부만 반영되면 평가 연동(combineBy="year")과 표시값이 어긋날 수 있으므로,
 * 실패 시 호출자가 재시도할 수 있도록 에러를 그대로 전파한다(연산은 멱등).
 */
export const syncSeasonYearTerm = async (academyId, seasonId, year, term) => {
  const filter = { season: seasonId };
  const update = { year, term };

  await Registration(academyId).updateMany(filter, update);
  await Syllabus(academyId).updateMany(filter, update);
  await Enrollment(academyId).updateMany(filter, update);
};

/**
 * 평가 양식을 Registration.formEvaluation에 동기화한다.
 * Season과 Registration이 어긋나면 권한/표시가 깨지므로 실패 시 에러를 전파한다.
 */
export const syncRegistrationFormEvaluation = async (
  academyId,
  seasonId,
  formEvaluation
) => {
  const result = await Registration(academyId).updateMany(
    { season: seasonId },
    { formEvaluation }
  );
  logger.info(
    `[seasonForm] synced formEvaluation to ${result.modifiedCount ?? 0} registrations (season: ${seasonId})`
  );
};
