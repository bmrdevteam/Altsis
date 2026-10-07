/**
 * Wrapped credit-regulation skill. Chat selects this only when the message names the id.
 */

import { z } from "zod";
import { defineSkill } from "../defineSkill.js";

export default defineSkill({
  id: "credit-rules",
  name: "학점 규정",
  description: "학교 라이브러리에 있는 학점·이수 규정만 읽습니다.",
  when: "학점, 졸업, 이수 규정을 물어볼 때",
  tools: ["lookup_credit_rules"],
  input: z.object({ query: z.string().optional() }).strict(),
  prompt:
    "이 스킬은 lookup_credit_rules만 사용한다. 도구에 없는 규정은 만들지 않는다. 찾은 규정만 한국어로 짧게 말한다.",
  readOnly: true,
  permission: { roles: ["teacher"] },
});
