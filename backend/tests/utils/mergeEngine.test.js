import {
  MERGE_MAX_OUTPUT,
  MERGE_MAX_ROWS,
  parseSheetDeclaration,
  renderMerge,
  stripUnsupportedMergeTags,
} from "../../src/utils/mergeEngine.js";

const fieldId = "f1";
const fields = [{ _id: fieldId, label: "이름" }];

function row(name, extra = {}) {
  return {
    data: { [fieldId]: name },
    _respondentName: name,
    _respondentId: "u1",
    ...extra,
  };
}

describe("mergeEngine core", () => {
  test("parses sheet declaration", () => {
    expect(parseSheetDeclaration("{{#sheet 체험}}\n본문").sheetName).toBe(
      "체험"
    );
  });

  test("replaces variables and _count", () => {
    const { content, stripped, truncated } = renderMerge(
      "총 {{_count}}명 — {{이름}} / {{_respondentName}}",
      [row("홍길동"), row("김철수")],
      fields
    );
    expect(content).toBe("총 2명 — 홍길동 / 홍길동");
    expect(stripped).toBe(false);
    expect(truncated).toBe(false);
  });

  test("renders table and each", () => {
    const { content } = renderMerge(
      "{{#table 이름}}\n{{#each}}- {{이름}}\n{{/each}}",
      [row("A"), row("B")],
      fields
    );
    expect(content).toContain("| 이름 |");
    expect(content).toContain("| A |");
    expect(content).toContain("| B |");
    expect(content).toContain("- A");
    expect(content).toContain("- B");
  });

  test("applies filter and sort", () => {
    const scoreId = "f2";
    const scoreFields = [
      { _id: fieldId, label: "이름" },
      { _id: scoreId, label: "점수" },
    ];
    const rows = [
      { data: { [fieldId]: "A", [scoreId]: 50 }, _respondentName: "A" },
      { data: { [fieldId]: "B", [scoreId]: 90 }, _respondentName: "B" },
      { data: { [fieldId]: "C", [scoreId]: 80 }, _respondentName: "C" },
    ];
    const { content } = renderMerge(
      '{{#filter 점수 > 60}}\n{{#sort 점수 desc}}\n{{#each}}{{이름}}:{{점수}}\n{{/each}}',
      rows,
      scoreFields
    );
    expect(content.indexOf("B:90")).toBeLessThan(content.indexOf("C:80"));
    expect(content).not.toContain("A:50");
  });
});

describe("mergeEngine strip unsupported", () => {
  test("strips if/else blocks including content", () => {
    const { body, stripped } = stripUnsupportedMergeTags(
      '앞{{#if 상태 == "승인"}}승인문{{#else}}미승인{{/if}}뒤'
    );
    expect(stripped).toBe(true);
    expect(body).toBe("앞뒤");
    expect(body).not.toContain("승인");
  });

  test("strips form/input tags", () => {
    const { body, stripped } = stripUnsupportedMergeTags(
      "{{#form 결석계}}\n본인 {{#input 이름}} 입니다"
    );
    expect(stripped).toBe(true);
    expect(body).not.toContain("#form");
    expect(body).not.toContain("#input");
    expect(body).toContain("본인");
    expect(body).toContain("입니다");
  });

  test("strips group and aggregates", () => {
    const { body, stripped } = stripUnsupportedMergeTags(
      "{{#group 학년}}x{{/group}}{{#sum 점수}}{{#avg 점수}}{{#unique 이름}}"
    );
    expect(stripped).toBe(true);
    expect(body).toBe("");
  });

  test("renderMerge strips unsupported tags then renders core", () => {
    const { content, stripped } = renderMerge(
      '{{#if 이름 == "홍길동"}}숨김{{/if}}이름:{{이름}}',
      [row("홍길동")],
      fields
    );
    expect(stripped).toBe(true);
    expect(content).toBe("이름:홍길동");
    expect(content).not.toContain("숨김");
  });
});

describe("mergeEngine dollar-safe replace", () => {
  test("field values with $& and $1 do not corrupt output", () => {
    const { content } = renderMerge("값:{{이름}}", [row("$& $1 $$")], fields);
    expect(content).toBe("값:$& $1 $$");
  });

  test("literal dollars in surrounding template remain", () => {
    const { content } = renderMerge(
      "가격 $100 — {{이름}} — 끝$&",
      [row("홍길동")],
      fields
    );
    expect(content).toBe("가격 $100 — 홍길동 — 끝$&");
  });
});

describe("mergeEngine caps", () => {
  test("truncates rows beyond MERGE_MAX_ROWS", () => {
    const rows = Array.from({ length: MERGE_MAX_ROWS + 50 }, (_, i) =>
      row(`n${i}`)
    );
    const { content, truncated } = renderMerge(
      "건수:{{_count}}\n{{#each}}{{이름}}\n{{/each}}",
      rows,
      fields
    );
    expect(truncated).toBe(true);
    expect(content).toContain(`건수:${MERGE_MAX_ROWS}`);
    expect(content).toContain(`n${MERGE_MAX_ROWS - 1}`);
    expect(content).not.toContain(`n${MERGE_MAX_ROWS}`);
  });

  test("truncates oversized output", () => {
    const long = "x".repeat(5000);
    const rows = Array.from({ length: 300 }, () => row(long));
    const { content, truncated } = renderMerge(
      "{{#each}}{{이름}}\n{{/each}}",
      rows,
      fields
    );
    expect(truncated).toBe(true);
    expect(content.length).toBeLessThanOrEqual(MERGE_MAX_OUTPUT + 80);
    expect(content).toContain("출력이 너무 길어");
  });
});
