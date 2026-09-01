import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { TAltForm, TAssessmentData } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { TGradeDraft } from "pages/boards/altBoard/FieldAssessmentInline";
import { getFieldRubrics } from "pages/boards/altBoard/FieldRubricPanel";
import {
  gradeDraftFromAssessment,
  isAssessmentRowEmptyForGrade,
  isEmptyGradeDraft,
  mergeAssessmentGradeDraft,
  normalizeAssessmentGradeDraft,
  TAssessmentGradeDraftPayload,
} from "utils/assessmentGradeDraft";
import { finalizeChatSnapshot } from "utils/alterChatSnapshot";

type Params = {
  enabled: boolean;
  form: TAltForm | null | undefined;
  rows: TAltSheetRow[];
  currentRow: TAltSheetRow | null | undefined;
  gradeDraft: TGradeDraft;
  setGradeDraft: (
    next: TGradeDraft | ((prev: TGradeDraft) => TGradeDraft)
  ) => void;
  setRows: Dispatch<SetStateAction<TAltSheetRow[]>>;
  persistGrade: (rowId: string, draft: TGradeDraft) => Promise<TAltSheetRow>;
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

const rowFinalized = (row: TAltSheetRow | null | undefined) =>
  (row?.data?._assessment as TAssessmentData | undefined)?.final?.status ===
  "finalized";

const gradeDraftsEqual = (a: TGradeDraft, b: TGradeDraft) =>
  JSON.stringify(a.byField || {}) === JSON.stringify(b.byField || {}) &&
  String(a.final?.comment || "") === String(b.final?.comment || "");

/**
 * 평가 시트(표·문서 보기)에서 Navbar Alter에 채점 문맥을 등록한다.
 */
const useRegisterAlterAssessmentGrade = (params: Params) => {
  const { registerPageContext } = useAlter();
  const formRef = useRef(params.form);
  const rowsRef = useRef(params.rows);
  const rowRef = useRef(params.currentRow);
  const gradeDraftRef = useRef(params.gradeDraft);
  const setGradeDraftRef = useRef(params.setGradeDraft);
  const setRowsRef = useRef(params.setRows);
  const persistGradeRef = useRef(params.persistGrade);
  formRef.current = params.form;
  rowsRef.current = params.rows;
  rowRef.current = params.currentRow;
  gradeDraftRef.current = params.gradeDraft;
  setGradeDraftRef.current = params.setGradeDraft;
  setRowsRef.current = params.setRows;
  persistGradeRef.current = params.persistGrade;

  const formId = params.form?._id || "";
  const rowIdsKey = params.rows.map((r) => r._id).join(",");
  const currentRowId = params.currentRow?._id || "";

  useEffect(() => {
    if (!params.enabled || !formId || !rowIdsKey) return;

    const form = formRef.current;
    if (!form) return;
    const submitted = rowsRef.current.filter((r) => !r.isDraft);
    if (!submitted.length) return;

    return registerPageContext({
      pageType: "assessment-grade",
      label: `${form.title || "평가"} · ${submitted.length}명`,
      boardName: params.boardName,
      getChatSnapshot: (opts) => {
        const f = formRef.current;
        const list = rowsRef.current.filter((r) => !r.isDraft);
        if (!f || !list.length) return null;
        const cap = opts?.dataExpand ? 40 : 12;
        const items = list.slice(0, cap).map((r) => {
          const a = r.data?._assessment as TAssessmentData | undefined;
          const status =
            a?.final?.status === "finalized"
              ? "확정"
              : isAssessmentRowEmptyForGrade(r)
                ? "미채점"
                : "초안";
          return {
            title: r._respondentName || "응답",
            fields: {
              학번: r._respondentId || "",
              상태: status,
            },
          };
        });
        return finalizeChatSnapshot(
          {
            summary: `평가 채점 — ${f.title || "평가"} · ${list.length}명`,
            items,
            totalCount: list.length,
            isPartial: list.length > cap,
          },
          { dataExpand: opts?.dataExpand }
        );
      },
      getAssessmentGradeRows: () => {
        const f = formRef.current;
        const currentId = rowRef.current?._id;
        const currentDraft = gradeDraftRef.current;
        return rowsRef.current
          .filter((r) => !r.isDraft)
          .map((r) => {
            const fromRow = gradeDraftFromAssessment(
              r.data?._assessment as TAssessmentData | undefined
            );
            return {
              rowId: r._id,
              respondentName: r._respondentName,
              respondentId: r._respondentId,
              finalized: rowFinalized(r),
              empty: isAssessmentRowEmptyForGrade(r),
              currentDraft:
                r._id === currentId && f
                  ? {
                      byField: currentDraft.byField || {},
                      final: currentDraft.final || {},
                    }
                  : fromRow,
            };
          });
      },
      getAssessmentGradeContext: () => {
        const f = formRef.current;
        const r = rowRef.current || rowsRef.current.find((row) => !row.isDraft);
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
        for (const field of f.fields || []) {
          if (field.gradingMethod && field.gradingMethod !== "none") continue;
          if (field.type === "content" || field.type === "approval") continue;
          if (responses[field._id] != null) continue;
          const raw = serializeResponseValue(r.data?.[field._id]);
          if (!raw) continue;
          responses[field._id] = raw.slice(0, 800);
        }
        const useLiveDraft = r._id === rowRef.current?._id;
        return {
          formId: f._id,
          rowId: r._id,
          formTitle: f.title || "",
          boardName: params.boardName,
          respondentName: r._respondentName,
          respondentId: r._respondentId,
          finalized: rowFinalized(r),
          fields,
          responses,
          currentDraft: useLiveDraft
            ? {
                byField: draft.byField || {},
                final: draft.final || {},
              }
            : gradeDraftFromAssessment(
                r.data?._assessment as TAssessmentData | undefined
              ),
        };
      },
      applyGradeDraft: async (draft, opts) => {
        const f = formRef.current;
        if (!f) return { applied: false, appliedCount: 0, skipped: 0 };
        const fillEmptyOnly = !!opts?.fillEmptyOnly;
        const currentId = rowRef.current?._id || "";
        const items =
          Array.isArray(draft.rows) && draft.rows.length > 0
            ? draft.rows
            : [
                {
                  rowId: currentId || String(draft.rows?.[0]?.rowId || ""),
                  byField: draft.byField,
                  final: draft.final,
                },
              ];
        const rowMap = new Map(
          rowsRef.current.map((row) => [row._id, row] as const)
        );
        let appliedCount = 0;
        let skipped = 0;

        for (const item of items) {
          const rowId = String(item.rowId || "").trim();
          const row = rowMap.get(rowId);
          if (!row || row.isDraft || rowFinalized(row)) {
            skipped += 1;
            continue;
          }
          const incoming = normalizeAssessmentGradeDraft(
            f,
            item as TAssessmentGradeDraftPayload
          );
          if (isEmptyGradeDraft(incoming)) {
            skipped += 1;
            continue;
          }
          const current =
            rowId === currentId
              ? gradeDraftRef.current
              : gradeDraftFromAssessment(
                  row.data?._assessment as TAssessmentData | undefined
                );
          const merged = mergeAssessmentGradeDraft(current, incoming, {
            fillEmptyOnly,
          });
          if (gradeDraftsEqual(current, merged)) {
            skipped += 1;
            continue;
          }
          try {
            const saved = await persistGradeRef.current(rowId, merged);
            rowMap.set(rowId, saved);
            setRowsRef.current((prev) =>
              prev.map((r) => (r._id === saved._id ? saved : r))
            );
            if (rowId === currentId) {
              const fromSaved = gradeDraftFromAssessment(
                saved.data?._assessment as TAssessmentData | undefined
              );
              setGradeDraftRef.current(fromSaved);
            }
            appliedCount += 1;
          } catch {
            skipped += 1;
          }
        }

        return {
          applied: appliedCount > 0,
          appliedCount,
          skipped,
        };
      },
      suggestedSkills: ["assessment-grade", "chat"],
    });
  }, [
    params.enabled,
    formId,
    rowIdsKey,
    currentRowId,
    params.boardName,
    registerPageContext,
  ]);
};

export default useRegisterAlterAssessmentGrade;
