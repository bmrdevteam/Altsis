import { useEffect, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import { TAltForm, TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";

type Props = {
  board: TBoard;
  formId: string;
  onBack: () => void;
};

const AltFormRenderer = ({ board, formId, onBack }: Props) => {
  const { AltFormAPI, AltSheetRowAPI } = useAPIv2();

  const [form, setForm] = useState<TAltForm | null>(null);
  const [myRow, setMyRow] = useState<TAltSheetRow | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      AltFormAPI.RAltForm({ params: { _id: formId } }),
      AltSheetRowAPI.RAltSheetRowMy({ query: { form: formId } }),
    ])
      .then(([{ form }, { row }]) => {
        setForm(form);
        if (row) {
          setMyRow(row);
          setData(row.data || {});
          setIsSubmitted(true);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        onBack();
      });
  }, [formId]);

  const respondentFields = form?.fields.filter(
    (f) => f.permission === "respondent"
  ) || [];

  const visibleOwnerFields = form?.fields.filter(
    (f) => f.permission === "owner" && f.visibleToRespondent
  ) || [];

  const isClosed =
    form?.settings.closeAt && new Date(form.settings.closeAt) < new Date();
  const isNotOpen =
    form?.settings.openAt && new Date(form.settings.openAt) > new Date();

  const canSubmit = !isClosed && !isNotOpen;
  const canResubmit = form?.settings.allowResubmit && isSubmitted && canSubmit;

  const setValue = (fieldId: string, value: any) => {
    setData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of respondentFields) {
      if (!field.required) continue;
      const value = data[field._id];
      if (value === undefined || value === null || value === "") {
        newErrors[field._id] = "필수 항목입니다.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!form || !validate()) return;

    setIsSubmitting(true);
    try {
      const { row } = await AltSheetRowAPI.CAltSheetRow({
        data: { form: form._id, data },
      });
      setMyRow(row);
      setIsSubmitted(true);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myRow) return;
    if (!window.confirm("응답을 철회하시겠습니까?")) return;

    try {
      await AltSheetRowAPI.DAltSheetRow({ params: { _id: myRow._id } });
      setMyRow(null);
      setData({});
      setIsSubmitted(false);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const renderField = (field: TAltFormField, disabled: boolean) => {
    const value = data[field._id] ?? "";

    switch (field.type) {
      case "text":
        return (
          <input
            className={style.textInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            placeholder="답변을 입력하세요"
            disabled={disabled}
          />
        );
      case "textarea":
        return (
          <textarea
            className={style.textArea}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            placeholder="답변을 입력하세요"
            disabled={disabled}
          />
        );
      case "number":
        return (
          <input
            className={style.textInput}
            type="number"
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          />
        );
      case "date":
        return (
          <input
            className={style.textInput}
            type="date"
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          />
        );
      case "select":
        return (
          <select
            className={style.selectInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "radio":
        return (
          <div>
            {field.options?.map((opt, i) => (
              <label key={i} className={style.choiceOption}>
                <input
                  type="radio"
                  name={`field-${field._id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => setValue(field._id, opt)}
                  disabled={disabled}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <label className={style.choiceOption}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setValue(field._id, e.target.checked)}
              disabled={disabled}
            />
            {field.label}
          </label>
        );
      case "multiSelect":
        return (
          <div>
            {field.options?.map((opt, i) => {
              const selected: string[] = Array.isArray(value) ? value : [];
              return (
                <label key={i} className={style.choiceOption}>
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue(field._id, [...selected, opt]);
                      } else {
                        setValue(
                          field._id,
                          selected.filter((s) => s !== opt)
                        );
                      }
                    }}
                    disabled={disabled}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
      case "approval":
        return (
          <div style={{ display: "flex", gap: "8px" }}>
            <label className={style.choiceOption}>
              <input
                type="radio"
                name={`field-${field._id}`}
                checked={value === "approved"}
                onChange={() => setValue(field._id, "approved")}
                disabled={disabled}
              />
              승인
            </label>
            <label className={style.choiceOption}>
              <input
                type="radio"
                name={`field-${field._id}`}
                checked={value === "rejected"}
                onChange={() => setValue(field._id, "rejected")}
                disabled={disabled}
              />
              반려
            </label>
          </div>
        );
      default:
        return (
          <input
            className={style.textInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  if (isLoading || !form) return null;

  return (
    <div className={style.rendererContainer}>
      {/* 헤더 */}
      <div className={style.builderHeader}>
        <div className={style.builderHeaderLeft}>
          <button className={style.backBtn} onClick={onBack}>
            <Svg type="chevronLeft" width="20px" height="20px" />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>
            {form.title}
          </span>
        </div>
      </div>

      {/* 메타 정보 */}
      {form.description && (
        <div className={style.rendererHeader}>
          <div className={style.rendererDesc}>{form.description}</div>
        </div>
      )}

      <div className={style.rendererMeta}>
        {isClosed && (
          <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
            마감됨
          </span>
        )}
        {isNotOpen && (
          <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
            아직 시작 전
          </span>
        )}
        {isSubmitted && (
          <span className={`${style.formCardBadge} ${style.badgeOpen}`}>
            응답 완료
          </span>
        )}
      </div>

      {/* 제출 완료 배너 */}
      {isSubmitted && !canResubmit && (
        <div className={style.successBanner}>
          <div className={style.successIcon}>✓</div>
          <div className={style.successText}>
            <strong>응답이 제출되었습니다.</strong>
            <span>
              {myRow?._submittedAt &&
                `제출일: ${new Date(myRow._submittedAt).toLocaleString("ko-KR")}`}
            </span>
          </div>
        </div>
      )}

      {/* 응답자 필드 */}
      {respondentFields.map((field) => {
        const disabled = (isSubmitted && !canResubmit) || !canSubmit;
        return (
          <div key={field._id} className={style.questionItem}>
            <div className={style.questionLabel}>
              <span className={style.questionLabelText}>{field.label}</span>
              {field.required && <span className={style.requiredMark}>*</span>}
            </div>
            {renderField(field, disabled)}
            {errors[field._id] && (
              <div className={style.questionError}>{errors[field._id]}</div>
            )}
          </div>
        );
      })}

      {/* owner 필드 중 응답자에게 공개된 것 (읽기전용) */}
      {visibleOwnerFields.length > 0 && isSubmitted && (
        <>
          {visibleOwnerFields.map((field) => (
            <div key={field._id} className={style.questionItem}>
              <div className={style.questionLabel}>
                <span className={style.questionLabelText}>{field.label}</span>
                <span style={{ fontSize: "11px", color: "var(--text-color-2)", marginLeft: "8px" }}>
                  (관리자 입력)
                </span>
              </div>
              {renderField(field, true)}
            </div>
          ))}
        </>
      )}

      {/* 제출/수정 버튼 */}
      <div className={style.submitArea}>
        {isSubmitted && myRow && canSubmit && (
          <Button type="ghost" onClick={handleWithdraw}>
            응답 철회
          </Button>
        )}
        {(!isSubmitted || canResubmit) && canSubmit && (
          <Button
            type="ghost"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "제출 중..."
              : isSubmitted
              ? "수정 제출"
              : "제출"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AltFormRenderer;
