/**
 * Wrapped search skill. The HTTP search skill still returns executeSearchSkill's shape.
 * Chat selects this only when the message names the id.
 */

import { z } from "zod";
import { defineSkill } from "../defineSkill.js";

export default defineSkill({
  id: "school-search",
  name: "학사 검색",
  description: "권한 있는 학사 데이터를 읽기 전용으로 찾습니다.",
  when: "출석·인원·성적처럼 학교 데이터를 찾아 달라고 할 때",
  tools: ["search_school_data"],
  input: z.object({ question: z.string() }).strict(),
  prompt:
    "이 스킬은 search_school_data만 사용한다. manage_schedule과 다른 도구는 부르지 않는다. SQL과 내부 오류는 말하지 않고, 검색 결과만 한국어로 짧게 말한다.",
  readOnly: true,
  permission: { roles: ["teacher"] },
});
