import {
  buildAlterChatPageContext,
  SKILL_CATALOG,
  SKILL_IDS,
} from "../../src/services/aiSkills.js";
import { buildAlterChatPageContext as buildFromCore } from "../../src/services/alterCorePrompt.js";

describe("buildAlterChatPageContext", () => {
  test("aiSkills re-export와 core가 동일하다", () => {
    const ctx = { pageType: "docs", label: "테스트" };
    expect(buildAlterChatPageContext(ctx)).toBe(buildFromCore(ctx));
  });

  test("docs + 생기부 라벨은 사실만 넣고 기안/영수증·우선 답 유도를 넣지 않는다", () => {
    const text = buildAlterChatPageContext({
      pageType: "docs",
      label: "High_02. 학생부(2024~)[1학년 1학기]",
    });
    expect(text).toContain("문서함");
    expect(text).toContain("High_02");
    expect(text).not.toMatch(/우선\s*답/);
    expect(text).not.toMatch(/기안/);
    expect(text).not.toMatch(/영수증/);
    expect(text).not.toMatch(/결제/);
  });

  test("모든 pageType에서 주제 유도 문구가 없다", () => {
    const types = [
      "syllabus-edit",
      "evaluation",
      "archive",
      "document",
      "docs",
      "form-response",
      "activity",
      "assessment-grade",
      "general",
    ];
    for (const pageType of types) {
      const text = buildAlterChatPageContext({ pageType, label: "테스트" });
      expect(text).not.toMatch(/우선\s*답하세요/);
      expect(text).not.toMatch(/관련 질문에 우선/);
    }
  });

  test("form-response·assessment-grade 유형 명칭이 나타난다", () => {
    expect(
      buildAlterChatPageContext({ pageType: "form-response" })
    ).toContain("양식 응답");
    expect(
      buildAlterChatPageContext({ pageType: "assessment-grade" })
    ).toContain("평가 채점");
  });

  test("강의계획서 화면은 교과·수업명을 사실로 포함한다", () => {
    const text = buildAlterChatPageContext({
      pageType: "syllabus-edit",
      subject: ["국어", "문학"],
      classTitle: "시 읽기",
    });
    expect(text).toContain("강의계획서");
    expect(text).toContain("국어 > 문학");
    expect(text).toContain("시 읽기");
    expect(text).not.toMatch(/우선\s*답/);
  });
});

describe("SKILL_CATALOG descriptions", () => {
  test("상황 특화 예시 키워드를 넣지 않는다", () => {
    const banned = ["기안문", "영수증", "행동특성", "종합의견", "매뉴얼", "회의록"];
    for (const skill of Object.values(SKILL_CATALOG)) {
      for (const word of banned) {
        expect(skill.description).not.toContain(word);
      }
    }
  });

  test("응답 스킬은 능력 서술만 한다", () => {
    const desc = SKILL_CATALOG[SKILL_IDS.FORM_RESPONSE_DRAFT].description;
    expect(desc).toMatch(/양식 응답/);
    expect(desc).toMatch(/작성 칸/);
    expect(desc).not.toMatch(/기안/);
  });
});
