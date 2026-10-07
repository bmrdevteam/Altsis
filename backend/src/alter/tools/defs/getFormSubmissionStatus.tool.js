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
  description: "담당하거나 관리하는 수업 양식의 제출·미제출 인원. 답안과 로그인 아이디는 포함하지 않습니다.",
  input: z
    .object({
      formId: z.string().optional(),
      boardId: z.string().optional(),
    })
    .strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "특정 양식이나 보드의 제출·미제출 인원은 get_form_submission_status입니다. formId 또는 boardId가 있을 때만 호출하세요.",
    "담당하거나 관리하는 수업만 볼 수 있습니다. 다른 교사 수업은 없다고 말하고 이름을 만들지 마세요.",
    "인원 수와 이름만 말하세요. 로그인 아이디·연락처·답안은 말하지 마세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const gate = await gateTeacher(ctx);
    if (!gate.ok) return { ...gate.error, forms: [] };
    const formId = asObjectId(rawArgs.formId);
    const boardId = asObjectId(rawArgs.boardId);
    if ((rawArgs.formId || rawArgs.boardId) && !formId && !boardId) {
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
