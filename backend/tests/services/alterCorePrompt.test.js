import {
  ALTER_SAFETY_ETHICS,
  ALTER_NO_STEER,
  buildAlterChatPageContext,
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
