export type FormApplyDraft = {
  confirmationId?: string;
  writeMode?: string;
  formType?: string;
  title?: string;
  blocks?: object[];
};

export type FormCreateBody = {
  type: "syllabus" | "timetable" | "print";
  title: string;
  data: object[];
};

const FORM_TYPES = new Set(["syllabus", "timetable", "print"]);

/** Body for POST /api/forms. Nothing here is saved until a confirmation succeeds. */
export const formCreateBody = (draft: FormApplyDraft): FormCreateBody => {
  const raw = String(draft?.formType || "");
  const type = FORM_TYPES.has(raw) ? (raw as FormCreateBody["type"]) : "timetable";
  const title = String(draft?.title || "").trim().slice(0, 80) || "양식 초안";
  return {
    type,
    title,
    data: Array.isArray(draft?.blocks) ? draft.blocks : [],
  };
};

/**
 * Apply is refused until a confirmation id exists.
 * An open editor receives the draft. Otherwise a new form is created from blocks.
 */
export const formApplyPlan = (draft: FormApplyDraft, hasEditor: boolean) => {
  if (!draft?.confirmationId) {
    return { ok: false as const, message: "확인 없이 양식에 반영할 수 없습니다." };
  }
  if (hasEditor) return { ok: true as const, target: "editor" as const };
  const blocks = Array.isArray(draft.blocks) ? draft.blocks : [];
  if (draft.writeMode === "refine" || blocks.length === 0) {
    return {
      ok: false as const,
      message: "양식 문서를 연 뒤 초안을 반영할 수 있습니다.",
    };
  }
  return { ok: true as const, target: "create" as const, body: formCreateBody(draft) };
};
