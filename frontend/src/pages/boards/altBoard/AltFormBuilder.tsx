import { useEffect, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import { TAltForm, TAltFormField, TAltFormFieldType } from "types/altForm";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Svg from "assets/svg/Svg";

type Props = {
  board: TBoard;
  formId?: string;
  onBack: () => void;
};

const FIELD_TYPE_LABELS: Record<TAltFormFieldType, string> = {
  text: "단답형",
  textarea: "장문형",
  number: "숫자",
  date: "날짜",
  file: "파일",
  select: "드롭다운",
  multiSelect: "다중 선택",
  checkbox: "체크박스",
  radio: "라디오",
  userSelect: "사용자 선택",
  rating: "별점",
  scale: "척도",
  counter: "카운터",
  approval: "승인",
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as TAltFormFieldType[];

const createEmptyField = (): TAltFormField => ({
  _id: crypto.randomUUID(),
  label: "",
  type: "text",
  permission: "respondent",
  visibleToRespondent: false,
  required: false,
  options: [],
  order: 0,
});

const AltFormBuilder = ({ board, formId, onBack }: Props) => {
  const { AltFormAPI } = useAPIv2();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TAltFormField[]>([]);
  const [settings, setSettings] = useState({
    allowResubmit: false,
    openAt: "",
    closeAt: "",
  });
  const [isLoading, setIsLoading] = useState(!!formId);
  const [isSaving, setIsSaving] = useState(false);

  // 기존 Form 로드
  useEffect(() => {
    if (!formId) return;
    AltFormAPI.RAltForm({ params: { _id: formId } })
      .then(({ form }) => {
        setTitle(form.title);
        setDescription(form.description);
        setFields(form.fields);
        setSettings({
          allowResubmit: form.settings.allowResubmit,
          openAt: form.settings.openAt
            ? new Date(form.settings.openAt).toISOString().slice(0, 16)
            : "",
          closeAt: form.settings.closeAt
            ? new Date(form.settings.closeAt).toISOString().slice(0, 16)
            : "",
        });
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        onBack();
      });
  }, [formId]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        fields: fields.map((f, i) => ({ ...f, order: i })),
        settings: {
          allowResubmit: settings.allowResubmit,
          openAt: settings.openAt || undefined,
          closeAt: settings.closeAt || undefined,
        },
      };

      if (formId) {
        await AltFormAPI.UAltForm({ params: { _id: formId }, data });
      } else {
        await AltFormAPI.CAltForm({
          data: { ...data, board: board._id },
        });
      }
      onBack();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formId) return;
    if (!window.confirm("이 양식을 삭제하시겠습니까? 모든 응답 데이터도 함께 삭제됩니다."))
      return;

    try {
      await AltFormAPI.DAltForm({ params: { _id: formId } });
      onBack();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 필드 조작
  const addField = () => {
    setFields([...fields, createEmptyField()]);
  };

  const updateField = (index: number, partial: Partial<TAltFormField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...partial } : f))
    );
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const next = [...fields];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setFields(next);
  };

  const addOption = (fieldIndex: number) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? { ...f, options: [...(f.options || []), `옵션 ${(f.options?.length || 0) + 1}`] }
          : f
      )
    );
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? {
              ...f,
              options: f.options?.map((o, j) =>
                j === optionIndex ? value : o
              ),
            }
          : f
      )
    );
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? { ...f, options: f.options?.filter((_, j) => j !== optionIndex) }
          : f
      )
    );
  };

  const needsOptions = (type: TAltFormFieldType) =>
    ["select", "multiSelect", "radio"].includes(type);

  if (isLoading) return null;

  return (
    <div className={style.builderContainer}>
      {/* 헤더 */}
      <div className={style.builderHeader}>
        <div className={style.builderHeaderLeft}>
          <button className={style.backBtn} onClick={onBack}>
            <Svg type="chevronLeft" width="20px" height="20px" />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>
            {formId ? "양식 수정" : "새 양식"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {formId && (
            <Button
              type="ghost"
              onClick={handleDelete}
              style={{ color: "var(--status-error)" }}
            >
              삭제
            </Button>
          )}
          <Button type="ghost" onClick={onBack}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* 제목/설명 */}
      <div className={style.builderTitle}>
        <input
          className={style.fieldInput}
          placeholder="양식 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ fontSize: "16px", fontWeight: 600 }}
        />
        <input
          className={style.fieldInput}
          placeholder="설명 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* 설정 */}
      <div className={style.settingsPanel}>
        <div className={style.settingsItem}>
          <span className={style.settingsLabel}>시작일</span>
          <input
            type="datetime-local"
            className={style.settingsDateInput}
            value={settings.openAt}
            onChange={(e) =>
              setSettings((s) => ({ ...s, openAt: e.target.value }))
            }
          />
        </div>
        <div className={style.settingsItem}>
          <span className={style.settingsLabel}>마감일</span>
          <input
            type="datetime-local"
            className={style.settingsDateInput}
            value={settings.closeAt}
            onChange={(e) =>
              setSettings((s) => ({ ...s, closeAt: e.target.value }))
            }
          />
        </div>
        <div className={style.settingsItem}>
          <span className={style.settingsLabel}>재제출 허용</span>
          <div className={style.settingsToggle}>
            <ToggleSwitch
              checked={settings.allowResubmit}
              onChange={(v) =>
                setSettings((s) => ({ ...s, allowResubmit: v }))
              }
            />
            <span className={style.settingsToggleText}>
              {settings.allowResubmit ? "허용" : "비허용"}
            </span>
          </div>
        </div>
      </div>

      {/* 필드 목록 */}
      <div className={style.fieldList}>
        {fields.map((field, index) => (
          <div key={field._id} className={style.fieldCard}>
            <div className={style.fieldHeader}>
              <span className={style.fieldNumber}>#{index + 1}</span>
              <select
                className={style.selectInput}
                style={{ minWidth: "120px", padding: "6px 10px", fontSize: "13px" }}
                value={field.type}
                onChange={(e) =>
                  updateField(index, {
                    type: e.target.value as TAltFormFieldType,
                    options:
                      needsOptions(e.target.value as TAltFormFieldType) &&
                      (!field.options || field.options.length === 0)
                        ? ["옵션 1", "옵션 2"]
                        : field.options,
                  })
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <div className={style.fieldActions}>
                <button
                  className={style.moveBtn}
                  onClick={() => moveField(index, -1)}
                  disabled={index === 0}
                  title="위로 이동"
                >
                  ↑
                </button>
                <button
                  className={style.moveBtn}
                  onClick={() => moveField(index, 1)}
                  disabled={index === fields.length - 1}
                  title="아래로 이동"
                >
                  ↓
                </button>
                <button
                  className={style.removeBtn}
                  onClick={() => removeField(index)}
                  title="삭제"
                >
                  ×
                </button>
              </div>
            </div>

            <div className={style.fieldBody}>
              <input
                className={style.fieldInput}
                placeholder="항목 이름"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />

              {/* 옵션이 필요한 필드 타입 */}
              {needsOptions(field.type) && (
                <div>
                  {field.options?.map((opt, oi) => (
                    <div key={oi} className={style.optionRow}>
                      <input
                        className={`${style.fieldInput} ${style.optionInput}`}
                        value={opt}
                        onChange={(e) =>
                          updateOption(index, oi, e.target.value)
                        }
                        placeholder={`옵션 ${oi + 1}`}
                      />
                      <button
                        className={style.removeBtn}
                        onClick={() => removeOption(index, oi)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    className={style.addFieldBtn}
                    style={{ padding: "8px", fontSize: "13px" }}
                    onClick={() => addOption(index)}
                  >
                    + 옵션 추가
                  </button>
                </div>
              )}

              {/* 필드 설정 */}
              <div className={style.fieldRow}>
                <label className={style.fieldCheckbox}>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                  />
                  필수
                </label>
                <select
                  className={style.selectInput}
                  style={{ minWidth: "100px", padding: "4px 8px", fontSize: "12px" }}
                  value={field.permission}
                  onChange={(e) =>
                    updateField(index, {
                      permission: e.target.value as "respondent" | "owner",
                    })
                  }
                >
                  <option value="respondent">응답자 입력</option>
                  <option value="owner">관리자 입력</option>
                </select>
                {field.permission === "owner" && (
                  <label className={style.fieldCheckbox}>
                    <input
                      type="checkbox"
                      checked={field.visibleToRespondent}
                      onChange={(e) =>
                        updateField(index, {
                          visibleToRespondent: e.target.checked,
                        })
                      }
                    />
                    응답자에게 공개
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className={style.addFieldBtn} onClick={addField}>
        + 항목 추가
      </button>
    </div>
  );
};

export default AltFormBuilder;
