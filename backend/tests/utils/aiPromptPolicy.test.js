import {
  parseSyllabusJson,
  normalizeGuidelines,
  normalizeReferences,
  repairAndParseJson,
  alignContentToFields,
  PROMPT_LIMITS,
  AI_ERRORS,
} from "../../src/services/aiPromptPolicy.js";

describe("aiPromptPolicy", () => {
  test("parseSyllabusJson parses fenced json", () => {
    const text = '```json\n{"개설배경":"배경","학습목표":"목표"}\n```';
    const content = parseSyllabusJson(text, ["개설배경", "학습목표"]);
    expect(content["개설배경"]).toBe("배경");
    expect(content["학습목표"]).toBe("목표");
  });

  test("parseSyllabusJson rejects empty", () => {
    expect(() => parseSyllabusJson("")).toThrow(AI_ERRORS.EMPTY_RESPONSE);
  });

  test("parseSyllabusJson rejects invalid json", () => {
    expect(() => parseSyllabusJson("not json")).toThrow(AI_ERRORS.INVALID_JSON);
  });

  test("parseSyllabusJson repairs raw newlines inside strings", () => {
    const text = `{
  "개설배경": "첫 줄
두 번째 줄",
  "학습목표": "목표"
}`;
    const content = parseSyllabusJson(text, ["개설배경", "학습목표"]);
    expect(content["개설배경"]).toContain("첫 줄");
    expect(content["개설배경"]).toContain("두 번째 줄");
    expect(content["학습목표"]).toBe("목표");
  });

  test("parseSyllabusJson repairs unescaped quotes in values", () => {
    const text = `{"개설배경": "디지털 "리터러시" 교육", "학습목표": "목표"}`;
    const content = parseSyllabusJson(text, ["개설배경", "학습목표"]);
    expect(content["개설배경"]).toContain("리터러시");
    expect(content["학습목표"]).toBe("목표");
  });

  test("parseSyllabusJson recovers truncated json", () => {
    const text = `{"개설배경": "배경 설명", "학습목표": "목표 일부`;
    const content = parseSyllabusJson(text, ["개설배경", "학습목표"]);
    expect(content["개설배경"]).toBe("배경 설명");
    expect(content["학습목표"]).toContain("목표 일부");
  });

  test("parseSyllabusJson maps fuzzy field names", () => {
    const text = `{"개설 배경": "배경", "학습 목표": "목표"}`;
    const content = parseSyllabusJson(text, ["개설배경", "학습목표"]);
    expect(content["개설배경"]).toBe("배경");
    expect(content["학습목표"]).toBe("목표");
  });

  test("alignContentToFields falls back to order mapping", () => {
    const aligned = alignContentToFields(
      { a: "1", b: "2" },
      ["개설배경", "학습목표"]
    );
    expect(aligned["개설배경"]).toBe("1");
    expect(aligned["학습목표"]).toBe("2");
  });

  test("repairAndParseJson strips prose around object", () => {
    const parsed = repairAndParseJson('결과입니다:\n{"개설배경":"배경"}\n끝');
    expect(parsed["개설배경"]).toBe("배경");
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
});
