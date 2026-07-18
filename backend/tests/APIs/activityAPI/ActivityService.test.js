import {
  ACTIVITY_EVALUATION_MODE_VALUES,
  ACTIVITY_STATUS_VALUES,
  ACTIVITY_TYPE_VALUES,
  ACTIVITY_BUILTIN_TEMPLATE_DEFINITIONS,
  buildDefaultTemplatePreset,
  canEditActivityTemplate,
  canReadActivityTemplate,
  cloneTemplatePreset,
  resolveActivityEvaluationModeOrThrow,
  resolveActivityStatusOrThrow,
  resolveActivityTypeOrThrow,
} from "../../../src/services/activities.js";

describe("Activity service template helpers", () => {
  it("contains 3 builtin template types", () => {
    const builtinKeys = ACTIVITY_BUILTIN_TEMPLATE_DEFINITIONS.map(
      (template) => template.builtinKey
    ).sort();

    expect(builtinKeys).toEqual(["assignment", "discussion", "quiz"]);
  });

  it("buildDefaultTemplatePreset returns type preset and falls back to assignment", () => {
    const quizPreset = buildDefaultTemplatePreset("quiz");
    const fallbackPreset = buildDefaultTemplatePreset("unknown-type");

    expect(quizPreset.altFormSchema.fields.length).toBeGreaterThan(0);
    expect(
      quizPreset.altFormSchema.fields.some((field) => field._id === "quiz_answer")
    ).toBe(true);

    expect(fallbackPreset.altFormSchema.fields.length).toBeGreaterThan(0);
    expect(
      fallbackPreset.altFormSchema.fields.some(
        (field) => field._id === "assignment_answer"
      )
    ).toBe(true);
  });

  it("builtin presets always include a visible owner feedback field", () => {
    for (const type of ["assignment", "quiz", "discussion"]) {
      const preset = buildDefaultTemplatePreset(type);
      const feedbackField = preset.altFormSchema.fields.find(
        (field) => field.permission === "owner" && field.visibleToRespondent
      );

      expect(feedbackField).toBeDefined();
      expect(feedbackField.type).toBe("textarea");
      expect(feedbackField.label).toBe("교사 피드백");
    }
  });

  it("cloneTemplatePreset deep-clones and can regenerate field ids", () => {
    const original = {
      content: "테스트 안내",
      attachments: ["file-a"],
      altFormSchema: {
        fields: [
          {
            _id: "field_1",
            label: "답안",
            type: "textarea",
            permission: "respondent",
            required: true,
            options: [],
          },
        ],
        settings: {
          allowResubmit: true,
        },
      },
      rubric: [{ title: "성실도" }],
    };

    const cloned = cloneTemplatePreset(original, true);
    expect(cloned).not.toBe(original);
    expect(cloned.altFormSchema).not.toBe(original.altFormSchema);
    expect(cloned.altFormSchema.fields[0]._id).not.toBe("field_1");

    cloned.altFormSchema.fields[0].label = "변경됨";
    expect(original.altFormSchema.fields[0].label).toBe("답안");
  });
});

describe("Activity service template permissions", () => {
  const baseUser = {
    _id: "user-1",
    auth: "member",
  };

  const adminUser = {
    _id: "admin-1",
    auth: "admin",
  };

  it("canReadActivityTemplate handles builtin/personal/school scopes", () => {
    const builtinTemplate = { scope: "builtin", isActive: true };
    const personalTemplate = {
      scope: "personal",
      isActive: true,
      creator: "user-1",
    };
    const schoolTemplate = {
      scope: "school",
      isActive: true,
      school: "school-1",
    };

    expect(canReadActivityTemplate(builtinTemplate, baseUser, "school-1")).toBe(true);
    expect(canReadActivityTemplate(personalTemplate, baseUser, "school-1")).toBe(true);
    expect(
      canReadActivityTemplate(
        { ...personalTemplate, creator: "user-2" },
        baseUser,
        "school-1"
      )
    ).toBe(false);
    expect(canReadActivityTemplate(schoolTemplate, baseUser, "school-1")).toBe(true);
    expect(canReadActivityTemplate(schoolTemplate, baseUser, "school-2")).toBe(false);
    expect(canReadActivityTemplate(schoolTemplate, adminUser, "school-2")).toBe(true);
    expect(
      canReadActivityTemplate({ ...builtinTemplate, isActive: false }, baseUser, "school-1")
    ).toBe(false);
  });

  it("canEditActivityTemplate enforces editability and role rules", () => {
    const editablePersonalTemplate = {
      scope: "personal",
      isActive: true,
      isEditable: true,
      creator: "user-1",
    };

    expect(canEditActivityTemplate(editablePersonalTemplate, baseUser)).toBe(true);
    expect(
      canEditActivityTemplate(
        { ...editablePersonalTemplate, creator: "other-user" },
        baseUser
      )
    ).toBe(false);
    expect(
      canEditActivityTemplate(
        { ...editablePersonalTemplate, scope: "school", creator: "other-user" },
        adminUser
      )
    ).toBe(true);
    expect(
      canEditActivityTemplate(
        { ...editablePersonalTemplate, scope: "builtin" },
        adminUser
      )
    ).toBe(false);
    expect(
      canEditActivityTemplate(
        { ...editablePersonalTemplate, isEditable: false },
        baseUser
      )
    ).toBe(false);
    expect(
      canEditActivityTemplate({ ...editablePersonalTemplate, isActive: false }, baseUser)
    ).toBe(false);
  });
});

describe("Activity service enum validation", () => {
  it("supports expected activity enum sets", () => {
    expect(ACTIVITY_TYPE_VALUES).toEqual(["assignment", "quiz", "discussion"]);
    expect(ACTIVITY_STATUS_VALUES).toEqual(["draft", "published", "closed"]);
    expect(ACTIVITY_EVALUATION_MODE_VALUES).toEqual([
      "none",
      "feedback",
      "formal",
    ]);
  });

  it("resolves valid enum values and falls back when value is omitted", () => {
    expect(resolveActivityTypeOrThrow("quiz", "assignment")).toBe("quiz");
    expect(resolveActivityTypeOrThrow(undefined, "assignment")).toBe("assignment");

    expect(resolveActivityStatusOrThrow("published", "draft")).toBe("published");
    expect(resolveActivityStatusOrThrow("", "draft")).toBe("draft");

    expect(resolveActivityEvaluationModeOrThrow("formal", "feedback")).toBe(
      "formal"
    );
    expect(resolveActivityEvaluationModeOrThrow(undefined, "feedback")).toBe(
      "feedback"
    );
  });

  it("throws a 400-style error on invalid enum values", () => {
    expect(() => resolveActivityTypeOrThrow("invalid", "assignment")).toThrow(
      "TYPE_INVALID"
    );
    expect(() => resolveActivityStatusOrThrow("invalid", "draft")).toThrow(
      "STATUS_INVALID"
    );
    expect(() =>
      resolveActivityEvaluationModeOrThrow("invalid", "feedback")
    ).toThrow("EVALUATIONMODE_INVALID");
  });
});
