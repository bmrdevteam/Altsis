/**
 * GET /syllabuses 목록용 Mongo 쿼리 (student/enrollment 경로는 제외)
 * @param {Object} [query]
 * @returns {Object}
 */
export function buildSyllabusListQuery(query = {}) {
  const mongoQuery = {};

  if ("season" in query) {
    mongoQuery.season = query.season;
  }
  if ("school" in query) {
    mongoQuery.school = query.school;
  }
  if ("classroom" in query) {
    mongoQuery.classroom = query.classroom;
  }
  if ("confirmed" in query) {
    mongoQuery["teachers.confirmed"] = { $ne: false };
  }
  if ("teacher" in query) {
    mongoQuery["teachers._id"] = query.teacher;
  }
  if ("user" in query) {
    mongoQuery.user = query.user;
  }

  return mongoQuery;
}
