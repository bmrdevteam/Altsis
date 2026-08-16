import { nextFieldLabel, FIELD_TYPE_LABELS } from "./formFieldLabel";

describe("nextFieldLabel", () => {
  test("uses the type label when unused", () => {
    expect(nextFieldLabel("text", [])).toBe("단답형");
    expect(nextFieldLabel("content", ["질문"])).toBe("안내 문서");
  });

  test("appends 2, 3, … when the base label is taken", () => {
    expect(nextFieldLabel("text", ["단답형"])).toBe("단답형 2");
    expect(nextFieldLabel("text", ["단답형", "단답형 2"])).toBe("단답형 3");
    expect(nextFieldLabel("text", [" 단답형 "])).toBe("단답형 2");
  });

  test("does not skip to a gap after a higher number only", () => {
    expect(nextFieldLabel("radio", ["객관식 2"])).toBe("객관식");
  });

  test("covers all field type labels", () => {
    expect(FIELD_TYPE_LABELS.docResponse).toBe("응답 문서");
    expect(FIELD_TYPE_LABELS.approval).toBe("승인");
    expect(FIELD_TYPE_LABELS.aiChat).toBe("AI 챗봇");
  });
});
