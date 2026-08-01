import {
  normalizeGuidelines,
  normalizeReferences,
  normalizeExamples,
  normalizeUserInputs,
  selectReferencesForPrompt,
  extractSyllabusInputFields,
  pickKeyExampleFields,
  examplesFromSyllabusInfo,
  buildStyleRubricFromExamples,
  formatCurrentInfoForPrompt,
  readSyllabusInfoValue,
  parseSyllabusReviewJson,
  parseGuidelinesTemplate,
  isValidGuidelinesTemplate,
  repairAndParseJson,
  PROMPT_LIMITS,
} from "../../src/services/aiPromptPolicy.js";

describe("aiPromptPolicy", () => {
  test("repairAndParseJson strips prose around object", () => {
    const parsed = repairAndParseJson('결과입니다:\n{"개설배경":"배경"}\n끝');
    expect(parsed["개설배경"]).toBe("배경");
  });

  test("repairAndParseJson repairs raw newlines inside strings", () => {
    const text = `{
  "개설배경": "첫 줄
두 번째 줄",
  "학습목표": "목표"
}`;
    const parsed = repairAndParseJson(text);
    expect(parsed["개설배경"]).toContain("첫 줄");
    expect(parsed["개설배경"]).toContain("두 번째 줄");
    expect(parsed["학습목표"]).toBe("목표");
  });

  test("normalizeGuidelines truncates", () => {
    const long = "가".repeat(PROMPT_LIMITS.GUIDELINES_CHARS + 50);
    const result = normalizeGuidelines(long);
    expect(result.length).toBeLessThanOrEqual(
      PROMPT_LIMITS.GUIDELINES_CHARS + 1
    );
  });

  test("normalizeReferences limits count and length", () => {
    const refs = [
      { title: "a", content: "x".repeat(2000) },
      { title: "b", content: "y" },
      { title: "c", content: "z" },
    ];
    const normalized = normalizeReferences(refs);
    expect(normalized).toHaveLength(PROMPT_LIMITS.REFERENCE_COUNT);
    expect(normalized[0].content.length).toBeLessThanOrEqual(
      PROMPT_LIMITS.REFERENCE_CHARS + 1
    );
  });

  test("selectReferencesForPrompt uses indexes", () => {
    const refs = [
      { title: "a", content: "A" },
      { title: "b", content: "B" },
      { title: "c", content: "C" },
    ];
    const selected = selectReferencesForPrompt(refs, [2, 0]);
    expect(selected.map((r) => r.title)).toEqual(["c", "a"]);
  });

  test("normalizeExamples truncates and limits fields", () => {
    const examples = {
      개설배경: "배경",
      학습목표: "가".repeat(PROMPT_LIMITS.EXAMPLE_CHARS + 20),
      기타: "x",
    };
    const normalized = normalizeExamples(examples, ["개설배경", "학습목표"]);
    expect(normalized["개설배경"]).toBe("배경");
    expect(normalized["학습목표"].length).toBeLessThanOrEqual(
      PROMPT_LIMITS.EXAMPLE_CHARS + 1
    );
    expect(normalized["기타"]).toBeUndefined();
  });

  test("normalizeUserInputs truncates", () => {
    const result = normalizeUserInputs({
      goal: "가".repeat(PROMPT_LIMITS.USER_GOAL_CHARS + 10),
      additionalCriteria: "기준",
    });
    expect(result.goal.length).toBeLessThanOrEqual(
      PROMPT_LIMITS.USER_GOAL_CHARS + 1
    );
    expect(result.additionalCriteria).toBe("기준");
  });

  test("extractSyllabusInputFields and pickKeyExampleFields", () => {
    const form = {
      data: [
        {
          type: "table",
          data: {
            table: [
              [
                {
                  type: "input",
                  id: "field-bg",
                  name: "개설배경",
                  required: true,
                },
                { type: "select", name: "수준" },
                { type: "input", name: "학습내용.1주차" },
                { type: "input", name: "기타메모" },
              ],
            ],
          },
        },
      ],
    };
    const fields = extractSyllabusInputFields(form);
    expect(fields.map((f) => f.name)).toEqual([
      "개설배경",
      "학습내용.1주차",
      "기타메모",
    ]);
    expect(fields[0]).toMatchObject({
      id: "field-bg",
      name: "개설배경",
      required: true,
    });
    const key = pickKeyExampleFields(fields.map((f) => f.name));
    expect(key[0]).toBe("개설배경");
    expect(key).toContain("학습내용.1주차");
  });

  test("formatCurrentInfoForPrompt reads values by cell id", () => {
    const fields = [
      { id: "field-bg", name: "개설배경", required: true },
      { id: "field-goal", name: "학습목표", required: false },
    ];
    const info = {
      "field-bg": "배경 본문",
      학습목표: "이름 키 하위 호환",
    };
    expect(readSyllabusInfoValue(info, fields[0])).toBe("배경 본문");
    const text = formatCurrentInfoForPrompt(info, fields);
    expect(text).toContain("개설배경");
    expect(text).toContain("배경 본문");
    expect(text).toContain("이름 키 하위 호환");
  });

  test("examplesFromSyllabusInfo extracts key fields", () => {
    const examples = examplesFromSyllabusInfo(
      {
        개설배경: "배경 설명입니다",
        학습내용1주차: "무시",
        "학습내용.1주차": "1주차 활동",
        빈값: "",
      },
      ["개설배경", "학습내용.1주차", "교재"]
    );
    expect(examples["개설배경"]).toBe("배경 설명입니다");
    expect(examples["학습내용.1주차"]).toBe("1주차 활동");
    expect(examples["교재"]).toBeUndefined();
  });

  test("buildStyleRubricFromExamples avoids raw topic dump", () => {
    const rubric = buildStyleRubricFromExamples({
      개설배경: "원시 도구로 이진수를 탐구하는 수업입니다. 협력합니다.",
    });
    expect(rubric).toContain("분량");
    expect(rubric).toContain("금지");
    expect(rubric).not.toContain("원시 도구로 이진수를");
  });

  test("parseSyllabusReviewJson normalizes items", () => {
    const review = parseSyllabusReviewJson(
      JSON.stringify({
        summary: "전반적으로 양호합니다.",
        overallLevel: "fair",
        items: [
          {
            field: "개설배경",
            level: "good",
            comment: "구체적입니다.",
            suggestion: "",
          },
        ],
      }),
      ["개설배경", "교재"]
    );
    expect(review.summary).toContain("양호");
    expect(review.items).toHaveLength(2);
    expect(review.items[0].level).toBe("good");
    expect(review.items[1]).toMatchObject({
      field: "교재",
      level: "empty",
    });
  });

  test("parseSyllabusReviewJson salvages truncated response", () => {
    const truncated = `{
  "summary": "목표와 활동 연결을 보강하면 좋겠습니다.",
  "overallLevel": "needs_work",
  "items": [
    { "field": "개설배경", "level": "fair", "comment": "의도는 분명합니다.", "suggestion": "학생 탐구를 한 문장 더 넣으세요." },
    { "field": "학습목표", "level": "needs_work", "comment": "관찰 가능한 동사로`;
    const review = parseSyllabusReviewJson(truncated, ["개설배경", "학습목표"]);
    expect(review.summary).toContain("목표와 활동");
    expect(review.overallLevel).toBe("needs_work");
    expect(review.items.some((i) => i.field === "개설배경")).toBe(true);
  });

  test("parseGuidelinesTemplate accepts Korean bullets only", () => {
    const ok = parseGuidelinesTemplate(`- 학생 주도·협력·성찰을 강조한다.
- 학습목표는 관찰 가능한 행동 동사로 작성한다.
- 주차별 계획은 활동 중심이며 평가와 연결한다.
- 문체는 공손한 문어체로 한다.`);
    expect(ok).toContain("학생 주도");
    expect(
      isValidGuidelinesTemplate(
        "Includes key elements?* Byeolmuri High, 2026 Q3, student-led"
      )
    ).toBe(false);
    expect(
      parseGuidelinesTemplate(
        "Includes key elements?* Byeolmuri High, 2026 Q3, student-led"
      )
    ).toBeNull();
  });
});
