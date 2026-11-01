/**
 * School-wide course todos (approve / confirmPending / evaluation)
 * Batched queries to avoid per-syllabus N+1.
 */

import {
  Enrollment,
  Registration,
  Season,
  Syllabus,
} from "../models/index.js";
import { assembleCourseTodos } from "../utils/courseTodosAssemble.js";

/**
 * @param {string} academyId
 * @param {Object} school - school document
 * @param {Object} user - req.user
 * @param {string|null} seasonId
 * @returns {Promise<{ items: Object[], count: number }>}
 */
export const getCourseTodosForUser = async (
  academyId,
  school,
  user,
  seasonId = null
) => {
  if (!seasonId) {
    return { items: [], count: 0 };
  }

  const registration = await Registration(academyId)
    .findOne({
      season: seasonId,
      user: user._id,
      isActivated: true,
    })
    .lean();

  if (!registration) {
    return { items: [], count: 0 };
  }

  const season = await Season(academyId).findById(seasonId).lean();
  if (!season) {
    return { items: [], count: 0 };
  }

  const formEvaluation =
    registration.formEvaluation?.length > 0
      ? registration.formEvaluation
      : season.formEvaluation || [];
  const hasFormEvaluation = formEvaluation.length > 0;

  const needsSyllabus =
    registration.permissionSyllabusV2 ||
    registration.permissionEnrollmentV2 ||
    hasFormEvaluation;

  if (!needsSyllabus) {
    return { items: [], count: 0 };
  }

  // Load mentoring/enrolled for eval chips even when period (permission) is closed → 「대기」
  const loadMentoring =
    registration.permissionSyllabusV2 || hasFormEvaluation;
  const loadEnrolled =
    registration.permissionEnrollmentV2 || hasFormEvaluation;

  const [mentoringSyllabi, createdSyllabi, myEnrollments] = await Promise.all([
    loadMentoring
      ? Syllabus(academyId)
          .find({
            season: seasonId,
            school: school._id,
            "teachers._id": user._id,
          })
          .select("_id classTitle point teachers user")
          .lean()
      : Promise.resolve([]),
    registration.permissionSyllabusV2
      ? Syllabus(academyId)
          .find({
            season: seasonId,
            school: school._id,
            user: user._id,
          })
          .select("_id classTitle point teachers user")
          .lean()
      : Promise.resolve([]),
    loadEnrolled
      ? Enrollment(academyId)
          .find({
            season: seasonId,
            school: school._id,
            student: user._id,
          })
          .select("+evaluation -info")
      : Promise.resolve([]),
  ]);

  const enrolledSyllabusIds = myEnrollments.map((e) => e.syllabus);
  let enrolledSyllabi = [];
  if (enrolledSyllabusIds.length > 0) {
    enrolledSyllabi = await Syllabus(academyId)
      .find({ _id: { $in: enrolledSyllabusIds } })
      .select("_id classTitle point teachers user")
      .lean();
  }

  const mentoringIds = mentoringSyllabi.map((s) => s._id);
  let mentoringEnrollments = [];
  if (hasFormEvaluation && mentoringIds.length > 0) {
    mentoringEnrollments = await Enrollment(academyId)
      .find({
        syllabus: { $in: mentoringIds },
      })
      .select("+evaluation -info");
  }

  // Deduplicate enrollments by _id (user may be mentor of own enrolled course)
  // Avoid lean() on encrypted evaluation so mongoose-encryption can decrypt.
  const enrollmentById = new Map();
  for (const e of [...myEnrollments, ...mentoringEnrollments]) {
    const plain = typeof e.toObject === "function" ? e.toObject() : e;
    enrollmentById.set(plain._id.toString(), plain);
  }

  return assembleCourseTodos({
    registration,
    season,
    userId: user._id,
    mentoringSyllabi,
    createdSyllabi,
    enrolledSyllabi,
    enrollments: [...enrollmentById.values()],
  });
};
