import style from "./altBoard.module.scss";
import { TAltForm, TAltFormField, TFormRubric } from "types/altForm";
import { TAssessmentGradeChatPayload } from "types/aiChat";
import {
  getFieldRubrics,
  selectedLevelsFromDraft,
} from "./FieldRubricPanel";

type GradeEntry = NonNullable<TAssessmentGradeChatPayload["byField"]>[string];

type Props = {
  form: TAltForm;
  payload: TAssessmentGradeChatPayload;
};

const GradeFieldBlock = ({
  field,
  form,
  grade,
}: {
  field: TAltFormField;
  form: TAltForm;
  grade: GradeEntry;
}) => {
  const fromField = getFieldRubrics(field, form.rubrics);
  const byRubric = grade.byRubric || {};
  const rubrics =
    fromField.length > 0
      ? fromField
      : (Object.keys(byRubric)
          .map((id) => (form.rubrics || []).find((r) => r.id === id))
          .filter(Boolean) as TFormRubric[]);
  const selectedByRubric = selectedLevelsFromDraft(grade, rubrics);
  const heading = field.label?.trim() || "항목";
  const comment = grade.comment?.trim();

  return (
    <div className={style.aiChatGradeField}>
      <div className={style.assessmentFieldLabel}>{heading}</div>
      {rubrics.map((rubric) => {
        const selectedId = selectedByRubric[rubric.id] || "";
        const rubricComment = byRubric[rubric.id]?.comment?.trim();
        return (
          <div key={rubric.id} className={style.assessmentRubricBlock}>
            <div className={style.assessmentRubricTitle}>{rubric.title}</div>
            <div
              className={style.assessmentLevelChipRow}
              role="list"
              aria-label={`${rubric.title || "루브릭"} 수준`}
            >
              {(rubric.levels || []).map((level) => {
                const selected = selectedId === level.id;
                return (
                  <span
                    key={level.id}
                    role="listitem"
                    className={`${style.assessmentLevelChip} ${
                      style.assessmentLevelChipReadonly
                    } ${selected ? style.assessmentLevelChipActive : ""}`}
                  >
                    {level.label}
                    {level.points != null ? ` (${level.points}점)` : ""}
                  </span>
                );
              })}
            </div>
            {rubricComment ? (
              <p className={style.aiChatGradeComment}>{rubricComment}</p>
            ) : null}
          </div>
        );
      })}
      {grade.score != null && Number.isFinite(Number(grade.score)) ? (
        <p className={style.aiChatGradeComment}>점수: {grade.score}</p>
      ) : null}
      {comment ? <p className={style.aiChatGradeComment}>{comment}</p> : null}
    </div>
  );
};

const FormAiChatGradeResult = ({ form, payload }: Props) => {
  const byField = payload.byField || {};
  const blocks = (form.fields || [])
    .filter(
      (field) =>
        field.gradingMethod &&
        field.gradingMethod !== "none" &&
        field.permission !== "owner"
    )
    .flatMap((field) => {
      const grade = byField[field._id] || byField[String(field._id)];
      return grade ? [{ field, grade }] : [];
    });
  const finalComment = payload.final?.comment?.trim();
  if (!blocks.length && !finalComment) return null;

  return (
    <div className={style.aiChatGradeResult}>
      {blocks.map(({ field, grade }) => (
        <GradeFieldBlock
          key={field._id}
          field={field}
          form={form}
          grade={grade}
        />
      ))}
      {finalComment ? (
        <div className={style.aiChatGradeField}>
          <div className={style.assessmentFieldLabel}>총평</div>
          <p className={style.aiChatGradeComment}>{finalComment}</p>
        </div>
      ) : null}
    </div>
  );
};

export default FormAiChatGradeResult;
