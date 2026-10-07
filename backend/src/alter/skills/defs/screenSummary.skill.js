/**
 * Wrapped screen-summary skill. Teachers and students can read their own screen.
 */

import { z } from "zod";
import { defineSkill } from "../defineSkill.js";

export default defineSkill({
  id: "screen-summary",
  name: "화면 요약",
  description: "지금 보고 있는 화면의 유형과 라벨만 요약합니다.",
  when: "현재 화면이 무엇인지 물어볼 때",
  tools: ["get_current_screen"],
  input: z.object({}).strict(),
  prompt:
    "이 스킬은 get_current_screen만 사용한다. 화면에 없는 학생·성적·규정은 만들지 않는다. 화면 요약만 한국어로 짧게 말한다.",
  readOnly: true,
  permission: { roles: ["teacher", "student"] },
});
