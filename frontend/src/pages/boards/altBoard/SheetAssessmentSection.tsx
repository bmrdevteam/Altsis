import { Dispatch, SetStateAction } from "react";
import style from "./altBoard.module.scss";
import Button from "components/button/Button";
import {
  TAltForm,
  TAssessmentData,
  TAssessmentFieldGrade,
  TAssessmentFieldRubricGrade,
} from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { NO_PRINT_CLASS } from "utils/printArea";
import { TGradeDraft } from "./FieldAssessmentInline";

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
        <div className={style.assessmentSummaryComment}>
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
          if (
            !entries.length &&
            !g?.levelLabel &&
            !g?.comment &&
            g?.score == null
          ) {
            return null;
          }
          return (
            <div key={fid} className={style.assessmentResultField}>
              <div className={style.assessmentResultFieldTitle}>
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

/** 문서 보기 하단: 총점·최종 코멘트·저장/확정 (항목 채점은 카드 인라인) */
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
  const hasScore = assessment.final?.max != null;

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
          <strong>총점</strong>
          {hasScore ? (
            <div className={style.assessmentSummaryScore}>
              {assessment.final?.score ?? 0} / {assessment.final?.max}점
            </div>
          ) : (
            <div className={style.assessmentSummaryMuted}>점수 미집계</div>
          )}
          {assessment.final?.comment && (
            <div className={style.assessmentSummaryComment}>
              {assessment.final.comment}
            </div>
          )}
        </div>
      </div>

      <div className={style.assessmentGradePanel}>
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
