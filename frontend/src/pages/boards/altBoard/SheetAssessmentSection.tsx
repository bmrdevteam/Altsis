import { Dispatch, SetStateAction } from "react";
import style from "./altBoard.module.scss";
import Button from "components/button/Button";
import {
  TAltForm,
  TAssessmentData,
  TAssessmentFieldGrade,
  TAssessmentFieldRubricGrade,
  TFormRubric,
} from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { NO_PRINT_CLASS } from "utils/printArea";

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
  form: TAltForm;
  row: TAltSheetRow;
  canManage: boolean;
  gradeDraft: TGradeDraft;
  setGradeDraft: Dispatch<SetStateAction<TGradeDraft>>;
  isSavingGrade: boolean;
  onSave: (opts?: { finalize?: boolean; unfinalize?: boolean }) => void;
};

const AssessmentResultReadOnly = ({
  form,
  assessment,
}: {
  form: TAltForm;
  assessment: TAssessmentData;
}) => (
  <div className={style.quizScoreBanner}>
    <div className={style.quizScoreText}>
      <strong>평가 결과</strong>
      {assessment.final?.max != null && (
        <span>
          {" "}
          {assessment.final.score ?? 0} / {assessment.final.max}점
        </span>
      )}
      {assessment.final?.comment && (
        <div style={{ marginTop: 4, fontSize: 13 }}>
          {assessment.final.comment}
        </div>
      )}
      {Object.entries(assessment.byField || {}).map(
        ([fid, g]: [string, TAssessmentFieldGrade]) => {
          const field = form.fields.find((f) => f._id === fid);
          const byRubric = g?.byRubric || {};
          const entries = Object.entries(byRubric).filter(
            ([, rg]: [string, TAssessmentFieldRubricGrade]) => !!rg?.levelLabel
          );
          if (!entries.length && !g?.levelLabel && !g?.comment && g?.score == null) {
            return null;
          }
          return (
            <div
              key={fid}
              style={{ marginTop: 6, fontSize: 12, opacity: 0.95 }}
            >
              <div style={{ fontWeight: 600 }}>
                {field?.label || "항목"}
                {g?.score != null && g?.max != null
                  ? ` · ${g.score}/${g.max}점`
                  : ""}
              </div>
              {entries.map(([rid, rg]) => {
                const rubric = form.rubrics?.find((r) => r.id === rid);
                return (
                  <div key={rid}>
                    {rubric?.title ? `${rubric.title}: ` : ""}
                    {rg.levelLabel}
                    {rg.score != null ? ` (${rg.score}점)` : ""}
                  </div>
                );
              })}
              {!entries.length && g?.levelLabel && <div>{g.levelLabel}</div>}
              {g?.comment && <div>{g.comment}</div>}
            </div>
          );
        }
      )}
    </div>
  </div>
);

