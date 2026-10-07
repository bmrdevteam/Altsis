/**
 * Example skill for the framework. Real skills are wrapped in N2.
 * Chat does not select this unless the message names the id.
 */

import { z } from "zod";
import { defineSkill } from "../defineSkill.js";

export default defineSkill({
  id: "fixture-brief",
  name: "픽스처 브리핑",
  description: "등록된 할 일 도구만으로 이번 주 할 일을 확인하는 예시 스킬.",
  when: "이번 주 할 일을 등록된 할 일 도구만으로 확인할 때",
  tools: ["get_my_todos"],
  input: z.object({ note: z.string().optional() }).strict(),
  prompt:
    "이 스킬은 get_my_todos만 사용한다. manage_schedule과 search_product_guide는 부르지 않는다. 할 일 결과만 한국어로 짧게 말한다.",
  readOnly: true,
  permission: { roles: ["teacher"] },
});
