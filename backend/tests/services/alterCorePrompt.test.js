import {
  ALTER_SAFETY_ETHICS,
  ALTER_NO_STEER,
  ALTER_HOWTO_COACH,
  ALTER_HOWTO_PRODUCT_NAV,
  ALTER_LIBRARY_REF_POLICY,
  ALTER_LIBRARY_REF_POLICY_HOWTO,
  ALTER_GUIDE_REF_POLICY,
  ALTER_PAGE_DATA_POLICY,
  buildAlterChatPageContext,
  buildAlterChatPageData,
  buildAlterChatSystemPrompt,
  buildBoardAlterSystemPrompt,
  withAlterSafety,
} from "../../src/services/alterCorePrompt.js";
import { buildHowtoCoachBlocks } from "../../src/services/aiSkills.js";

describe("ALTER_SAFETY_ETHICS", () => {
  test("미성년·유해·위기·개인정보·탈옥 거절을 포함한다", () => {
    expect(ALTER_SAFETY_ETHICS).toMatch(/미성년/);
    expect(ALTER_SAFETY_ETHICS).toMatch(/유해/);
    expect(ALTER_SAFETY_ETHICS).toMatch(/1388/);
    expect(ALTER_SAFETY_ETHICS).toMatch(/개인정보/);
    expect(ALTER_SAFETY_ETHICS).toMatch(/무시하거나 변경/);
  });
});

describe("buildAlterChatSystemPrompt", () => {
  test("빈 지침이면 학교 작성 지침 섹션과 학습목표 유도가 없다", () => {
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "general" },
      guidelines: "",
    });
    expect(text).toContain("[안전 지침");
    expect(text).toContain(ALTER_NO_STEER.split("\n")[0]);
    expect(text).not.toContain("## 학교 작성 지침");
    expect(text).not.toMatch(/학습목표/);
    expect(text).not.toMatch(/평가 정합성/);
    expect(text).toContain("일반");
  });

  test("지침이 있으면 학교 작성 지침 섹션에만 넣는다", () => {
    const text = buildAlterChatSystemPrompt({
      guidelines: "존중하는 문체로 작성",
      pageContext: { pageType: "docs", label: "학생부" },
    });
    expect(text).toContain("## 학교 작성 지침");
    expect(text).toContain("존중하는 문체로 작성");
    expect(text).toContain("문서함");
    expect(text).not.toMatch(/우선\s*답/);
  });

  test("howto off면 NO_STEER이고 코칭·예시 섹션이 없다", () => {
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "evaluation" },
      howtoMode: false,
      availableSkillsText: "## 이 화면에서 쓸 수 있는 스킬\n- 평가",
      examplePromptsText: "## 복붙용 예시\n- 테스트",
    });
    expect(text).toContain(ALTER_NO_STEER.split("\n")[0]);
    expect(text).not.toContain(ALTER_HOWTO_COACH.split("\n")[0]);
    expect(text).not.toContain("## 이 화면에서 쓸 수 있는 스킬");
    expect(text).not.toContain("## 복붙용 예시");
    expect(text).not.toContain("## 제품 경로");
  });

  test("howto on이면 COACH·제품경로·스킬·예시가 들어가고 NO_STEER는 없다", () => {
    const coach = buildHowtoCoachBlocks([
      "evaluation-draft",
      "chat",
    ]);
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "evaluation", label: "멘토평가" },
      howtoMode: true,
      availableSkillsText: coach.availableSkillsText,
      examplePromptsText: coach.examplePromptsText,
    });
    expect(text).toContain(ALTER_HOWTO_COACH.split("\n")[0]);
    expect(text).not.toContain(ALTER_NO_STEER.split("\n")[0]);
    expect(text).toContain("## 제품 경로");
    expect(text).toContain(ALTER_HOWTO_PRODUCT_NAV.split("\n")[0]);
    expect(text).toContain("설정 · Altsis 안내");
    expect(text).toContain("일반 기능");
    expect(text).toContain("상단 바 채팅");
    expect(text).toMatch(/DM|1:1/);
    expect(text).toContain("스킬로 대체");
    expect(text).toContain("syllabus-draft");
    expect(text).toContain("## 이 화면에서 쓸 수 있는 스킬");
    expect(text).toContain("평가");
    expect(text).toContain("## 복붙용 예시");
    expect(text).toContain("성장 포인트");
  });

  test("howto on이면 참고자료에 soft 정책을 쓰고 엄격 정책은 쓰지 않는다", () => {
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "general" },
      howtoMode: true,
      references: [{ title: "교육계획서", content: "수업 시수 안내" }],
    });
    expect(text).toContain(ALTER_LIBRARY_REF_POLICY_HOWTO);
    expect(text).not.toContain(ALTER_LIBRARY_REF_POLICY);
    expect(text).toContain("참고 자료");
    expect(text).toContain("교육계획서");
  });

  test("howto off면 참고자료에 엄격 라이브러리 정책을 쓴다", () => {
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "general" },
      howtoMode: false,
      references: [{ title: "교육계획서", content: "수업 시수 안내" }],
    });
    expect(text).toContain(ALTER_LIBRARY_REF_POLICY);
    expect(text).not.toContain(ALTER_LIBRARY_REF_POLICY_HOWTO);
  });

  test("docs pageContext는 사실만 넣고 기안 유도를 넣지 않는다", () => {
    const page = buildAlterChatPageContext({
      pageType: "docs",
      label: "High_02 학생부",
    });
    expect(page).toContain("문서함");
    expect(page).not.toMatch(/기안/);
    expect(page).not.toMatch(/영수증/);
  });

  test("공식 안내는 학교 참고와 분리되고 URL 금지 문구가 있다", () => {
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "general" },
      howtoMode: true,
      references: [{ title: "교육계획서", content: "수업 시수 안내" }],
      guideReferences: [
        { title: "문서 · 조각 1", content: "사이드바 문서 메뉴" },
      ],
    });
    expect(text).toContain(ALTER_GUIDE_REF_POLICY);
    expect(text).toContain("## Altsis 공식 안내");
    expect(text).toContain("사이드바 문서 메뉴");
    expect(text).toContain("본문에 URL");
    expect(text).toContain("## 참고 자료");
    expect(text).toContain("교육계획서");
  });

  test("guide pageContext 유형명이 나타난다", () => {
    expect(
      buildAlterChatPageContext({ pageType: "guide", label: "문서" })
    ).toContain("Altsis 안내");
  });
});

