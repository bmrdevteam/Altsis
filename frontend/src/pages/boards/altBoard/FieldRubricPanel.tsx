import { useState } from "react";
import style from "./altBoard.module.scss";
import { TAltFormField, TFormRubric } from "types/altForm";
import { NO_PRINT_CLASS } from "utils/printArea";

type Props = {
  rubrics: TFormRubric[];
  mode: "criteria" | "grade";
  selectedByRubric?: Record<string, string | undefined>;
  onSelectLevel?: (rubricId: string, levelId: string | undefined) => void;
  defaultOpen?: boolean;
  /** 토글 버튼 라벨 */
  toggleLabel?: string;
};

export const getFieldRubrics = (
  field: TAltFormField,
  formRubrics: TFormRubric[] | undefined
): TFormRubric[] => {
  const ids = field.rubricIds?.length
    ? field.rubricIds
    : field.rubricId
      ? [field.rubricId]
      : [];
  return ids
    .map((id) => (formRubrics || []).find((r) => r.id === id))
    .filter(Boolean) as TFormRubric[];
};

export const selectedLevelsFromDraft = (
  draft:
    | {
        levelId?: string;
        byRubric?: Record<string, { levelId?: string }>;
      }
    | undefined,
  rubrics: TFormRubric[]
): Record<string, string | undefined> => {
  const out: Record<string, string | undefined> = {};
  for (const rubric of rubrics) {
    const fromBy = draft?.byRubric?.[rubric.id]?.levelId;
    if (fromBy) {
      out[rubric.id] = fromBy;
    } else if (rubrics.length === 1 && draft?.levelId) {
      out[rubric.id] = draft.levelId;
    }
  }
  return out;
};

const FieldRubricPanel = ({
  rubrics,
  mode,
  selectedByRubric = {},
  onSelectLevel,
  defaultOpen = false,
  toggleLabel = "평가 기준",
}: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  if (!rubrics.length) return null;

  const selectedLevel = (rubric: TFormRubric) => {
    const id = selectedByRubric[rubric.id];
    if (!id) return undefined;
    return (rubric.levels || []).find((l) => l.id === id);
  };

  return (
    <div className={`${style.rubricPanel} ${style.noPrint} ${NO_PRINT_CLASS}`}>
      {mode === "grade" &&
        rubrics.map((rubric) => {
          const selectedId = selectedByRubric[rubric.id] || "";
          const activeLevel = selectedLevel(rubric);
          return (
            <div key={rubric.id} className={style.assessmentRubricBlock}>
              <div className={style.assessmentRubricTitle}>{rubric.title}</div>
              <div
                className={style.assessmentLevelChipRow}
                role="group"
                aria-label={`${rubric.title || "루브릭"} 수준`}
              >
                {(rubric.levels || []).map((l) => {
                  const active = selectedId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`${style.assessmentLevelChip} ${
                        active ? style.assessmentLevelChipActive : ""
                      }`}
                      aria-pressed={active}
                      onClick={() =>
                        onSelectLevel?.(
                          rubric.id,
                          active ? undefined : l.id
                        )
                      }
                    >
                      {l.label}
                      {l.points != null ? ` (${l.points}점)` : ""}
                    </button>
                  );
                })}
              </div>
              {activeLevel?.description && (
                <p className={style.rubricSelectedDesc}>
                  {activeLevel.description}
                </p>
              )}
            </div>
          );
        })}

      <button
        type="button"
        className={style.rubricPanelToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {toggleLabel}
        <span className={style.rubricPanelToggleIcon} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className={style.rubricCriteriaList}>
          {rubrics.map((rubric) => (
            <div key={rubric.id} className={style.rubricCriteriaBlock}>
              <div className={style.rubricCriteriaTitle}>{rubric.title}</div>
              <ul className={style.rubricLevelList}>
                {(rubric.levels || []).map((l) => {
                  const selected = selectedByRubric[rubric.id] === l.id;
                  return (
                    <li
                      key={l.id}
                      className={`${style.rubricLevelItem} ${
                        selected ? style.rubricLevelItemSelected : ""
                      }`}
                    >
                      <div className={style.rubricLevelHead}>
                        <span className={style.rubricLevelLabel}>
                          {l.label}
                          {l.points != null ? ` (${l.points}점)` : ""}
                        </span>
                        {selected && (
                          <span className={style.rubricLevelSelectedBadge}>
                            선택됨
                          </span>
                        )}
                      </div>
                      {l.description && (
                        <p className={style.rubricLevelDesc}>{l.description}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FieldRubricPanel;
