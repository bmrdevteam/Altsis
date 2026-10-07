import { clip, compact, iso } from "./compact.js";

const EMPTY_COURSE_TITLE_CAP = 5;

const SCHOOL_KIND = {
  grade: "채점",
  approve: "결재",
  outgoing: "진행 중 결재",
  unsubmitted: "보드 양식 미제출",
};

const COURSE_KIND = {
  approve: "수업 확인",
  confirmPending: "확인 대기",
  evaluation: "평가",
};

export const projectSchoolTodo = (item) =>
  compact({
    source: "board",
    kind: item?.kind,
    label: SCHOOL_KIND[item?.kind] || clip(item?.kind, 40),
    board: clip(item?.boardTitle, 80),
    form: clip(item?.formTitle, 80),
    field: clip(item?.fieldLabel, 40),
    step: clip(item?.stepLabel, 40),
    respondent: clip(item?.respondentName, 40),
    progress: clip(item?.progress, 20),
    due: iso(item?.closeAt),
    submittedAt: iso(item?.submittedAt),
  });

/**
 * resolveEvalStatus codes are easy to misread ("없음" = no enrolled students).
 * Plain labels go to the model. Courses with no students are not evaluation
 * todos; get_my_todos reports them only as emptyCourses.
 */
export const EVAL_STATUS_LABEL = {
  없음: "수강생 없음",
  대기: "평가 기간 전",
  평가중: "평가 입력 필요",
  완료: "평가 완료",
};

/** Same skip as the sidebar badge: no enrolled students means no evaluation todo. */
export const isEmptyEnrollmentEval = (item) =>
  item?.kind === "evaluation" && item?.evalStatus === "없음";

/**
 * Pull evaluation rows with no students out of the todo list.
 * Duplicate syllabus ids count once. Titles are capped for the model.
 */
export const partitionCourseTodos = (items) => {
  const todos = [];
  const titles = [];
  const seen = new Set();
  for (const item of items || []) {
    if (!isEmptyEnrollmentEval(item)) {
      todos.push(item);
      continue;
    }
    const id = String(item?.syllabusId || "").trim();
    const title = clip(item?.syllabusTitle, 80);
    const key = id || (title ? `title:${title}` : `untitled:${seen.size}`);
    if (seen.has(key)) continue;
    seen.add(key);
    if (title) titles.push(title);
  }
  return { todos, count: seen.size, titles: titles.slice(0, EMPTY_COURSE_TITLE_CAP) };
};

export const projectCourseTodo = (item) =>
  compact({
    source: "course",
    kind: item?.kind,
    label: COURSE_KIND[item?.kind] || clip(item?.kind, 40),
    classTitle: clip(item?.syllabusTitle, 80),
    evalStatus: clip(EVAL_STATUS_LABEL[item?.evalStatus] || item?.evalStatus, 40),
    missing: Array.isArray(item?.missingEvalLabels)
      ? item.missingEvalLabels.map((label) => clip(label, 40)).filter(Boolean).slice(0, 8)
      : undefined,
  });

export const normalizeTodoScope = (value) => {
  const scope = String(value || "all").trim().toLowerCase();
  if (scope === "school" || scope === "board" || scope === "boards") return "school";
  if (scope === "course" || scope === "courses") return "course";
  return "all";
};