const SheetAssessmentSection = ({
  form,
  row,
  canManage,
  gradeDraft,
  setGradeDraft,
  isSavingGrade,
  onSave,
}: Props) => {
  const assessment = (row.data?._assessment || {}) as TAssessmentData;
  const finalized = assessment.final?.status === "finalized";

  if (!canManage) {
    if (finalized && row.data?._assessment) {
      return (
        <div className={style.docSection}>
          <div className={style.docSectionTitle}>평가</div>
          <AssessmentResultReadOnly form={form} assessment={assessment} />
        </div>
      );
    }
    return (
      <div className={style.docSection}>
        <div className={style.docSectionTitle}>평가</div>
        <div className={style.readonlyBanner}>
          <div className={style.readonlyBannerText}>
            <strong>평가 대기 중</strong>
            <span>평가가 확정되면 결과를 확인할 수 있습니다.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={style.docSection}>
      <div className={style.docSectionHeader}>
        <div className={style.docSectionTitle}>평가 · 채점</div>
        <span
          className={`${style.approvalBadge} ${
            finalized ? style.badgeApproved : style.badgePending
          }`}
        >
          {finalized ? "확정됨" : "초안"}
        </span>
      </div>

      <div className={style.quizScoreBanner}>
        <div className={style.quizScoreText}>
          <strong>
            평가: {finalized ? "확정됨" : "초안"}
          </strong>
          {assessment.final?.max != null && (
            <span>
              {" "}
              {assessment.final.score ?? 0} / {assessment.final.max}점
            </span>
          )}
          {assessment.final?.comment && (
            <span> · {assessment.final.comment}</span>
          )}
        </div>
      </div>

      <div className={style.assessmentGradePanel}>
        {(form.fields || [])
          .filter(
            (f) =>
              f.gradingMethod &&
              f.gradingMethod !== "none" &&
              f.permission === "respondent"
          )
          .map((field) => {
            const method = field.gradingMethod!;
            const draft = gradeDraft.byField[field._id] || {};
            const fieldRubricIds = field.rubricIds?.length
              ? field.rubricIds
              : field.rubricId
                ? [field.rubricId]
                : [];
            const fieldRubrics = fieldRubricIds
              .map((id) =>
                (form.rubrics || []).find((r: TFormRubric) => r.id === id)
              )
              .filter(Boolean) as TFormRubric[];

            return (
              <div key={field._id} className={style.assessmentFieldBlock}>
                <div className={style.assessmentFieldLabel}>
                  {field.label}
                  <span className={style.assessmentFieldMethod}>
                    (
                    {method === "completion"
                      ? "자기선언"
                      : method === "manual_score"
                        ? "수동 점수"
                        : fieldRubrics.length > 1
                          ? `루브릭 ${fieldRubrics.length}개`
                          : "루브릭"}
                    )
                  </span>
                </div>
                {(method === "manual_score" || method === "completion") && (
                  <div className={style.assessmentScoreRow}>
                    <input
                      className={style.filterInput}
                      type="number"
                      min={0}
                      max={field.points || 0}
                      style={{ width: 80 }}
                      value={draft.score ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed =
                          raw === "" ? undefined : Number(raw);
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
                  (fieldRubrics.length === 0 ? (
                    <div className={style.assessmentHint}>
                      연결된 루브릭이 없습니다. 양식 편집에서 루브릭을
                      선택하세요.
                    </div>
                  ) : (
                    fieldRubrics.map((rubric) => {
                      const rDraft =
                        draft.byRubric?.[rubric.id] ||
                        (fieldRubrics.length === 1
                          ? { levelId: draft.levelId }
                          : {});
                      return (
                        <div key={rubric.id} className={style.assessmentRubricBlock}>
                          <div className={style.assessmentHint}>{rubric.title}</div>
                          <select
                            className={style.filterInput}
                            style={{ maxWidth: 280 }}
                            value={rDraft.levelId || ""}
                            onChange={(e) => {
                              const levelId = e.target.value || undefined;
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
                                        [rubric.id]: {
                                          ...(prev.byRubric?.[rubric.id] || {}),
                                          levelId,
                                        },
                                      },
                                      levelId:
                                        fieldRubrics.length === 1
                                          ? levelId
                                          : prev.levelId,
                                    },
                                  },
                                };
                              });
                            }}
                          >
                            <option value="">수준 선택</option>
                            {(rubric.levels || []).map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.label}
                                {l.points != null ? ` (${l.points}점)` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })
                  ))}
                <input
                  className={style.filterInput}
                  placeholder="코멘트"
                  style={{ marginTop: 6, width: "100%" }}
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
            );
          })}

        <div className={style.assessmentFinalBlock}>
          <div className={style.assessmentFieldLabel}>최종 코멘트</div>
          <input
            className={style.filterInput}
            placeholder="학생에게 보여줄 코멘트 (선택)"
            style={{ marginTop: 6, width: "100%" }}
            value={gradeDraft.final.comment || ""}
            onChange={(e) =>
              setGradeDraft((p) => ({
                ...p,
                final: {
                  ...p.final,
                  comment: e.target.value,
                },
              }))
            }
          />
        </div>

        <div
          className={`${style.assessmentSaveBlock} ${style.noPrint} ${NO_PRINT_CLASS}`}
        >
          <div className={style.assessmentHint}>
            <strong>채점 저장</strong>: 초안으로만 저장합니다. 학생에게는 결과가
            보이지 않습니다.
            <br />
            <strong>평가 확정</strong>: 학생에게 평가 결과를 공개합니다.
          </div>
          <div className={style.docSectionActions}>
            <Button
              type="ghost"
              onClick={() => onSave()}
              disabled={isSavingGrade}
            >
              채점 저장
            </Button>
            {finalized ? (
              <Button
                type="ghost"
                onClick={() => onSave({ unfinalize: true })}
                disabled={isSavingGrade}
              >
                확정 취소
              </Button>
            ) : (
              <Button
                onClick={() => onSave({ finalize: true })}
                disabled={isSavingGrade}
              >
                평가 확정
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetAssessmentSection;
