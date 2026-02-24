import { useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm, TAltFormField } from "types/altForm";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";

type Props = {
  form: TAltForm;
  onClose: () => void;
  onGenerated: () => void;
};

type FieldConfig = {
  fieldId: string;
  label: string;
  type: string;
  values: string[];
};

const CombinationGenerator = ({ form, onClose, onGenerated }: Props) => {
  const { AltSheetRowAPI } = useAPIv2();

  // 사전 등록 필드만 추출
  const preRegFields = form.fields.filter(
    (f) =>
      f.duplicateCheck?.enabled &&
      f.duplicateCheck.mode === "preRegistration"
  );

  const [configs, setConfigs] = useState<FieldConfig[]>(
    preRegFields.map((f) => ({
      fieldId: f._id,
      label: f.label,
      type: f.type,
      values: f.options?.length ? [...f.options] : [],
    }))
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // 텍스트 필드: 쉼표 구분 입력
  const handleTextValues = (index: number, text: string) => {
    setConfigs((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              values: text
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            }
          : c
      )
    );
  };

  // 옵션 필드: 체크박스 토글
  const toggleOption = (configIndex: number, option: string) => {
    setConfigs((prev) =>
      prev.map((c, i) =>
        i === configIndex
          ? {
              ...c,
              values: c.values.includes(option)
                ? c.values.filter((v) => v !== option)
                : [...c.values, option],
            }
          : c
      )
    );
  };

  // 날짜 범위
  const [dateRanges, setDateRanges] = useState<
    Record<string, { start: string; end: string }>
  >({});

  const handleDateRange = (fieldId: string) => {
    const range = dateRanges[fieldId];
    if (!range?.start || !range?.end) return;

    const dates: string[] = [];
    const current = new Date(range.start);
    const end = new Date(range.end);
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    setConfigs((prev) =>
      prev.map((c) =>
        c.fieldId === fieldId ? { ...c, values: dates } : c
      )
    );
  };

  // 숫자 범위
  const [numberRanges, setNumberRanges] = useState<
    Record<string, { min: number; max: number; step: number }>
  >({});

  const handleNumberRange = (fieldId: string) => {
    const range = numberRanges[fieldId];
    if (!range) return;
    const values: string[] = [];
    for (let n = range.min; n <= range.max; n += (range.step || 1)) {
      values.push(String(n));
    }
    setConfigs((prev) =>
      prev.map((c) =>
        c.fieldId === fieldId ? { ...c, values } : c
      )
    );
  };

  // 카테시안 곱 계산
  const totalCombinations = configs.reduce(
    (acc, c) => acc * Math.max(c.values.length, 1),
    1
  );

  const combinationLabel = configs
    .map((c) => c.values.length || 0)
    .join(" × ");

  // 생성
  const handleGenerate = async () => {
    if (configs.some((c) => c.values.length === 0)) {
      alert("모든 필드에 값을 입력해주세요.");
      return;
    }

    if (
      !window.confirm(
        `${totalCombinations}건의 사전 등록 데이터를 생성하시겠습니까?`
      )
    )
      return;

    setIsGenerating(true);
    try {
      // 카테시안 곱 생성
      const combinations = cartesianProduct(configs);
      const rows = combinations.map((combo) => {
        const data: Record<string, any> = {};
        for (const { fieldId, value } of combo) {
          data[fieldId] = value;
        }
        return { data };
      });

      // 벌크 생성 API
      await AltSheetRowAPI.CAltSheetRowsBulk({
        data: { form: form._id, rows },
      });

      alert(`${rows.length}건이 생성되었습니다.`);
      onGenerated();
      onClose();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getField = (fieldId: string): TAltFormField | undefined =>
    form.fields.find((f) => f._id === fieldId);

  return (
    <div className={style.trackerOverlay} onClick={onClose}>
      <div
        className={style.trackerPanel}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <div className={style.trackerHeader}>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>
            조합 생성기
          </span>
          <button className={style.removeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "var(--text-color-2)",
            marginBottom: "16px",
          }}
        >
          사전 등록 필드의 값 조합을 생성하여 Sheet에 빈 행으로 추가합니다.
        </div>

        {/* 필드별 값 설정 */}
        {configs.map((config, ci) => {
          const field = getField(config.fieldId);
          if (!field) return null;

          return (
            <div key={config.fieldId} className={style.comboFieldSection}>
              <div className={style.comboFieldLabel}>
                {config.label}
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-color-2)",
                    marginLeft: "8px",
                  }}
                >
                  ({config.values.length}개)
                </span>
              </div>

              {/* select / radio / multiSelect → 체크박스 */}
              {["select", "radio", "multiSelect"].includes(field.type) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {field.options?.map((opt) => (
                    <label
                      key={opt}
                      className={style.fieldCheckbox}
                      style={{ fontSize: "13px" }}
                    >
                      <input
                        type="checkbox"
                        checked={config.values.includes(opt)}
                        onChange={() => toggleOption(ci, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {/* date → 범위 */}
              {field.type === "date" && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="date"
                    className={style.fieldInput}
                    style={{ flex: 1 }}
                    value={dateRanges[config.fieldId]?.start || ""}
                    onChange={(e) =>
                      setDateRanges((p) => ({
                        ...p,
                        [config.fieldId]: {
                          ...p[config.fieldId],
                          start: e.target.value,
                        },
                      }))
                    }
                  />
                  <span>~</span>
                  <input
                    type="date"
                    className={style.fieldInput}
                    style={{ flex: 1 }}
                    value={dateRanges[config.fieldId]?.end || ""}
                    onChange={(e) =>
                      setDateRanges((p) => ({
                        ...p,
                        [config.fieldId]: {
                          ...p[config.fieldId],
                          end: e.target.value,
                        },
                      }))
                    }
                  />
                  <Button
                    type="ghost"
                    onClick={() => handleDateRange(config.fieldId)}
                    style={{ padding: "4px 8px", fontSize: "12px" }}
                  >
                    적용
                  </Button>
                </div>
              )}

              {/* number → 범위 */}
              {field.type === "number" && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    className={style.fieldInput}
                    placeholder="최소"
                    style={{ width: "80px" }}
                    value={numberRanges[config.fieldId]?.min ?? ""}
                    onChange={(e) =>
                      setNumberRanges((p) => ({
                        ...p,
                        [config.fieldId]: {
                          ...p[config.fieldId],
                          min: Number(e.target.value),
                          max: p[config.fieldId]?.max ?? 0,
                          step: p[config.fieldId]?.step ?? 1,
                        },
                      }))
                    }
                  />
                  <span>~</span>
                  <input
                    type="number"
                    className={style.fieldInput}
                    placeholder="최대"
                    style={{ width: "80px" }}
                    value={numberRanges[config.fieldId]?.max ?? ""}
                    onChange={(e) =>
                      setNumberRanges((p) => ({
                        ...p,
                        [config.fieldId]: {
                          ...p[config.fieldId],
                          min: p[config.fieldId]?.min ?? 0,
                          max: Number(e.target.value),
                          step: p[config.fieldId]?.step ?? 1,
                        },
                      }))
                    }
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
                    간격:
                  </span>
                  <input
                    type="number"
                    className={style.fieldInput}
                    style={{ width: "60px" }}
                    value={numberRanges[config.fieldId]?.step ?? 1}
                    onChange={(e) =>
                      setNumberRanges((p) => ({
                        ...p,
                        [config.fieldId]: {
                          ...p[config.fieldId],
                          min: p[config.fieldId]?.min ?? 0,
                          max: p[config.fieldId]?.max ?? 0,
                          step: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <Button
                    type="ghost"
                    onClick={() => handleNumberRange(config.fieldId)}
                    style={{ padding: "4px 8px", fontSize: "12px" }}
                  >
                    적용
                  </Button>
                </div>
              )}

              {/* text → 쉼표 구분 */}
              {field.type === "text" && (
                <input
                  className={style.fieldInput}
                  placeholder="값1, 값2, 값3 (쉼표로 구분)"
                  value={config.values.join(", ")}
                  onChange={(e) => handleTextValues(ci, e.target.value)}
                />
              )}

              {/* 선택된 값 미리보기 */}
              {config.values.length > 0 && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-color-2)",
                    marginTop: "4px",
                  }}
                >
                  선택: {config.values.slice(0, 10).join(", ")}
                  {config.values.length > 10 &&
                    ` ... 외 ${config.values.length - 10}개`}
                </div>
              )}
            </div>
          );
        })}

        {/* 미리보기 */}
        <div className={style.comboPreview}>
          <span>
            {combinationLabel} = <strong>{totalCombinations}건</strong>
          </span>
        </div>

        {/* 생성 버튼 */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button type="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            type="ghost"
            onClick={handleGenerate}
            disabled={isGenerating || totalCombinations === 0}
          >
            {isGenerating ? "생성 중..." : `${totalCombinations}건 생성`}
          </Button>
        </div>
      </div>
    </div>
  );
};

// 카테시안 곱 유틸
function cartesianProduct(
  configs: FieldConfig[]
): { fieldId: string; value: string }[][] {
  if (configs.length === 0) return [[]];

  const [first, ...rest] = configs;
  const restProduct = cartesianProduct(rest);

  const result: { fieldId: string; value: string }[][] = [];
  for (const val of first.values) {
    for (const combo of restProduct) {
      result.push([{ fieldId: first.fieldId, value: val }, ...combo]);
    }
  }
  return result;
}

export default CombinationGenerator;
