import {
  normalizeActivityDraft,
  parseActivityDraftResponse,
} from "../../src/services/aiSkills.js";

describe("parseActivityDraftResponse", () => {
  it("parses <<<JSON>>> block", () => {
    const text = `<<<JSON>>>
{
  "title": "쉬는 시간 활동",
  "description": "테트리스",
  "fields": [
    { "label": "안내", "type": "content", "content": "# 안내\\n\\n\`\`\`html-app\\n<div>ok</div>\\n\`\`\`" },
    { "label": "이름", "type": "text", "required": true }
  ],
  "settings": { "quizMode": false, "requiredMode": true }
}
<<<END>>>`;
    const parsed = parseActivityDraftResponse(text);
    expect(parsed.title).toBe("쉬는 시간 활동");
    expect(parsed.fields).toHaveLength(2);
  });

  it("parses fenced json fallback", () => {
    const text = `\`\`\`json
{"title":"A","fields":[{"label":"q","type":"textarea"}]}
\`\`\``;
    const parsed = parseActivityDraftResponse(text);
    expect(parsed.title).toBe("A");
  });
});

describe("normalizeActivityDraft", () => {
  it("keeps html-app in content fields and drops unknown types", () => {
    const draft = normalizeActivityDraft({
      title: "퀴즈",
      description: "설명",
      fields: [
        {
          label: "안내",
          type: "content",
          content: "```html-app\n<div id='q'>hi</div>\n<script>1</script>\n```",
        },
        { label: "bad", type: "unknownType" },
        { label: "객관식", type: "radio", options: ["A", "B"], required: true },
      ],
      settings: { quizMode: true, assessmentMode: true },
    });
    expect(draft.fields).toHaveLength(2);
    expect(draft.fields[0].content).toContain("```html-app");
    expect(draft.fields[1].type).toBe("radio");
    expect(draft.fields[1].options).toEqual(["A", "B"]);
    expect(draft.settings.quizMode).toBe(true);
    expect(draft.settings.assessmentMode).toBe(false);
  });

  it("wraps raw interactive HTML in content into html-app", () => {
    const draft = normalizeActivityDraft({
      title: "게임",
      fields: [
        {
          label: "플레이",
          type: "content",
          content:
            "<style>.a{}</style><div id='app'></div><script>void 0</script>",
        },
      ],
      settings: {},
    });
    expect(draft.fields[0].content).toContain("```html-app");
    expect(draft.fields[0].content).toContain("<div id='app'>");
  });

  it("creates rubrics and links fields via rubricKeys", () => {
    const draft = normalizeActivityDraft(
      {
        title: "발표 평가",
        fields: [
          {
            label: "발표 내용",
            type: "textarea",
            gradingMethod: "rubric",
            rubricKeys: ["speaking"],
          },
          {
            label: "태도",
            type: "textarea",
            rubricIndexes: [1],
          },
        ],
        settings: { assessmentMode: true },
        rubrics: [
          {
            key: "speaking",
            title: "발표 루브릭",
            levels: [
              { label: "상", points: 3 },
              { label: "중", points: 2 },
              { label: "하", points: 1 },
            ],
          },
          {
            key: "attitude",
            title: "태도 루브릭",
            levels: [
              { label: "상", points: 2 },
              { label: "하", points: 1 },
            ],
          },
        ],
      },
      { formType: "assessment" }
    );
    expect(draft.settings.assessmentMode).toBe(true);
    expect(draft.rubrics).toHaveLength(2);
    expect(draft.fields[0].gradingMethod).toBe("rubric");
    expect(draft.fields[0].rubricIds).toEqual([draft.rubrics[0].id]);
    expect(draft.fields[1].gradingMethod).toBe("rubric");
    expect(draft.fields[1].rubricIds).toEqual([draft.rubrics[1].id]);
  });

  it("auto-creates default rubric and assigns to response fields", () => {
    const draft = normalizeActivityDraft(
      {
        title: "평가",
        fields: [
          { label: "안내", type: "content", content: "읽기" },
          { label: "성찰", type: "docResponse", content: "# 성찰\n" },
        ],
        settings: { assessmentMode: true },
        rubrics: [],
      },
      { formType: "assessment" }
    );
    expect(draft.rubrics.length).toBe(1);
    expect(draft.fields[1].gradingMethod).toBe("rubric");
    expect(draft.fields[1].rubricIds).toEqual([draft.rubrics[0].id]);
    expect(draft.fields[0].gradingMethod).toBeUndefined();
  });
});
