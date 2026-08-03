import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { TSchoolFormArchiveField } from "types/schools";
import { isEmptyEval } from "utils/evaluationCsv";

type Params = {
  enabled: boolean;
  archiveLabel: string;
  formArchiveFields: TSchoolFormArchiveField[];
  getArchiveList: () => any[];
  setArchiveList: (next: any[]) => void;
  onApplied?: () => void;
};

/**
 * 기록(object/array) 화면에서 Navbar Alter에 기록 초안 문맥을 등록한다.
 * getArchiveList 는 학생당 1행(필드 값이 펼쳐진 객체)을 반환하면 된다.
 */
const useRegisterAlterArchive = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getArchiveListRef = useRef(params.getArchiveList);
  const setArchiveListRef = useRef(params.setArchiveList);
  const onAppliedRef = useRef(params.onApplied);
  getArchiveListRef.current = params.getArchiveList;
  setArchiveListRef.current = params.setArchiveList;
  onAppliedRef.current = params.onApplied;

  const formKey = (params.formArchiveFields || [])
    .map((f) => `${f.label}:${f.type}`)
    .join("|");

  useEffect(() => {
    if (!params.enabled || !params.archiveLabel) {
      registerPageContext(null);
      return () => registerPageContext(null);
    }

    const fields = params.formArchiveFields || [];
    const editableLabels = fields
      .filter((f) => f?.label && f.type === "input")
      .map((f) => f.label);
    /** 작성·참고에 쓸 수 있는 텍스트성 항목 (파일 제외) */
    const referenceLabels = fields
      .filter(
        (f) =>
          f?.label &&
          (f.type === "input" ||
            f.type === "input-number" ||
            f.type === "select")
      )
      .map((f) => f.label);

    registerPageContext({
      pageType: "archive",
      label: params.archiveLabel,
      archiveLabel: params.archiveLabel,
      formArchiveFields: fields,
      getArchiveRows: () =>
        (getArchiveListRef.current() || []).map((row) => {
          const values: Record<string, unknown> = {};
          for (const label of referenceLabels) {
            values[label] = row?.[label];
          }
          return {
            studentId: String(row.user ?? "").trim(),
            studentName: row.userName,
            studentGrade: row.grade,
            archiveId: row._id ? String(row._id) : undefined,
            registrationId: row.registration
              ? String(row.registration)
              : undefined,
            values,
          };
        }),
      applyArchiveDraft: (draft, opts) => {
        const fillEmptyOnly =
          opts.fillEmptyOnly ?? draft.fillEmptyOnly !== false;
        const targetLabels =
          Array.isArray(draft.targetLabels) && draft.targetLabels.length > 0
            ? draft.targetLabels
            : editableLabels;
        const allowed = new Set(editableLabels);
        const list = [...(getArchiveListRef.current() || [])];
        const byStudent = new Map(
          list.map((row, idx) => [String(row.user ?? "").trim(), idx])
        );
        let applied = 0;
        let skipped = 0;
        const unknownIds: string[] = [];

        for (const row of draft.rows || []) {
          const studentId = String(row.studentId || "").trim();
          if (!studentId) continue;
          const idx = byStudent.get(studentId);
          if (idx == null) {
            unknownIds.push(studentId);
            continue;
          }
          const values =
            row.values && typeof row.values === "object" ? row.values : {};
          for (const label of targetLabels) {
            if (!allowed.has(label)) continue;
            const next = values[label];
            if (next == null || String(next).trim() === "") continue;
            const current = list[idx]?.[label];
            if (fillEmptyOnly && !isEmptyEval(current)) {
              skipped += 1;
              continue;
            }
            list[idx] = { ...list[idx], [label]: String(next) };
            applied += 1;
          }
        }

        setArchiveListRef.current(list);
        onAppliedRef.current?.();
        return { applied, skipped, unknownIds };
      },
      suggestedSkills: ["archive-draft", "chat"],
    });

    return () => registerPageContext(null);
  }, [
    params.enabled,
    params.archiveLabel,
    formKey,
    params.formArchiveFields,
    registerPageContext,
  ]);
};

export default useRegisterAlterArchive;
