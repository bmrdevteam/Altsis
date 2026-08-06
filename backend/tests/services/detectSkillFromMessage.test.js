import { detectSkillFromMessage, SKILL_IDS } from "../../src/services/aiSkills.js";

describe("detectSkillFromMessage", () => {
  test("routes document review phrases to document-review", () => {
    expect(detectSkillFromMessage("문서를 지침에 맞게 점검해 주세요")).toBe(
      SKILL_IDS.DOCUMENT_REVIEW
    );
    expect(detectSkillFromMessage("생활기록부 검토")).toBe(
      SKILL_IDS.DOCUMENT_REVIEW
    );
    expect(detectSkillFromMessage("/document-review")).toBe(
      SKILL_IDS.DOCUMENT_REVIEW
    );
    expect(detectSkillFromMessage("점검")).toBe(SKILL_IDS.DOCUMENT_REVIEW);
  });

  test("keeps document draft phrases on document-draft", () => {
    expect(detectSkillFromMessage("문서 초안을 작성해 주세요")).toBe(
      SKILL_IDS.DOCUMENT_DRAFT
    );
  });

  test("keeps syllabus draft for plan phrases", () => {
    expect(detectSkillFromMessage("계획서 초안을 작성해 주세요")).toBe(
      SKILL_IDS.SYLLABUS_DRAFT
    );
    expect(detectSkillFromMessage("계획서 점검")).toBe(SKILL_IDS.SYLLABUS_DRAFT);
  });
});
