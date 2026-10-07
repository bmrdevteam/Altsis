/**
 * Chat-only screen summary. The page fields already on the turn are enough.
 */

import { z } from "zod";
import { buildAlterChatPageContext } from "../../../services/alterCorePrompt.js";
import { defineTool } from "../defineTool.js";

const chatOnly = (deps = {}) => deps.includeScheduleTool !== false && !deps.includeTriggerTool;

export default defineTool({
  name: "get_current_screen",
  label: "현재 화면",
  description: "이 대화의 현재 화면 유형과 라벨만 읽습니다. 화면 밖 데이터는 만들지 않습니다.",
  input: z.object({}).strict(),
  permission: { roles: ["teacher", "student"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "지금 보고 있는 화면이 필요할 때만 get_current_screen을 호출하세요. 화면 밖 학생·성적·규정은 이 도구로 만들지 마세요.",
  ],
  include: chatOnly,
  async handler(ctx) {
    const screen = ctx?.screen && typeof ctx.screen === "object" ? ctx.screen : {};
    const summary = buildAlterChatPageContext(screen);
    return {
      summary: summary || "현재 화면 정보가 없습니다.",
      pageType: String(screen.pageType || "general"),
    };
  },
});
