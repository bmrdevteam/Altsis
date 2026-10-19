/**
 * One dispatch entry. Read tools stay on their own names.
 * The handler does not run a draft until the confirmation plan says so.
 */

import { z } from "zod";
import { dispatchTurn } from "../../skills/dispatch.js";
import { defineTool } from "../defineTool.js";

const useSkill = defineTool({
  name: "use_skill",
  label: "스킬 호출",
  description:
    "양식 초안처럼 결과를 만드는 스킬을 호출합니다. 읽기 조회는 각 읽기 도구를 쓰세요. 확인 없이 저장하지 않습니다.",
  input: z
    .object({
      skillId: z.string(),
      request: z.string(),
    })
    .strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: false,
  effect: "write",
  chatOnly: true,
  meta: {
    kind: "draft",
    channel: "tool",
    confirmation: "none",
    studentAllowed: false,
    requiredRoles: ["owner", "admin", "manager", "teacher"],
    costTier: "low",
  },
  promptHints: [
    "시간표·출력 양식 문서를 만들어 달라는 요청이면 use_skill skillId form-draft 를 호출하세요. 읽기 도구로 양식 문서를 대신 만들지 마세요.",
    "request에는 사용자의 요청 문장을 그대로 적으세요. 확인 카드가 돌아오면 같은 스킬을 다시 호출하지 마세요.",
  ],
  include: () => true,
  async handler(ctx, input) {
    if (!ctx?.skillGate) {
      return { summary: "이 대화에서는 스킬을 호출할 수 없습니다.", readOnly: true };
    }
    const result = await dispatchTurn({
      skillId: input.skillId,
      request: input.request || ctx.message,
      skillGate: ctx.skillGate,
      ctx,
      academyId: ctx.academyId,
    });
    return {
      summary: result.text,
      draft: result.draft,
      confirmation: result.confirmation,
      readOnly: true,
    };
  },
});

export default useSkill;
