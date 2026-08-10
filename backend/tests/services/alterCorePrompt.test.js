import {
  ALTER_SAFETY_ETHICS,
  ALTER_NO_STEER,
  ALTER_PAGE_DATA_POLICY,
  buildAlterChatPageContext,
  buildAlterChatPageData,
  buildAlterChatSystemPrompt,
  buildBoardAlterSystemPrompt,
  withAlterSafety,
} from "../../src/services/alterCorePrompt.js";

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

  test("docs pageContext는 사실만 넣고 기안 유도를 넣지 않는다", () => {
    const page = buildAlterChatPageContext({
      pageType: "docs",
      label: "High_02 학생부",
    });
    expect(page).toContain("문서함");
    expect(page).not.toMatch(/기안/);
    expect(page).not.toMatch(/영수증/);
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
    expect(text).toContain("데이터 확대");
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
