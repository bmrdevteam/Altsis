import { Syllabus } from "../../../models/Syllabus.js";
import { getCourseTodosForUser } from "../../../services/schoolCourseTodos.js";
import { partitionCourseTodos } from "./todoProjection.js";

const addName = (names, value) => {
  if (Array.isArray(value)) {
    for (const row of value) addName(names, row);
    return;
  }
  const name = String(value || "").trim();
  if (name.length >= 2) names.add(name);
};

/**
 * Facts the eval harness reads from the fixture. emptyCourseCount is the same
 * number get_my_todos would report, and that tool omits emptyCourses when the
 * count is 0. courseNames are syllabus titles that exist in the fixture.
 */
export const readFixtureTodoFacts = async ({
  academyId,
  user,
  school,
  seasonId,
} = {}) => {
  const names = new Set();
  if (!academyId || !user || !school) {
    return { emptyCourseCount: 0, courseNames: [] };
  }
  const season = seasonId ? String(seasonId) : null;
  const [courseResult, syllabi] = await Promise.all([
    getCourseTodosForUser(academyId, school, user, season),
    season
      ? Syllabus(academyId)
          .find({ season, school: school._id })
          .select("classTitle subject")
          .lean()
      : Promise.resolve([]),
  ]);
  for (const row of syllabi || []) {
    addName(names, row?.classTitle);
    addName(names, row?.subject);
  }
  for (const item of courseResult?.items || []) addName(names, item?.syllabusTitle);
  const split = partitionCourseTodos(courseResult?.items || []);
  for (const title of split.titles) addName(names, title);
  return { emptyCourseCount: split.count, courseNames: [...names] };
};