describe("buildHowtoCoachBlocks", () => {
  test("suggestedSkills가 없으면 chat만", () => {
    const { availableSkillsText, examplePromptsText } =
      buildHowtoCoachBlocks(undefined);
    expect(availableSkillsText).toContain("챗봇");
    expect(availableSkillsText).toContain("(chat)");
    expect(examplePromptsText).toContain("공통점");
  });
});

describe("buildAlterChatPageData", () => {
  test("스냅샷이 없으면 빈 문자열", () => {
    expect(buildAlterChatPageData(null)).toBe("");
    expect(buildAlterChatPageData(undefined)).toBe("");
  });

  test("요약·항목을 페이지 데이터 블록으로 만든다", () => {
    const text = buildAlterChatPageData({
      summary: "수강 신청 — 수업 1건",
      totalCount: 1,
      items: [
        {
          title: "시 읽기",
          fields: { 교과: "국어", 담당: "김선생" },
        },
      ],
    });
    expect(text).toContain("## 현재 페이지 데이터");
    expect(text).toContain("수강 신청");
    expect(text).toContain("시 읽기");
    expect(text).toContain("국어");
    expect(text).toContain("항목 수: 1");
    expect(text).not.toMatch(/포함 \d+ \/ 전체/);
  });

  test("긴 문서 필드가 500자에서 잘리지 않는다", () => {
    const body = `교과학습발달상황 ${"가".repeat(12000)}`;
    const text = buildAlterChatPageData({
      summary: "문서함 — 생활기록부",
      totalCount: 1,
      items: [{ title: "생활기록부", fields: { 내용: body } }],
    });
    expect(text).toContain("교과학습발달상황");
    expect(text.length).toBeGreaterThan(10000);
    expect(text).not.toContain("일부만 포함");
  });

  test("데이터 확대면 기본 50건을 넘어 더 많은 항목을 남긴다", () => {
    const items = Array.from({ length: 80 }, (_, i) => ({
      title: `응답 ${i}`,
      fields: { 칸: "x" },
    }));
    const defaultText = buildAlterChatPageData({
      summary: "시트",
      totalCount: 80,
      items,
    });
    expect(defaultText).toContain("포함 50 / 전체 80");
    expect(defaultText).toContain("### 응답 0");
    expect(defaultText).not.toContain("### 응답 60");

    const expandedText = buildAlterChatPageData(
      { summary: "시트", totalCount: 80, items, dataExpand: true },
      { dataExpand: true }
    );
    expect(expandedText).toContain("### 응답 60");
    expect(expandedText).toContain("항목 수: 80");
    expect(expandedText).not.toMatch(/포함 \d+ \/ 전체/);
  });

  test("일부만 포함되면 포함/전체 건수를 명시한다", () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      title: `수업 ${i}`,
      fields: { 학점: "1" },
    }));
    const text = buildAlterChatPageData({
      summary: "수업 목록",
      totalCount: 532,
      items,
      isPartial: true,
    });
    expect(text).toContain("포함 50 / 전체 532");
    // 매 턴 「데이터 확대」권유 문구는 넣지 않는다
    expect(text).not.toContain("데이터 확대");
  });

  test("시스템 프롬프트에 페이지 데이터 정책과 블록이 들어간다", () => {
    const text = buildAlterChatSystemPrompt({
      pageContext: { pageType: "course-list", label: "수강 신청" },
      chatSnapshot: {
        summary: "수강 신청 — 수업 2건",
        totalCount: 2,
        items: [{ title: "수업A", fields: { 학점: "2" } }],
      },
    });
    expect(text).toContain("현재 페이지 데이터");
    expect(text).toContain("제공된 항목 안에서");
    expect(text).toContain("수업A");
    expect(text).toContain("수업 목록");
    expect(ALTER_PAGE_DATA_POLICY).toMatch(/거절하지 마세요/);
  });
});

describe("withAlterSafety", () => {
  test("systemInstruction 앞에 안전을 붙이고 중복하지 않는다", () => {
    const once = withAlterSafety("You are Alter. Output JSON only.");
    expect(once.startsWith("[안전 지침")).toBe(true);
    expect(once).toContain("Output JSON only.");
    const twice = withAlterSafety(once);
    expect(twice).toBe(once);
  });
});

describe("buildBoardAlterSystemPrompt", () => {
  test("보드명과 공통 안전을 포함한다", () => {
    const text = buildBoardAlterSystemPrompt({ title: "진로보드" });
    expect(text).toContain("진로보드");
    expect(text).toContain("[안전 지침");
    expect(text).toMatch(/1388/);
  });
});
