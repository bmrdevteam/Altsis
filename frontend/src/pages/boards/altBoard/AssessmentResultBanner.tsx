import style from "./altBoard.module.scss";
import {
  TAltForm,
  TAssessmentData,
  TAssessmentFieldGrade,
  TAssessmentFieldRubricGrade,
} from "types/altForm";

type Props = {
  form: TAltForm;
  assessment: TAssessmentData;
};

const labeledRubricEntries = (g: TAssessmentFieldGrade) =>
  Object.entries(g?.byRubric || {}).filter(
    ([, rg]: [string, TAssessmentFieldRubricGrade]) => !!rg?.levelLabel
  );

const AssessmentResultBanner = ({ form, assessment }: Props) => {
  const hasScore = assessment.final?.max != null;
  const fieldEntries = Object.entries(assessment.byField || {}).filter(
    ([, g]: [string, TAssessmentFieldGrade]) =>
      labeledRubricEntries(g).length > 0 ||
      !!g?.levelLabel ||
      !!g?.comment ||
      g?.score != null
  );

  return (
    <div className={`${style.quizScoreBanner} ${style.assessmentResultBanner}`}>
      <div className={style.assessmentResultHeader}>
        <div className={style.assessmentResultHeaderTop}>
          <span className={style.assessmentResultLabel}>평가 결과</span>
          {hasScore && (
            <span className={style.assessmentResultTotal}>
              {assessment.final?.score ?? 0}
              <span className={style.assessmentResultTotalSep}>/</span>
              {assessment.final?.max}
              <span className={style.assessmentResultTotalUnit}>점</span>
            </span>
          )}
        </div>
        {assessment.final?.comment && (
          <p className={style.assessmentResultFinalComment}>
            {assessment.final.comment}
          </p>
        )}
      </div>

      {fieldEntries.length > 0 && (
        <ul className={style.assessmentResultList}>
          {fieldEntries.map(([fid, g]) => {
            const field = form.fields.find((f) => f._id === fid);
            const entries = labeledRubricEntries(g);
            return (
              <li key={fid} className={style.assessmentResultItem}>
                <div className={style.assessmentResultItemHead}>
                  <span className={style.assessmentResultItemTitle}>
                    {field?.label || "항목"}
                  </span>
                  {g?.score != null && g?.max != null && (
                    <span className={style.assessmentResultItemScore}>
                      {g.score}/{g.max}점
                    </span>
                  )}
                </div>
                {(entries.length > 0 || g?.levelLabel) && (
                  <div className={style.assessmentResultLevelRow}>
                    {entries.map(([rid, rg]) => {
                      const rubric = form.rubrics?.find((r) => r.id === rid);
                      return (
                        <span key={rid} className={style.assessmentResultLevelChip}>
                          {rubric?.title ? `${rubric.title}: ` : ""}
                          {rg.levelLabel}
                          {rg.score != null ? ` (${rg.score}점)` : ""}
                        </span>
                      );
                    })}
                    {!entries.length && g?.levelLabel && (
                      <span className={style.assessmentResultLevelChip}>
                        {g.levelLabel}
                      </span>
                    )}
                  </div>
                )}
                {g?.comment && (
                  <p className={style.assessmentResultItemComment}>
                    {g.comment}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AssessmentResultBanner;
