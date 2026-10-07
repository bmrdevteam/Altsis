/**
 * Approvals waiting on this teacher: board forms and course confirmations.
 * Names only. Row bodies stay out.
 */

import { z } from "zod";
import { logger } from "../../../log/logger.js";
import { getCourseTodosForUser } from "../../../services/schoolCourseTodos.js";
import { getSchoolTodosForUser } from "../../../services/schoolTodos.js";
import { defineTool } from "../defineTool.js";
import { clip, compact, iso } from "../lib/compact.js";
import { gateTeacher } from "../lib/readGate.js";

const LIMIT = 20;

const clamp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return LIMIT;
  return Math.max(1, Math.min(LIMIT, Math.floor(n)));
};

const project = (item) => {
  if (item?.syllabusTitle && !item?.formTitle) {
    return compact({
      source: "course",
      label: "수업 확인",
      classTitle: clip(item.syllabusTitle, 80),
    });
  }
  return compact({
    source: "board",
    label: "결재",
    board: clip(item.boardTitle, 80),
    form: clip(item.formTitle, 80),
    field: clip(item.fieldLabel, 40),
    step: clip(item.stepLabel, 40),
    respondent: clip(item.respondentName, 40),
    submittedAt: iso(item.submittedAt),
  });
};

export default defineTool({
  name: "get_pending_approvals",
  label: "결재 대기",
  description: "내가 승인해야 하는 양식 결재와 수업 확인. 제출 본문은 포함하지 않습니다.",
  input: z
    .object({
      limit: z.number().int().min(1).max(20).optional(),
    })
    .strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "내가 승인해야 하는 양식 결재와 수업 확인만 get_pending_approvals로 보세요. 미제출·채점은 get_my_todos입니다.",
    "학생 연락처와 제출 본문은 말하지 마세요. 양식·수업 이름과 건수만 말하세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const gate = await gateTeacher(ctx);
    if (!gate.ok) return { ...gate.error, items: [] };
    const school = ctx.school;
    const user = ctx.user;
    const seasonId = String(ctx.seasonId || ctx.season?._id || "");
    if (!school || !user) return { summary: "결재 대기 없음", count: 0, items: [] };
    const limit = clamp(rawArgs.limit);
    try {
      const loadSchool = ctx.loadSchoolTodos || getSchoolTodosForUser;
      const loadCourse = ctx.loadCourseTodos || getCourseTodosForUser;
      const [schoolResult, courseResult] = await Promise.all([
        loadSchool(ctx.academyId, school, user, seasonId || null),
        seasonId ? loadCourse(ctx.academyId, school, user, seasonId) : Promise.resolve({ items: [] }),
      ]);
      const items = []
        .concat((schoolResult?.items || []).filter((item) => item?.kind === "approve"))
        .concat((courseResult?.items || []).filter((item) => item?.kind === "approve"))
        .map(project);
      const shown = items.slice(0, limit);
      return {
        summary: items.length ? `결재 대기 ${items.length}건` : "결재 대기 없음",
        count: items.length,
        truncated: items.length > shown.length,
        items: shown,
      };
    } catch (err) {
      logger.error(`alter get_pending_approvals: ${err.message}`);
      return {
        summary: "결재 대기를 불러오지 못했습니다.",
        error: "결재 대기를 불러오지 못했습니다.",
        items: [],
      };
    }
  },
});
