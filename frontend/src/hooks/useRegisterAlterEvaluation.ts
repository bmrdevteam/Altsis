import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { TFormEvaluation } from "types/seasons";
import {
  applyEvaluationCsvToEnrollments,
  buildEvaluationCsv,
} from "utils/evaluationCsv";

type Params = {
  enabled: boolean;
  label: string;
  classTitle: string;
  syllabusId: string;
  formEvaluation: TFormEvaluation;
  getEnrollments: () => any[];
  setEnrollments: (next: any[]) => void;
};

/**
 * 수업 평가 탭에서 Navbar Alter에 평가 초안 문맥을 등록한다.
 */
const useRegisterAlterEvaluation = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getEnrollmentsRef = useRef(params.getEnrollments);
  const setEnrollmentsRef = useRef(params.setEnrollments);
  getEnrollmentsRef.current = params.getEnrollments;
  setEnrollmentsRef.current = params.setEnrollments;

  const formKey = (params.formEvaluation || [])
    .map(
      (f) =>
        `${f.label}:${f.type}:${f.auth?.edit?.teacher ? 1 : 0}:${
          f.auth?.view?.student ? 1 : 0
        }`
    )
    .join("|");

  useEffect(() => {
    if (!params.enabled || !params.syllabusId) {
      registerPageContext(null);
      return () => registerPageContext(null);
    }

    const formEvaluation = params.formEvaluation || [];
    const downloadLabels = formEvaluation
      .filter(
        (item) => item.auth?.edit?.teacher || item.auth?.view?.student
      )
      .map((item) => item.label);
    const editableLabels = formEvaluation
      .filter((item) => item.auth?.edit?.teacher)
      .map((item) => item.label);

    registerPageContext({
      pageType: "evaluation",
      label: params.label,
      classTitle: params.classTitle,
      syllabusId: params.syllabusId,
      formEvaluation: params.formEvaluation,
      getEvaluationCsv: () =>
        buildEvaluationCsv(getEnrollmentsRef.current() || [], downloadLabels),
      getEvaluationRows: () =>
        (getEnrollmentsRef.current() || []).map((e) => ({
          studentId: String(e.studentId ?? "").trim(),
          studentName: e.studentName,
          studentGrade: e.studentGrade,
          evaluation: e.evaluation || {},
        })),
      applyEvaluationCsv: (csv, opts) => {
        const result = applyEvaluationCsvToEnrollments(
          getEnrollmentsRef.current() || [],
          csv,
          {
            fillEmptyOnly: opts.fillEmptyOnly,
            editableLabels,
          }
        );
        setEnrollmentsRef.current(result.enrollments);
        return {
          applied: result.applied,
          skipped: result.skipped,
          unknownIds: result.unknownIds,
        };
      },
      suggestedSkills: ["evaluation-draft", "chat"],
    });

    return () => registerPageContext(null);
  }, [
    params.enabled,
    params.label,
    params.classTitle,
    params.syllabusId,
    formKey,
    params.formEvaluation,
    registerPageContext,
  ]);
};

export default useRegisterAlterEvaluation;
