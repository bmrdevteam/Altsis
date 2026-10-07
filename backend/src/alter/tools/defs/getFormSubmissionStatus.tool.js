/**
 * Who has submitted a class form. Counts, and names only when the sheet
 * already shows them. Login ids stay out.
 */

import { z } from "zod";
import { logger } from "../../../log/logger.js";
import { defineTool } from "../defineTool.js";
import { gateTeacher } from "../lib/readGate.js";
import { asObjectId, loadSubmissionStatus } from "../lib/submissionStatus.js";

export default defineTool({
  name: "get_form_submission_status",
  label: "제출 현황",
  description: "담당 수업과 내가 기록을 보는 교사 보드의 제출·미제출 인원. 양식 이름으로 찾습니다. 답안과 로그인 아이디는 포함하지 않습니다.",
  input: z
    .object({
      query: z.string().optional().describe("양식 또는 보드 이름"),
      formId: z.string().optional(),
      boardId: z.string().optional(),
    })
    .strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "양식 제출·미제출 인원은 get_form_submission_status입니다. 사용자가 말한 양식이나 보드 이름을 query에 넣으세요. 식별 번호는 사용자에게 묻거나 답에 쓰지 마세요.",
    "맡거나 관리하는 수업과, 기록 전체를 이미 보는 교사 보드만 나옵니다. 다른 교사 수업은 없다고 말하고 이름과 인원을 만들지 마세요.",
    "후보가 여러 개면 양식 이름만 알려 고르게 하세요. 인원 수와 이름만 말하고, 로그인 아이디·연락처·답안은 말하지 마세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const gate = await gateTeacher(ctx);
    if (!gate.ok) return { ...gate.error, forms: [] };
    const formId = asObjectId(rawArgs.formId);
    const boardId = asObjectId(rawArgs.boardId);
    const query = String(rawArgs.query || "").trim().slice(0, 120);
    if ((rawArgs.formId || rawArgs.boardId) && !formId && !boardId && !query) {
      return { summary: "양식을 찾을 수 없습니다.", error: "양식을 찾을 수 없습니다.", forms: [] };
    }
    try {
      const load = ctx.loadSubmissionStatus || loadSubmissionStatus;
      return await load({
        academyId: ctx.academyId,
        user: ctx.user,
        school: ctx.school,
        schoolRole: ctx.registration?.role || null,
        formId,
        boardId,
        query,
      });
    } catch (err) {
      logger.error(`alter get_form_submission_status: ${err.message}`);
      return {
        summary: "제출 현황을 불러오지 못했습니다.",
        error: "제출 현황을 불러오지 못했습니다.",
        forms: [],
      };
    }
  },
});
