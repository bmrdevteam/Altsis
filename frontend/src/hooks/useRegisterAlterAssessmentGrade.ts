import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { TAltForm } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { TGradeDraft } from "pages/boards/altBoard/FieldAssessmentInline";
import { getFieldRubrics } from "pages/boards/altBoard/FieldRubricPanel";
import {
  mergeAssessmentGradeDraft,
  normalizeAssessmentGradeDraft,
  TAssessmentGradeDraftPayload,
} from "utils/assessmentGradeDraft";

type Params = {
  enabled: boolean;
  form: TAltForm | null | undefined;
  row: TAltSheetRow | null | undefined;
  gradeDraft: TGradeDraft;
  setGradeDraft: (
    next: TGradeDraft | ((prev: TGradeDraft) => TGradeDraft)
  ) => void;
  boardName?: string;
};

const serializeResponseValue = (value: unknown): string => {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * 기록 문서 보기(평가 채점)에서 Navbar Alter에 채점 문맥을 등록한다.
 */
const useRegisterAlterAssessmentGrade = (params: Params) => {
  const { registerPageContext } = useAlter();
  const formRef = useRef(params.form);
  const rowRef = useRef(params.row);
  const gradeDraftRef = useRef(params.gradeDraft);
  const setGradeDraftRef = useRef(params.setGradeDraft);
  formRef.current = params.form;
  rowRef.current = params.row;
  gradeDraftRef.current = params.gradeDraft;
  setGradeDraftRef.current = params.setGradeDraft;

  const formId = params.form?._id || "";
  const rowId = params.row?._id || "";
  const finalized =
    (params.row?.data?._assessment as { final?: { status?: string } } | undefined)
      ?.final?.status === "finalized";

  useEffect(() => {
    if (!params.enabled || !formId || !rowId) {
      registerPageContext(null);
      return () => registerPageContext(null);
    }

    const form = formRef.current;
    const row = rowRef.current;
    if (!form || !row) {
      registerPageContext(null);
      return () => registerPageContext(null);
    }

    const respondentLabel = [
      row._respondentName,
      row._respondentId ? `(${row._respondentId})` : "",
    ]
      .filter(Boolean)
      .join(" ");

    registerPageContext({
      pageType: "assessment-grade",
      label: `${form.title || "평가"} · ${respondentLabel || "응답"}`,
      boardName: params.boardName,
      getAssessmentGradeContext: () => {
        const f = formRef.current;
        const r = rowRef.current;
        const draft = gradeDraftRef.current;
        if (!f || !r) {
          return {
            formId: "",
            rowId: "",
            formTitle: "",
            finalized: false,
            fields: [],
            responses: {},
            currentDraft: { byField: {}, final: {} },
          };
        }
        const gradeFields = (f.fields || []).filter(
          (field) => field.gradingMethod && field.gradingMethod !== "none"
        );
        const fields = gradeFields.map((field) => {
          const rubrics = getFieldRubrics(field, f.rubrics).map((rubric) => ({
            id: rubric.id,
            title: rubric.title,
            levels: (rubric.levels || []).map((lv) => ({
              id: lv.id,
              label: lv.label,
              description: lv.description || "",
              points: lv.points,
            })),
          }));
          return {
            fieldId: field._id,
            label: field.label,
            gradingMethod: field.gradingMethod || "none",
            points: field.points,
            rubrics,
          };
        });
        const responses: Record<string, string> = {};
        for (const field of gradeFields) {
          responses[field._id] = serializeResponseValue(
            r.data?.[field._id]
          ).slice(0, 4000);
        }
        // 채점 대상이 아닌 응답도 짧게 참고용으로
        for (const field of f.fields || []) {
          if (field.gradingMethod && field.gradingMethod !== "none") continue;
          if (field.type === "content" || field.type === "approval") continue;
          if (responses[field._id] != null) continue;
          const raw = serializeResponseValue(r.data?.[field._id]);
          if (!raw) continue;
          responses[field._id] = raw.slice(0, 800);
        }
        return {
          formId: f._id,
          rowId: r._id,
          formTitle: f.title || "",
          boardName: params.boardName,
          respondentName: r._respondentName,
          respondentId: r._respondentId,
          finalized:
            (r.data?._assessment as { final?: { status?: string } } | undefined)
              ?.final?.status === "finalized",
          fields,
          responses,
          currentDraft: {
            byField: draft.byField || {},
            final: draft.final || {},
          },
        };
      },
      applyGradeDraft: (draft, opts) => {
        const f = formRef.current;
        if (!f) return { applied: false };
        if (
          (rowRef.current?.data?._assessment as
            | { final?: { status?: string } }
            | undefined)?.final?.status === "finalized"
        ) {
          return { applied: false };
        }
        const normalized = normalizeAssessmentGradeDraft(
          f,
          draft as TAssessmentGradeDraftPayload
        );
        const hasField = Object.keys(normalized.byField).length > 0;
        const hasFinal = normalized.final?.comment !== undefined;
        if (!hasField && !hasFinal) return { applied: false };

        setGradeDraftRef.current((prev) =>
          mergeAssessmentGradeDraft(prev, normalized, {
            fillEmptyOnly: opts?.fillEmptyOnly,
          })
        );
        return { applied: true };
      },
      suggestedSkills: ["assessment-grade", "chat"],
    });

    return () => registerPageContext(null);
  }, [
    params.enabled,
    formId,
    rowId,
    finalized,
    params.boardName,
    registerPageContext,
  ]);
};

export default useRegisterAlterAssessmentGrade;
