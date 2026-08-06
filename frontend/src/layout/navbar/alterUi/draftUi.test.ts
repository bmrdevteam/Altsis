import {
  applyLabelForDraft,
  applyPolicyForDraft,
  isApplyDisabled,
  prepKindFromSkill,
  prepPrimaryLabel,
  reviewLevelToVariant,
} from "./draftUi";
import {
  TAlterActivityDraftResult,
  TAlterArchiveDraftResult,
  TAlterAssessmentGradeDraftResult,
  TAlterDocumentDraftResult,
  TAlterEvalDraftResult,
  TAlterFormResponseDraftResult,
  TAlterSyllabusDraftResult,
} from "./types";

const syllabus: TAlterSyllabusDraftResult = {
  kind: "syllabus",
  items: [{ field: "목표", value: "이해한다" }],
};

const evaluation: TAlterEvalDraftResult = {
  kind: "evaluation",
  targetLabels: ["멘토평가"],
  fillEmptyOnly: true,
  csv: "",
  rows: [],
};

const archive: TAlterArchiveDraftResult = {
  kind: "archive",
  targetLabels: ["종합의견"],
  fillEmptyOnly: true,
  rows: [],
};

const document: TAlterDocumentDraftResult = {
  kind: "document",
  title: "안내",
  content: "본문",
};

const formResponse: TAlterFormResponseDraftResult = {
  kind: "form-response",
  byField: { a: "x" },
};

const activity: TAlterActivityDraftResult = {
  kind: "activity",
  title: "퀴즈",
  fields: [],
};

const grade: TAlterAssessmentGradeDraftResult = {
  kind: "assessment-grade",
  byField: {},
};

describe("applyPolicyForDraft", () => {
  test("once for syllabus, evaluation, archive", () => {
    expect(applyPolicyForDraft(syllabus)).toBe("once");
    expect(applyPolicyForDraft(evaluation)).toBe("once");
    expect(applyPolicyForDraft(archive)).toBe("once");
  });

  test("reapply for document, form-response, activity, grade", () => {
    expect(applyPolicyForDraft(document)).toBe("reapply");
    expect(applyPolicyForDraft(formResponse)).toBe("reapply");
    expect(applyPolicyForDraft(activity)).toBe("reapply");
    expect(applyPolicyForDraft(grade)).toBe("reapply");
  });
});

describe("applyLabelForDraft / isApplyDisabled", () => {
  test("once labels and disabled after apply", () => {
    expect(applyLabelForDraft(syllabus, false)).toBe("계획서에 반영");
    expect(applyLabelForDraft(evaluation, false)).toBe("미리보기에 반영");
    expect(applyLabelForDraft(archive, true)).toBe("반영됨");
    expect(isApplyDisabled(syllabus, true)).toBe(true);
    expect(isApplyDisabled(syllabus, false)).toBe(false);
  });

  test("reapply labels stay enabled", () => {
    expect(applyLabelForDraft(document, false)).toBe("문서에 반영");
    expect(applyLabelForDraft(formResponse, false)).toBe("응답에 반영");
    expect(applyLabelForDraft(activity, false)).toBe("양식에 반영");
    expect(applyLabelForDraft(grade, false)).toBe("채점에 반영");
    expect(applyLabelForDraft(document, true)).toBe("다시 반영");
    expect(isApplyDisabled(document, true)).toBe(false);
  });
});

describe("prepPrimaryLabel", () => {
  test("document-review toggles 점검 labels", () => {
    expect(prepPrimaryLabel("document-review", [])).toBe("문서 점검");
    expect(
      prepPrimaryLabel("document-review", [
        { review: { summary: "", overallLevel: "fair", items: [] } },
      ])
    ).toBe("다시 점검");
  });

  test("assessment-grade and draft skills", () => {
    expect(prepPrimaryLabel("assessment-grade", [])).toBe("채점 초안 작성");
    expect(
      prepPrimaryLabel("assessment-grade", [{ draft: grade }])
    ).toBe("다시 작성");
    expect(prepPrimaryLabel("document", [])).toBe("초안 작성");
    expect(prepPrimaryLabel("document", [{ draft: document }])).toBe(
      "다시 작성"
    );
  });

  test("prepKindFromSkill", () => {
    expect(prepKindFromSkill(false, "document-draft")).toBeNull();
    expect(prepKindFromSkill(true, "document-draft")).toBe("document");
    expect(prepKindFromSkill(true, "chat")).toBeNull();
  });
});

describe("reviewLevelToVariant", () => {
  test("maps review levels", () => {
    expect(reviewLevelToVariant("good")).toBe("good");
    expect(reviewLevelToVariant("fair")).toBe("fair");
    expect(reviewLevelToVariant("empty")).toBe("empty");
    expect(reviewLevelToVariant("needs_work")).toBe("needs");
  });
});
