import {
  MAX_INDENT,
  TOOLBAR_INDENT_STEP,
  canIndentFromSpace,
  canOutdentFromBackspace,
  clampIndent,
  countLeadingIndentChars,
  formatIndentPadding,
  isBlockIndentTarget,
  isInsideList,
  leadingSpaceFix,
  nextIndent,
  parseIndentFromPadding,
} from "./blockIndent";

describe("clampIndent / nextIndent", () => {
  test("정수를 0–16으로 자른다", () => {
    expect(clampIndent(0)).toBe(0);
    expect(clampIndent(2)).toBe(2);
    expect(clampIndent(-1)).toBe(0);
    expect(clampIndent(99)).toBe(MAX_INDENT);
    expect(clampIndent(2.6)).toBe(3);
    expect(clampIndent("3")).toBe(3);
    expect(clampIndent("x")).toBe(0);
    expect(clampIndent(null)).toBe(0);
  });

  test("delta를 더해 다음 indent를 만든다", () => {
    expect(nextIndent(0, 1)).toBe(1);
    expect(nextIndent(1, TOOLBAR_INDENT_STEP)).toBe(3);
    expect(nextIndent(1, -1)).toBe(0);
    expect(nextIndent(15, 4)).toBe(MAX_INDENT);
  });
});

describe("parseIndentFromPadding / formatIndentPadding", () => {
  test("Nch만 그대로 저장 형식으로 쓴다", () => {
    expect(formatIndentPadding(2)).toBe("2ch");
    expect(formatIndentPadding(0)).toBe("0ch");
  });

  test("ch·em·px를 indent로 읽는다", () => {
    expect(parseIndentFromPadding("2ch")).toBe(2);
    expect(parseIndentFromPadding(" 4ch ")).toBe(4);
    expect(parseIndentFromPadding("2em")).toBe(4);
    expect(parseIndentFromPadding("16px")).toBe(2);
    expect(parseIndentFromPadding("0")).toBe(0);
    expect(parseIndentFromPadding("")).toBe(0);
    expect(parseIndentFromPadding("2url(x)")).toBe(0);
    expect(parseIndentFromPadding("auto")).toBe(0);
    expect(parseIndentFromPadding("-2ch")).toBe(0);
    expect(parseIndentFromPadding("99ch")).toBe(MAX_INDENT);
  });
});

describe("countLeadingIndentChars", () => {
  test("선행 스페이스·nbsp·탭만 센다", () => {
    expect(countLeadingIndentChars("가. 학생명")).toBe(0);
    expect(countLeadingIndentChars("  가. 학생명")).toBe(2);
    expect(countLeadingIndentChars("\u00a0\u00a0가")).toBe(2);
    expect(countLeadingIndentChars("\t가")).toBe(2);
    expect(countLeadingIndentChars("")).toBe(0);
  });
});

describe("list / target guards", () => {
  test("문단·제목만 indent 대상이다", () => {
    expect(isBlockIndentTarget("paragraph")).toBe(true);
    expect(isBlockIndentTarget("heading")).toBe(true);
    expect(isBlockIndentTarget("listItem")).toBe(false);
  });

  test("목록 조상이 있으면 목록으로 본다", () => {
    expect(isInsideList(["paragraph", "listItem", "bulletList"])).toBe(true);
    expect(isInsideList(["paragraph", "taskItem", "taskList"])).toBe(true);
    expect(isInsideList(["paragraph", "doc"])).toBe(false);
  });
});

describe("canIndentFromSpace / canOutdentFromBackspace", () => {
  const base = {
    emptySelection: true,
    parentName: "paragraph",
    ancestorNames: ["paragraph", "doc"],
    atBlockStart: true,
  };

  test("줄 맨 앞 Space만 indent로 받는다", () => {
    expect(canIndentFromSpace(base)).toBe(true);
    expect(canIndentFromSpace({ ...base, emptySelection: false })).toBe(false);
    expect(canIndentFromSpace({ ...base, atBlockStart: false })).toBe(false);
    expect(
      canIndentFromSpace({
        ...base,
        ancestorNames: ["paragraph", "listItem", "bulletList"],
      })
    ).toBe(false);
    expect(canIndentFromSpace({ ...base, parentName: "codeBlock" })).toBe(
      false
    );
  });

  test("indent가 있을 때만 맨 앞 Backspace로 내어쓴다", () => {
    expect(canOutdentFromBackspace({ ...base, indent: 2 })).toBe(true);
    expect(canOutdentFromBackspace({ ...base, indent: 0 })).toBe(false);
    expect(
      canOutdentFromBackspace({
        ...base,
        indent: 2,
        ancestorNames: ["paragraph", "listItem"],
      })
    ).toBe(false);
  });
});

describe("leadingSpaceFix", () => {
  test("선행 공백을 deleteLen과 다음 indent로 바꾼다", () => {
    expect(
      leadingSpaceFix({
        pos: 10,
        nodeName: "paragraph",
        indent: 0,
        ancestorNames: ["paragraph"],
        firstText: "  가. 학생명",
      })
    ).toEqual({ pos: 10, deleteLen: 2, nextIndent: 2 });
  });

  test("목록이거나 선행 공백이 없으면 null이다", () => {
    expect(
      leadingSpaceFix({
        pos: 0,
        nodeName: "paragraph",
        indent: 0,
        ancestorNames: ["listItem"],
        firstText: "  가",
      })
    ).toBeNull();
    expect(
      leadingSpaceFix({
        pos: 0,
        nodeName: "paragraph",
        indent: 0,
        ancestorNames: ["paragraph"],
        firstText: "가. 학생명",
      })
    ).toBeNull();
  });
});
