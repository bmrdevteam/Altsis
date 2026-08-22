import {
  adminFormTypeLabel,
  alterModeLabel,
  applyLabelForDraft,
  applyPolicyForDraft,
  buildPrepSummaryParts,
  buildRefineContentExcerpt,
  canActivateRefinePrompt,
  clipRefineExcerpt,
  fullscreenToggleLabel,
  isApplyDisabled,
  prepKindFromSkill,
  prepPrimaryLabel,
  reviewLevelToVariant,
  shouldDefaultCollapsePrep,
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

  test("reapply for document, form-response, activity, form, grade", () => {
    expect(applyPolicyForDraft(document)).toBe("reapply");
    expect(applyPolicyForDraft(formResponse)).toBe("reapply");
    expect(applyPolicyForDraft(activity)).toBe("reapply");
    expect(applyPolicyForDraft(grade)).toBe("reapply");
    expect(
      applyPolicyForDraft({
        kind: "form",
        title: "시간표",
        blocks: [],
      })
    ).toBe("reapply");
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
    expect(
      applyLabelForDraft(
        { kind: "form", title: "시간표", blocks: [] },
        false
      )
    ).toBe("에디터에 반영");
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
    expect(prepKindFromSkill(true, "form-draft")).toBe("form");
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

describe("alterModeLabel / prep summary", () => {
  test("mode labels", () => {
    expect(alterModeLabel(false)).toBe("질문");
    expect(alterModeLabel(true)).toBe("작성·점검");
  });

  test("default collapse for dense prep skills", () => {
    expect(shouldDefaultCollapsePrep("evaluation-draft")).toBe(true);
    expect(shouldDefaultCollapsePrep("archive-draft")).toBe(true);
    expect(shouldDefaultCollapsePrep("document-draft")).toBe(false);
    expect(shouldDefaultCollapsePrep("chat")).toBe(false);
  });

  test("buildPrepSummaryParts for evaluation and archive", () => {
    expect(
      buildPrepSummaryParts({
        prepKind: "evaluation",
        evalTargetCount: 2,
        evalStudentCount: 8,
        evalFillEmptyOnly: false,
      })
    ).toEqual(["항목 2", "학생 8", "종합 재작성"]);
    expect(
      buildPrepSummaryParts({
        prepKind: "archive",
        archiveTargetCount: 1,
        archiveStudentCount: 5,
        archiveFillEmptyOnly: true,
        archiveWriteMode: "sameText",
      })
    ).toEqual(["항목 1", "학생 5", "동일 문구", "빈 칸만"]);
    expect(
      buildPrepSummaryParts({
        prepKind: "form",
        formWriteMode: "refine",
        formTypeLabel: "시간표",
      })
    ).toEqual(["다듬기", "시간표"]);
  });

  test("adminFormTypeLabel", () => {
    expect(adminFormTypeLabel("timetable")).toBe("시간표");
    expect(adminFormTypeLabel("syllabus")).toBe("강의계획서");
    expect(adminFormTypeLabel("print")).toBe("출력");
  });

  test("canActivateRefinePrompt and fullscreenToggleLabel", () => {
    expect(canActivateRefinePrompt()).toBe(true);
    expect(canActivateRefinePrompt({ isRefining: true })).toBe(false);
    expect(canActivateRefinePrompt({ usageLimitExceeded: true })).toBe(false);
    expect(canActivateRefinePrompt({ isWorking: true })).toBe(false);
    expect(canActivateRefinePrompt({ attachUploading: true })).toBe(false);
    expect(fullscreenToggleLabel(false)).toBe("전체 화면");
    expect(fullscreenToggleLabel(true)).toBe("원래 크기");
  });

  test("buildRefineContentExcerpt uses outline and omits student names", () => {
    expect(
      buildRefineContentExcerpt({
        skill: "document-draft",
        document: {
          title: "저녁활동 안내",
          content: "# 공간\n본문\n## 수칙\n금지",
        },
      })
    ).toMatch(/목차: 공간 · 수칙/);
    expect(
      buildRefineContentExcerpt({
        skill: "evaluation-draft",
        evaluationTargets: ["멘토평가"],
      })
    ).toBe("작성 항목: 멘토평가");
    expect(
      buildRefineContentExcerpt({
        skill: "form-response-draft",
        formResponse: {
          formTitle: "기안",
          fields: [{ fieldId: "a", label: "목적" }],
          responses: { a: "체험학습" },
          targetFieldIds: ["a"],
        },
      })
    ).toMatch(/목적: 체험학습/);
    expect(clipRefineExcerpt("가".repeat(10), 4)).toBe("가가가가…");
  });
});
