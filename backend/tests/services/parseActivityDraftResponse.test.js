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

  it("keeps weekdaySchedule and fills requiredResponseCount from occurrence estimate", () => {
    const draft = normalizeActivityDraft({
      title: "주간 운동 일지",
      fields: [{ label: "오늘 운동", type: "textarea", required: true }],
      settings: {
        allowMultipleResponses: true,
        requiredMode: true,
        openAt: "2026-08-13T00:00",
        closeAt: "2026-09-12T23:59",
        weekdaySchedule: {
          enabled: true,
          daysOfWeek: [1],
          startTime: "09:00",
          endTime: "23:59",
        },
      },
    });
    expect(draft.settings.requiredMode).toBe(true);
    expect(draft.settings.allowMultipleResponses).toBe(true);
    expect(draft.settings.openAt).toMatch(/2026-08-1[23]/);
    expect(draft.settings.closeAt).toBeTruthy();
    expect(draft.settings.weekdaySchedule).toEqual({
      enabled: true,
      daysOfWeek: [1],
      startTime: "09:00",
      endTime: "23:59",
      endDayOffset: 0,
    });
    expect(draft.settings.requiredResponseCount).toBeGreaterThanOrEqual(4);
    expect(draft.settings.requiredResponseCount).toBeLessThanOrEqual(5);
  });

  it("downgrades weekdaySchedule when openAt/closeAt are missing", () => {
    const draft = normalizeActivityDraft({
      title: "반복 과제",
      fields: [{ label: "일지", type: "textarea" }],
      settings: {
        weekdaySchedule: {
          enabled: true,
          daysOfWeek: [1],
          startTime: "09:00",
          endTime: "18:00",
        },
      },
    });
    expect(draft.settings.requiredMode).toBe(true);
    expect(draft.settings.allowMultipleResponses).toBe(true);
    expect(draft.settings.weekdaySchedule.enabled).toBe(false);
    expect(draft.settings.weekdaySchedule.daysOfWeek).toEqual([1]);
  });

  it("keeps http(s) links on content/docResponse and drops unsafe urls", () => {
    const draft = normalizeActivityDraft({
      title: "참고",
      fields: [
        {
          label: "안내",
          type: "content",
          content: "읽기",
          links: [
            { url: "https://example.com/a", title: "예제" },
            { url: "javascript:alert(1)", title: "악성" },
            { url: "http://school.example/b" },
            "https://plain.example/c",
          ],
        },
        {
          label: "이름",
          type: "text",
          links: [{ url: "https://should-not-keep.example" }],
        },
      ],
    });
    expect(draft.fields[0].links).toEqual([
      { url: "https://example.com/a", title: "예제" },
      { url: "http://school.example/b" },
      { url: "https://plain.example/c" },
    ]);
    expect(draft.fields[1].links).toBeUndefined();
  });

  it("keeps allowResubmit together with allowMultipleResponses", () => {
    const draft = normalizeActivityDraft({
      title: "일지",
      fields: [{ label: "오늘", type: "textarea" }],
      settings: {
        allowResubmit: true,
        allowMultipleResponses: true,
      },
    });
    expect(draft.settings.allowResubmit).toBe(true);
    expect(draft.settings.allowMultipleResponses).toBe(true);
  });

  it("normalizes access board vs groups and intersects writers", () => {
    const board = normalizeActivityDraft({
      title: "A",
      fields: [{ label: "q", type: "text" }],
      access: { members: "board", writers: "board" },
    });
    expect(board.access).toEqual({
      members: "board",
      writers: "board",
    });

    const groups = normalizeActivityDraft({
      title: "B",
      fields: [{ label: "q", type: "text" }],
      access: {
        members: { groups: ["student", "teacher", "ghost"] },
        writers: { groups: ["teacher", "manager"] },
      },
    });
    expect(groups.access.members).toEqual({
      groups: { manager: false, teacher: true, student: true },
    });
    expect(groups.access.writers).toEqual({
      groups: { manager: false, teacher: true, student: false },
    });

    const omitted = normalizeActivityDraft({
      title: "C",
      fields: [{ label: "q", type: "text" }],
    });
    expect(omitted.access).toBeUndefined();
  });

  it("drops access users and empty groups", () => {
    const draft = normalizeActivityDraft({
      title: "D",
      fields: [{ label: "q", type: "text" }],
      access: {
        members: {
          groups: { student: true },
          users: [{ userId: "stu1" }],
        },
        writers: { groups: [] },
      },
    });
    expect(draft.access).toEqual({
      members: { groups: { manager: false, teacher: false, student: true } },
    });
  });
});
