import {
  coerceFormResponseValue,
  parseFormResponseDraftResponse,
} from "../../src/services/formResponseDraft.js";

describe("parseFormResponseDraftResponse", () => {
  const fields = [
    { fieldId: "f1", type: "textarea", label: "사유" },
    { fieldId: "f2", type: "select", label: "구분", options: ["A", "B"] },
    { fieldId: "f3", type: "multiSelect", label: "태그", options: ["x", "y"] },
    { fieldId: "f4", type: "checkbox", label: "동의" },
    { fieldId: "f5", type: "docResponse", label: "기안문" },
    { fieldId: "f6", type: "link", label: "링크" },
  ];

  it("parses multiple field markers", () => {
    const text = `<<<FIELD f1 type=textarea>>>
안녕하세요
<<<END_FIELD>>>
<<<FIELD f2 type=select>>>
A
<<<END_FIELD>>>
<<<FIELD f4 type=checkbox>>>
true
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f1).toBe("안녕하세요");
    expect(byField.f2).toBe("A");
    expect(byField.f4).toBe(true);
  });

  it("rejects select values outside options", () => {
    const text = `<<<FIELD f2 type=select>>>
Z
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f2).toBeUndefined();
  });

  it("parses multiSelect JSON and filters options", () => {
    const text = `<<<FIELD f3 type=multiSelect>>>
["x","z","y"]
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f3).toEqual(["x", "y"]);
  });

  it("ignores unknown field ids", () => {
    const text = `<<<FIELD unknown type=text>>>
nope
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.unknown).toBeUndefined();
  });

  it("keeps html-app in docResponse", () => {
    const text = `<<<FIELD f5 type=docResponse>>>
# 제목

\`\`\`html-app
<div id="quiz">ok</div>
\`\`\`
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f5).toContain("```html-app");
    expect(byField.f5).toContain('<div id="quiz">ok</div>');
  });

  it("parses link JSON", () => {
    const text = `<<<FIELD f6 type=link>>>
{"url":"https://example.com"}
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f6).toEqual({ url: "https://example.com" });
  });

  it("resolves FIELD key by Korean label", () => {
    const text = `<<<FIELD 기안문 type=docResponse>>>
본문입니다
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f5).toBe("본문입니다");
  });

  it("resolves FIELD key with id= prefix (model quirk)", () => {
    const uuid = "19cf85ff-7393-4416-8799-d40d1630e07b";
    const meta = [
      { fieldId: uuid, type: "text", label: "제목" },
      { fieldId: "f5", type: "docResponse", label: "기안문" },
    ];
    const text = `<<<FIELD id=${uuid} type=text>>>
별무리학교 물품 구입 기안
<<<END_FIELD>>>
<<<FIELD id=f5 type=docResponse>>>
<<<SLOT (본문 작성)>>>
보고합니다.
<<<END_SLOT>>>
<<<END_FIELD>>>`;
    const { byField } = parseFormResponseDraftResponse(text, meta);
    expect(byField[uuid]).toBe("별무리학교 물품 구입 기안");
    expect(byField.f5).toContain("SLOT");
  });

  it("falls back free-form text into docResponse only when a single target field", () => {
    const text = `네, 요청하신 기안문입니다.

# 결제 요청

수신: 교장
경유: 행정실
내용: 첨부 양식을 참고하여 작성했습니다.`;
    const single = [{ fieldId: "f5", type: "docResponse", label: "기안문" }];
    const { byField } = parseFormResponseDraftResponse(text, single);
    expect(byField.f5).toContain("결제 요청");
    expect(byField.f5).toContain("행정실");
  });

  it("does not dump free-form text when multiple target fields", () => {
    const text = `네, 요청하신 기안문입니다.

# 결제 요청

수신: 교장`;
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f5).toBeUndefined();
    expect(Object.keys(byField)).toHaveLength(0);
  });

  it("recovers content when FIELD id is wrong and only one target field", () => {
    const text = `<<<FIELD draft type=docResponse>>>
# 결제 기안

수신: 교장
<<<END_FIELD>>>`;
    const single = [{ fieldId: "f5", type: "docResponse", label: "기안문" }];
    const { byField } = parseFormResponseDraftResponse(text, single);
    expect(byField.f5).toContain("결제 기안");
    expect(byField.f5).toContain("교장");
  });

  it("parses byField JSON object", () => {
    const text = JSON.stringify({
      byField: { f1: "사유 텍스트", f2: "A" },
    });
    const { byField } = parseFormResponseDraftResponse(text, fields);
    expect(byField.f1).toBe("사유 텍스트");
    expect(byField.f2).toBe("A");
  });
});

describe("coerceFormResponseValue", () => {
  const candidates = [
    { user: "oid1", userId: "u1", userName: "홍길동" },
  ];

  it("matches userSelect by userId", () => {
    expect(
      coerceFormResponseValue(
        { fieldId: "u", type: "userSelect" },
        { userId: "u1", userName: "홍길동" },
        candidates
      )
    ).toEqual(candidates[0]);
  });

  it("clamps number to max", () => {
    expect(
      coerceFormResponseValue(
        { fieldId: "n", type: "number", validation: { max: 10 } },
        99
      )
    ).toBe(10);
  });
});
