import { z } from "zod";
import { getSchoolTodosForUser } from "../../../services/schoolTodos.js";
import { getCourseTodosForUser } from "../../../services/schoolCourseTodos.js";
import { logger } from "../../../log/logger.js";
import { defineTool } from "../defineTool.js";
import {
  normalizeTodoScope,
  partitionCourseTodos,
  projectCourseTodo,
  projectSchoolTodo,
} from "../lib/todoProjection.js";

const TODO_LIMIT_DEFAULT = 20;
const TODO_LIMIT_MAX = 40;

const clampLimit = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return TODO_LIMIT_DEFAULT;
  return Math.max(1, Math.min(TODO_LIMIT_MAX, Math.floor(n)));
};

const todoSummary = (boardCount, courseCount) => {
  if (!boardCount && !courseCount) return "할 일 없음";
  const parts = [];
  if (boardCount) parts.push(`보드 ${boardCount}건`);
  if (courseCount) parts.push(`수업 ${courseCount}건`);
  return parts.join(" · ");
};

const input = z.object({
  scope: z.enum(["all", "school", "course"]).optional(),
  limit: z.number().int().min(1).max(40).optional(),
});

export default defineTool({
  name: "get_my_todos",
  label: "내 할 일",
  description: "보드 할 일(결재·채점·미제출)과 수업 할 일. 어디서·어떻게는 search_product_guide.",
  input,
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "source=board 는 보드 양식(미제출·결재·채점)입니다. 수업 평가가 아닙니다. 수업 평가는 source=course 이고 kind=evaluation 인 항목만입니다.",
    "emptyCourses는 수강생 없는 수업 수입니다. 할 일이 아닙니다. 한 번만, 개수만, 한 문장으로 언급하세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const scope = normalizeTodoScope(rawArgs.scope);
    const limit = clampLimit(rawArgs.limit);
    const loadSchoolTodos = ctx.deps?.getSchoolTodosForUser || getSchoolTodosForUser;
    const loadCourseTodos = ctx.deps?.getCourseTodosForUser || getCourseTodosForUser;
    const academyId = ctx.academyId;
    const user = ctx.user;
    const school = ctx.school;
    const seasonId = String(ctx.seasonId || ctx.season?._id || "");
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
      const emptyCourses = courseSplit.count ? { count: courseSplit.count } : undefined;
      return {
        summary: todoSummary(boardItems.length, courseItems.length),
        scope,
        boardCount: boardItems.length,
        courseCount: courseItems.length,
        truncated: combined.length > items.length,
        items,
        emptyCourses,
      };
    } catch (err) {
      logger.error(`alter agent get_my_todos: ${err.message}`);
      return { summary: "할 일 조회 실패", error: "할 일을 불러오지 못했습니다." };
    }
  },
});
