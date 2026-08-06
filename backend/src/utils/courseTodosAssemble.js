/**
 * Pure course-todos assembly (no DB) — used by service + unit tests
 */

const idStr = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v?.toString === "function") return v.toString();
  return String(v);
};

const isEvalFilled = (evaluation, label) => {
  const val = evaluation?.[label];
  if (val == null) return false;
  return String(val).trim().length > 0;
};

const isFullyConfirmed = (syllabus) => {
  const teachers = syllabus?.teachers || [];
  if (!teachers.length) return false;
  return teachers.every((t) => t.confirmed === true);
};

/**
 * @param {{ studentCount: number, incomplete: boolean, periodOpen: boolean }} p
 * @returns {"없음"|"대기"|"평가중"|"완료"}
 */
export const resolveEvalStatus = ({ studentCount, incomplete, periodOpen }) => {
  if (studentCount <= 0) return "없음";
  if (!incomplete) return "완료";
  if (!periodOpen) return "대기";
  return "평가중";
};

/**
 * @param {Array} todos
 * @returns {Array}
 */
export const sortCourseTodos = (todos) => {
  const kindRank = {
    approve: 0,
    confirmPending: 1,
    evaluation: 2,
  };
  return [...todos].sort((a, b) => {
    const kr = (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9);
    if (kr !== 0) return kr;
    return (a.syllabusTitle || "").localeCompare(b.syllabusTitle || "", "ko");
  });
};

/**
 * @param {Object} params
 * @param {Object|null} params.registration - current season registration (permissions + formEvaluation)
 * @param {Object|null} params.season - season (formEvaluation fallback)
 * @param {string|Object} params.userId - current user._id
 * @param {Object[]} params.mentoringSyllabi - syllabi where user is a teacher
 * @param {Object[]} params.createdSyllabi - syllabi user created
 * @param {Object[]} params.enrolledSyllabi - syllabi user is enrolled in
 * @param {Object[]} params.enrollments - enrollments with evaluation (+ point, syllabus, student)
 * @returns {{ items: Object[], count: number }}
 */
export const assembleCourseTodos = ({
  registration,
  season,
  userId,
  mentoringSyllabi = [],
  createdSyllabi = [],
  enrolledSyllabi = [],
  enrollments = [],
}) => {
  if (!registration) {
    return { items: [], count: 0 };
  }

  const me = idStr(userId);
  const formEvaluation =
    registration.formEvaluation?.length > 0
      ? registration.formEvaluation
      : season?.formEvaluation || [];

  const enrollmentsBySyllabus = new Map();
  for (const e of enrollments) {
    const sid = idStr(e.syllabus);
    if (!sid) continue;
    if (!enrollmentsBySyllabus.has(sid)) enrollmentsBySyllabus.set(sid, []);
    enrollmentsBySyllabus.get(sid).push(e);
  }

  const items = [];

  // approve — I am a teacher and have not confirmed
  if (registration.permissionSyllabusV2) {
    for (const syllabus of mentoringSyllabi) {
      const teachers = syllabus.teachers || [];
      const mine = teachers.find((t) => idStr(t._id) === me);
      if (!mine || mine.confirmed === true) continue;
      items.push({
        kind: "approve",
        surface: "mentoring",
        syllabusId: idStr(syllabus._id),
        syllabusTitle: syllabus.classTitle || "",
      });
    }
  }

  // confirmPending — I created it and not all teachers confirmed
  if (registration.permissionSyllabusV2) {
    for (const syllabus of createdSyllabi) {
      if (isFullyConfirmed(syllabus)) continue;
      items.push({
        kind: "confirmPending",
        surface: "created",
        syllabusId: idStr(syllabus._id),
        syllabusTitle: syllabus.classTitle || "",
      });
    }
  }

  // evaluation status: 없음 | 대기 | 평가중 | 완료 (every relevant syllabus)
  const periodOpen = !!registration.permissionEvaluationV2;
  const teacherFields = formEvaluation.filter(
    (f) => f?.auth?.edit?.teacher === true
  );
  if (teacherFields.length > 0) {
    for (const syllabus of mentoringSyllabi) {
      const sid = idStr(syllabus._id);
      const rows = enrollmentsBySyllabus.get(sid) || [];
      const missing = new Set();
      for (const enrollment of rows) {
        for (const field of teacherFields) {
          if (!isEvalFilled(enrollment.evaluation, field.label)) {
            missing.add(field.label);
          }
        }
      }
      const evalStatus = resolveEvalStatus({
        studentCount: rows.length,
        incomplete: missing.size > 0,
        periodOpen,
      });
      items.push({
        kind: "evaluation",
        surface: "mentoring",
        syllabusId: sid,
        syllabusTitle: syllabus.classTitle || "",
        missingEvalLabels: [...missing],
        evalStatus,
        periodOpen,
      });
    }
  }

  const studentFields = formEvaluation.filter(
    (f) => f?.auth?.edit?.student === true
  );
  if (studentFields.length > 0) {
    for (const syllabus of enrolledSyllabi) {
      const sid = idStr(syllabus._id);
      const rows = (enrollmentsBySyllabus.get(sid) || []).filter(
        (e) => idStr(e.student) === me
      );
      const missing = new Set();
      for (const enrollment of rows) {
        for (const field of studentFields) {
          if (!isEvalFilled(enrollment.evaluation, field.label)) {
            missing.add(field.label);
          }
        }
      }
      const evalStatus = resolveEvalStatus({
        studentCount: rows.length,
        incomplete: missing.size > 0,
        periodOpen,
      });
      items.push({
        kind: "evaluation",
        surface: "enrolled",
        syllabusId: sid,
        syllabusTitle: syllabus.classTitle || "",
        missingEvalLabels: [...missing],
        evalStatus,
        periodOpen,
      });
    }
  }

  const sorted = sortCourseTodos(items);
  // Sidebar badge: distinct syllabi needing attention
  // - evaluation in period incomplete (평가중 only; 대기 excluded)
  // - approval incomplete (approve | confirmPending)
  const attentionSyllabusIds = new Set();
  for (const i of sorted) {
    if (!i.syllabusId) continue;
    if (i.kind === "evaluation" && i.evalStatus === "평가중") {
      attentionSyllabusIds.add(i.syllabusId);
    } else if (i.kind === "approve" || i.kind === "confirmPending") {
      attentionSyllabusIds.add(i.syllabusId);
    }
  }
  return { items: sorted, count: attentionSyllabusIds.size };
};
