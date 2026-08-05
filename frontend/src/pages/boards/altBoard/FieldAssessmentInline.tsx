import { Dispatch, SetStateAction, useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import {
  TAltForm,
  TAltFormField,
  TAssessmentData,
  TAssessmentFieldGrade,
} from "types/altForm";
import { NO_PRINT_CLASS } from "utils/printArea";
import FieldRubricPanel, {
  getFieldRubrics,
  selectedLevelsFromDraft,
} from "./FieldRubricPanel";

export type TGradeDraft = {
  byField: Record<
    string,
    {
      score?: number;
      levelId?: string;
      comment?: string;
      byRubric?: Record<string, { levelId?: string; comment?: string }>;
    }
  >;
  final: { comment?: string };
};

type Props = {
  field: TAltFormField;
  form: TAltForm;
  canManage: boolean;
  /** 문서 수정 중이면 채점 컨트롤 숨김 */
  isEditingDoc?: boolean;
  gradeDraft: TGradeDraft;
  setGradeDraft: Dispatch<SetStateAction<TGradeDraft>>;
  assessment: TAssessmentData;
};

const methodBadgeLabel = (method: string, rubricCount: number): string => {
  if (method === "completion") return "자기선언";
  if (method === "manual_score") return "수동 점수";
  if (rubricCount > 1) return `루브릭 ${rubricCount}개`;
  return "루브릭";
};

const FieldAssessmentInline = ({
  field,
  form,
  canManage,
  isEditingDoc,
  gradeDraft,
  setGradeDraft,
  assessment,
}: Props) => {
  const method = field.gradingMethod;
  const rubrics = useMemo(
    () => getFieldRubrics(field, form.rubrics),
    [field, form.rubrics]
  );
  const finalized = assessment.final?.status === "finalized";
  const savedGrade = (assessment.byField || {})[field._id] as
    | TAssessmentFieldGrade
    | undefined;
  const draft = gradeDraft.byField[field._id] || {};

  const selectedByRubric = useMemo(() => {
    if (canManage) return selectedLevelsFromDraft(draft, rubrics);
    const out: Record<string, string | undefined> = {};
    const by = savedGrade?.byRubric || {};
    for (const rubric of rubrics) {
      const lid = by[rubric.id]?.levelId || savedGrade?.levelId;
      if (lid) out[rubric.id] = lid;
    }
    return out;
  }, [canManage, draft, rubrics, savedGrade]);

  const summaryText = useMemo(() => {
    if (!method || method === "none") return "";
    if (canManage) {
      const parts: string[] = [];
      if (method === "rubric") {
        const labels = rubrics
          .map((r) => {
            const id = selectedByRubric[r.id];
            const level = (r.levels || []).find((l) => l.id === id);
            return level
              ? `${level.label}${level.points != null ? ` (${level.points}점)` : ""}`
              : "";
          })
          .filter(Boolean);
        parts.push(labels.length ? labels.join(", ") : "수준 미선택");
      } else if (draft.score != null) {
        parts.push(`${draft.score} / ${field.points || 0}점`);
      } else {
        parts.push("점수 미입력");
      }
      if (draft.comment?.trim()) parts.push("코멘트 있음");
      return parts.join(" · ");
    }
    if (finalized) {
      const parts: string[] = [];
      if (savedGrade?.score != null && savedGrade?.max != null) {
        parts.push(`${savedGrade.score}/${savedGrade.max}점`);
      }
      if (savedGrade?.levelLabel) parts.push(savedGrade.levelLabel);
      if (savedGrade?.comment?.trim()) parts.push("코멘트 있음");
      return parts.length ? parts.join(" · ") : "평가 결과";
    }
    return method === "rubric" ? "평가 기준 보기" : "평가 안내";
  }, [
    canManage,
    method,
    rubrics,
    selectedByRubric,
    draft.score,
    draft.comment,
    field.points,
    finalized,
    savedGrade,
  ]);

  const [open, setOpen] = useState(() => canManage);

  if (!method || method === "none") return null;
  if (isEditingDoc) return null;

  const title = canManage ? "평가 · 채점" : "평가";

  // 응답자
  if (!canManage) {
    const hasBody =
      (method === "rubric" && rubrics.length > 0) || finalized;
    if (!hasBody) return null;

    return (
      <div
        className={`${style.assessmentFieldGrade} ${style.noPrint} ${NO_PRINT_CLASS}`}
      >
        <button
          type="button"
          className={style.assessmentFieldGradeToggle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={style.assessmentFieldGradeToggleMain}>
            <span className={style.assessmentFieldGradeToggleTitle}>
              {title}
            </span>
            <span className={style.assessmentFieldGradeToggleSummary}>
              {summaryText}
            </span>
          </span>
          <span className={style.rubricPanelToggleIcon} aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>
        {open && (
          <div className={style.assessmentFieldGradeBody}>
            {method === "rubric" && rubrics.length > 0 && (
              <FieldRubricPanel
                rubrics={rubrics}
                mode="criteria"
                selectedByRubric={finalized ? selectedByRubric : {}}
                toggleLabel="평가 기준 상세"
                defaultOpen={finalized}
              />
            )}
            {finalized && (
              <div className={style.assessmentInlineResult}>
                {savedGrade?.score != null && savedGrade?.max != null && (
                  <div className={style.assessmentInlineResultScore}>
                    {savedGrade.score} / {savedGrade.max}점
                  </div>
                )}
                {savedGrade?.levelLabel &&
                  !Object.keys(savedGrade.byRubric || {}).length && (
                    <div>{savedGrade.levelLabel}</div>
                  )}
                {savedGrade?.comment && (
                  <div className={style.assessmentInlineResultComment}>
                    <span className={style.assessmentCommentLabel}>코멘트</span>
                    {savedGrade.comment}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 관리자 채점
  return (
    <div
      className={`${style.assessmentFieldGrade} ${style.noPrint} ${NO_PRINT_CLASS}`}
    >
      <button
        type="button"
        className={style.assessmentFieldGradeToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={style.assessmentFieldGradeToggleMain}>
          <span className={style.assessmentFieldGradeToggleTitle}>
            {title}
            <span className={style.assessmentMethodBadge}>
              {methodBadgeLabel(method, rubrics.length)}
            </span>
          </span>
          <span className={style.assessmentFieldGradeToggleSummary}>
            {summaryText}
          </span>
        </span>
        <span className={style.rubricPanelToggleIcon} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className={style.assessmentFieldGradeBody}>
          {(method === "manual_score" || method === "completion") && (
            <div className={style.assessmentScoreRow}>
              <span className={style.assessmentCommentLabel}>점수</span>
              <input
                className={style.filterInput}
                type="number"
                min={0}
                max={field.points || 0}
                style={{ width: 80 }}
                value={draft.score ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const parsed = raw === "" ? undefined : Number(raw);
                  const score =
                    parsed === undefined || Number.isFinite(parsed)
                      ? parsed
                      : draft.score;
                  setGradeDraft((p) => ({
                    ...p,
                    byField: {
                      ...p.byField,
                      [field._id]: { ...draft, score },
                    },
                  }));
                }}
              />
              <span>/ {field.points || 0}점</span>
            </div>
          )}

          {method === "rubric" &&
            (rubrics.length === 0 ? (
              <div className={style.assessmentHint}>
                연결된 루브릭이 없습니다. 양식 편집에서 루브릭을 선택하세요.
              </div>
            ) : (
              <FieldRubricPanel
                rubrics={rubrics}
                mode="grade"
                selectedByRubric={selectedByRubric}
                onSelectLevel={(rubricId, levelId) => {
                  setGradeDraft((p) => {
                    const prev = p.byField[field._id] || {};
                    return {
                      ...p,
                      byField: {
                        ...p.byField,
                        [field._id]: {
                          ...prev,
                          byRubric: {
                            ...(prev.byRubric || {}),
                            [rubricId]: {
                              ...(prev.byRubric?.[rubricId] || {}),
                              levelId,
                            },
                          },
                          levelId:
                            rubrics.length === 1 ? levelId : prev.levelId,
                        },
                      },
                    };
                  });
                }}
                toggleLabel="전체 기준 보기"
              />
            ))}

          <div className={style.assessmentCommentBlock}>
            <label
              className={style.assessmentCommentLabel}
              htmlFor={`grade-comment-${field._id}`}
            >
              코멘트
              <span className={style.assessmentCommentOptional}> (선택)</span>
            </label>
            <textarea
              id={`grade-comment-${field._id}`}
              className={style.assessmentCommentInput}
              placeholder="이 항목에 대한 피드백을 입력하세요"
              rows={2}
              value={draft.comment || ""}
              onChange={(e) =>
                setGradeDraft((p) => ({
                  ...p,
                  byField: {
                    ...p.byField,
                    [field._id]: {
                      ...draft,
                      comment: e.target.value,
                    },
                  },
                }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldAssessmentInline;
