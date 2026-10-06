/**
 * Read-only tools for the Alter agent.
 * Scope always comes from serverCtx (the signed-in user). Model arguments
 * cannot choose a user, academy, season, or school.
 */

import { getSchoolTodosForUser } from "./schoolTodos.js";
import { getCourseTodosForUser } from "./schoolCourseTodos.js";
import { retrieveAlterGuide } from "./alterGuideRetrieve.js";
import { buildAlterGuideLinks } from "./alterGuideLinks.js";
import { maskSensitiveObject } from "./aiSafety.js";
import { logger } from "../log/logger.js";

const TODO_LIMIT_DEFAULT = 20;
const TODO_LIMIT_MAX = 40;
const GUIDE_HITS = 4;
const GUIDE_CHARS = 700;

const clip = (value, max) => {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};

const iso = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const compact = (row) => {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
};

const SCHOOL_KIND = {
  grade: "채점",
  approve: "결재",
  outgoing: "진행 중 결재",
  unsubmitted: "미제출",
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

const EMPTY_COURSE_TITLE_CAP = 5;

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

const clampLimit = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return TODO_LIMIT_DEFAULT;
  return Math.max(1, Math.min(TODO_LIMIT_MAX, Math.floor(n)));
};

export const normalizeTodoScope = (value) => {
  const scope = String(value || "all").trim().toLowerCase();
  if (scope === "school" || scope === "board" || scope === "boards") return "school";
  if (scope === "course" || scope === "courses") return "course";
  return "all";
};

const todoSummary = (boardCount, courseCount) => {
  if (!boardCount && !courseCount) return "할 일 없음";
  const parts = [];
  if (boardCount) parts.push(`보드 ${boardCount}건`);
  if (courseCount) parts.push(`수업 ${courseCount}건`);
  return parts.join(" · ");
};

/**
 * @param {{
 *   getSchoolTodosForUser?: Function,
 *   getCourseTodosForUser?: Function,
 *   retrieveAlterGuide?: Function,
 * }} [deps]
 */
export const createAgentTools = (deps = {}) => {
  const loadSchoolTodos = deps.getSchoolTodosForUser || getSchoolTodosForUser;
  const loadCourseTodos = deps.getCourseTodosForUser || getCourseTodosForUser;
  const loadGuide = deps.retrieveAlterGuide || retrieveAlterGuide;

  return [
    {
      name: "get_my_todos",
      label: "내 할 일",
      description:
        "로그인한 사용자의 보드 할 일(결재·채점·미제출)과 수업 할 일(확인·평가 입력)을 읽습니다. 메뉴 위치나 입력 방법(어디서·어떻게)은 알려주지 않습니다. 그 질문은 search_product_guide를 쓰세요. emptyCourses는 수강생이 없는 수업 참고이며 할 일이 아닙니다.",
      arguments: '{ "scope": "all" | "school" | "course", "limit"?: number }',
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          scope: {
            type: "string",
            enum: ["all", "school", "course"],
            description: "all=보드와 수업, school=보드만, course=수업만",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 40,
            description: "돌려줄 할 일 개수 상한",
          },
        },
      },
      async execute(serverCtx, rawArgs = {}) {
        const scope = normalizeTodoScope(rawArgs.scope);
        const limit = clampLimit(rawArgs.limit);
        const academyId = serverCtx.academyId;
        const user = serverCtx.user;
        const school = serverCtx.school;
        const seasonId = String(serverCtx.seasonId || serverCtx.season?._id || "");
        if (!school || !user) {
          return { summary: "할 일 없음", scope, items: [], error: "학교 또는 사용자 정보가 없습니다." };
        }
        try {
          const [schoolResult, courseResult] = await Promise.all([
            scope === "course"
              ? Promise.resolve({ items: [] })
              : loadSchoolTodos(academyId, school, user, seasonId || null),
            scope === "school"
              ? Promise.resolve({ items: [] })
              : loadCourseTodos(academyId, school, user, seasonId || null),
          ]);
          const boardItems = (schoolResult?.items || []).map(projectSchoolTodo);
          const courseSplit = partitionCourseTodos(courseResult?.items || []);
          const courseItems = courseSplit.todos.map(projectCourseTodo);
          const combined = [...boardItems, ...courseItems];
          const items = combined.slice(0, limit);
          const emptyCourses = courseSplit.count
            ? {
                count: courseSplit.count,
                titles: courseSplit.titles,
                note: "수강생이 없어 평가 할 일이 아닙니다. 할 일 개수와 목록에 넣지 마세요.",
              }
            : undefined;
          return maskSensitiveObject({
            summary: todoSummary(boardItems.length, courseItems.length),
            scope,
            boardCount: boardItems.length,
            courseCount: courseItems.length,
            truncated: combined.length > items.length,
            items,
            emptyCourses,
          });
        } catch (err) {
          logger.error(`alter agent get_my_todos: ${err.message}`);
          return { summary: "할 일 조회 실패", error: "할 일을 불러오지 못했습니다." };
        }
      },
    },
    {
      name: "search_product_guide",
      label: "제품 안내",
      description:
        "Altsis에서 기능을 어디서·어떻게 쓰는지(메뉴, 입력 화면, 방법)를 안내 문서에서 찾습니다. 할 일과 함께 어디서/어떻게/방법을 물으면 같은 턴에 이 도구도 호출하세요. 학사 데이터가 아니라 제품 도움말입니다.",
      arguments: '{ "query": string }',
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "찾을 기능이나 화면" },
        },
        required: ["query"],
      },
      async execute(serverCtx, rawArgs = {}) {
        const query = clip(rawArgs.query, 500);
        if (!query) {
          return { summary: "검색어 없음", error: "query가 필요합니다.", hits: [] };
        }
        try {
          const hits = loadGuide({
            query,
            auth: serverCtx.user?.auth,
            isSchoolManager: !!serverCtx.isSchoolManager,
            limit: GUIDE_HITS,
          });
          const rows = (hits || []).slice(0, GUIDE_HITS);
          const projected = rows.map((hit) =>
            compact({
              title: clip(hit.title, 120),
              doc: clip(hit.key, 160),
              excerpt: clip(hit.content, GUIDE_CHARS),
            })
          );
          const links = buildAlterGuideLinks(rows, {
            user: serverCtx.user,
            school: serverCtx.school,
            registration: serverCtx.registration,
            message: serverCtx.message || query,
          });
          return maskSensitiveObject({
            summary: projected.length ? `안내 ${projected.length}건` : "안내 없음",
            query,
            hits: projected,
            links,
          });
        } catch (err) {
          logger.error(`alter agent search_product_guide: ${err.message}`);
          return { summary: "안내 검색 실패", error: "제품 안내를 찾지 못했습니다.", hits: [] };
        }
      },
    },
  ];
};
