import { useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import {
  TReservationConfig,
  TSlotMode,
  TSlotRuleTemplate,
  TApplicationFormField,
  TApplicationFieldType,
} from "types/reservation";
import style from "./reservation.module.scss";

type Props = {
  setState: (state: boolean) => void;
  config: TReservationConfig | null;
  onChange: (config: TReservationConfig) => void;
  isEditMode?: boolean;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const defaultConfig: TReservationConfig = {
  resource: "",
  resourceDescription: "",
  slotMode: "time",
  defaultCapacity: 1,
  requireApproval: true,
  maxReservationsPerUser: 0,
  reservationOpenAt: "",
  reservationCloseAt: "",
  applicationForm: [],
};

const ReservationConfigPopup = ({
  setState,
  config: initialConfig,
  onChange,
  isEditMode = false,
}: Props) => {
  const [config, setConfig] = useState<TReservationConfig>({
    ...defaultConfig,
    ...initialConfig,
  });

  const template = config.slotRuleTemplate;
  const [includeTemplate, setIncludeTemplate] = useState(!!template);
  const [templateState, setTemplateState] = useState<TSlotRuleTemplate>(
    template || {
      days: [1, 2, 3, 4, 5],
      timeSlots: [{ startTime: "09:00", endTime: "09:30" }],
      capacity: 1,
    }
  );

  const handleComplete = () => {
    if (!config.resource.trim()) {
      alert("예약 대상을 입력해주세요.");
      return;
    }

    onChange({
      ...config,
      resource: config.resource.trim(),
      resourceDescription: config.resourceDescription.trim(),
      applicationForm: (config.applicationForm || []).filter(
        (f) => f.label.trim()
      ),
      slotRuleTemplate: includeTemplate ? templateState : undefined,
    });
    setState(false);
  };

  // 신청 양식 관리
  const addFormField = () => {
    setConfig((prev) => ({
      ...prev,
      applicationForm: [
        ...(prev.applicationForm || []),
        { label: "", type: "text" as TApplicationFieldType, required: false },
      ],
    }));
  };

  const updateFormField = (
    idx: number,
    field: keyof TApplicationFormField,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      applicationForm: (prev.applicationForm || []).map((f, i) =>
        i === idx ? { ...f, [field]: value } : f
      ),
    }));
  };

  const removeFormField = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      applicationForm: (prev.applicationForm || []).filter(
        (_, i) => i !== idx
      ),
    }));
  };

  return (
    <Popup
      setState={setState}
      title="예약 설정"
      closeBtn
      contentScroll
      style={{ maxWidth: "640px", width: "100%" }}
      footer={
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
        >
          <Button type="hover" onClick={() => setState(false)}>
            취소
          </Button>
          <Button
            type="ghost"
            onClick={handleComplete}
            disabled={!config.resource.trim()}
          >
            완료
          </Button>
        </div>
      }
    >
      <div className={style.configSection}>
        {/* 기본 설정 */}
        <div className={style.configRow}>
          <label>예약 대상 *</label>
          <input
            className={style.configInput}
            placeholder="예: 상담실, 회의실, 음악실"
            value={config.resource}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, resource: e.target.value }))
            }
          />
        </div>

        <div className={style.configRow}>
          <label>설명</label>
          <input
            className={style.configInput}
            placeholder="예약 대상에 대한 설명 (선택)"
            value={config.resourceDescription}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                resourceDescription: e.target.value,
              }))
            }
          />
        </div>

        <div className={style.configRow}>
          <label>슬롯 모드</label>
          <select
            className={style.configSelect}
            value={config.slotMode}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                slotMode: e.target.value as TSlotMode,
              }))
            }
            disabled={isEditMode}
          >
            <option value="time">시간 (09:00~10:00)</option>
            <option value="label">라벨 (1교시, 2교시 등)</option>
          </select>
        </div>

        <div className={style.configRow}>
          <label>기본 정원</label>
          <input
            type="number"
            className={style.configNumberInput}
            min={1}
            value={config.defaultCapacity}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                defaultCapacity: parseInt(e.target.value) || 1,
              }))
            }
          />
        </div>

        <div className={style.configToggleRow}>
          <label style={{ fontSize: "13px", fontWeight: 500 }}>
            승인 필요
          </label>
          <ToggleSwitch
            defaultChecked={config.requireApproval}
            onChange={(checked: boolean) =>
              setConfig((prev) => ({ ...prev, requireApproval: checked }))
            }
          />
        </div>
        <p className={style.configHint}>
          {config.requireApproval
            ? "관리자 승인 후 예약이 확정됩니다."
            : "신청 즉시 예약이 확정됩니다."}
        </p>

        <div className={style.configRow}>
          <label>최대 예약</label>
          <input
            type="number"
            className={style.configNumberInput}
            min={0}
            value={config.maxReservationsPerUser}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                maxReservationsPerUser: parseInt(e.target.value) || 0,
              }))
            }
          />
          <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            0 = 무제한
          </span>
        </div>

        <div className={style.configRow}>
          <label>예약 기간</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
            }}
          >
            <input
              type="datetime-local"
              className={style.configDateInput}
              value={config.reservationOpenAt || ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  reservationOpenAt: e.target.value,
                }))
              }
            />
            <span style={{ color: "var(--text-color-2)" }}>~</span>
            <input
              type="datetime-local"
              className={style.configDateInput}
              value={config.reservationCloseAt || ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  reservationCloseAt: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <p className={style.configHint}>
          비워두면 기간 제한 없이 예약 가능합니다.
        </p>
      </div>

      {/* 슬롯 규칙 템플릿 */}
      <div style={{ marginTop: "16px" }}>
        <div className={style.configToggleRow}>
          <label style={{ fontSize: "14px", fontWeight: 500 }}>
            슬롯 생성 규칙 템플릿
          </label>
          <ToggleSwitch
            defaultChecked={includeTemplate}
            onChange={(checked: boolean) => setIncludeTemplate(checked)}
          />
        </div>
        <p className={style.configHint} style={{ marginTop: "4px" }}>
          템플릿을 포함하면 JSON 내보내기 시 슬롯 규칙이 함께 저장됩니다.
        </p>

        {includeTemplate && (
          <div className={style.configSection} style={{ marginTop: "12px" }}>
            {/* 요일 선택 */}
            <div className={style.bulkFormRow}>
              <span className={style.bulkFormLabel}>요일</span>
              <div className={style.dayCheckboxGroup}>
                {DAY_LABELS.map((label, idx) => (
                  <label
                    key={idx}
                    className={`${style.dayCheckbox} ${
                      templateState.days.includes(idx)
                        ? style.dayCheckboxChecked
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={templateState.days.includes(idx)}
                      onChange={(e) => {
                        setTemplateState((prev) => ({
                          ...prev,
                          days: e.target.checked
                            ? [...prev.days, idx].sort()
                            : prev.days.filter((d) => d !== idx),
                        }));
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* 시간대 / 라벨 */}
            {config.slotMode === "time" ? (
              <div className={style.bulkFormRow}>
                <span className={style.bulkFormLabel}>시간대</span>
                <div className={style.timeSlotGroup}>
                  {(templateState.timeSlots || []).map((slot, idx) => (
                    <div key={idx} className={style.timeSlotRow}>
                      <input
                        type="time"
                        className={style.timeInput}
                        value={slot.startTime}
                        onChange={(e) => {
                          const updated = [
                            ...(templateState.timeSlots || []),
                          ];
                          updated[idx] = {
                            ...updated[idx],
                            startTime: e.target.value,
                          };
                          setTemplateState((prev) => ({
                            ...prev,
                            timeSlots: updated,
                          }));
                        }}
                      />
                      <span style={{ color: "var(--text-color-2)" }}>~</span>
                      <input
                        type="time"
                        className={style.timeInput}
                        value={slot.endTime}
                        onChange={(e) => {
                          const updated = [
                            ...(templateState.timeSlots || []),
                          ];
                          updated[idx] = {
                            ...updated[idx],
                            endTime: e.target.value,
                          };
                          setTemplateState((prev) => ({
                            ...prev,
                            timeSlots: updated,
                          }));
                        }}
                      />
                      {(templateState.timeSlots || []).length > 1 && (
                        <button
                          type="button"
                          className={style.removeBtn}
                          onClick={() => {
                            setTemplateState((prev) => ({
                              ...prev,
                              timeSlots: (prev.timeSlots || []).filter(
                                (_, i) => i !== idx
                              ),
                            }));
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={style.addSlotBtn}
                    onClick={() => {
                      const last = (templateState.timeSlots || []).at(-1);
                      setTemplateState((prev) => ({
                        ...prev,
                        timeSlots: [
                          ...(prev.timeSlots || []),
                          {
                            startTime: last?.endTime || "09:00",
                            endTime: last
                              ? `${String(
                                  Math.min(
                                    23,
                                    parseInt(last.endTime.split(":")[0]) + 1
                                  )
                                ).padStart(2, "0")}:${
                                  last.endTime.split(":")[1]
                                }`
                              : "10:00",
                          },
                        ],
                      }));
                    }}
                  >
                    + 시간대 추가
                  </button>
                </div>
              </div>
            ) : (
              <div className={style.bulkFormRow}>
                <span className={style.bulkFormLabel}>라벨</span>
                <div className={style.timeSlotGroup}>
                  {(templateState.labels || [""]).map((label, idx) => (
                    <div key={idx} className={style.timeSlotRow}>
                      <input
                        className={style.labelInput}
                        placeholder={`라벨 ${idx + 1}`}
                        value={label}
                        onChange={(e) => {
                          const updated = [
                            ...(templateState.labels || [""]),
                          ];
                          updated[idx] = e.target.value;
                          setTemplateState((prev) => ({
                            ...prev,
                            labels: updated,
                          }));
                        }}
                      />
                      {(templateState.labels || [""]).length > 1 && (
                        <button
                          type="button"
                          className={style.removeBtn}
                          onClick={() => {
                            setTemplateState((prev) => ({
                              ...prev,
                              labels: (prev.labels || [""]).filter(
                                (_, i) => i !== idx
                              ),
                            }));
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={style.addSlotBtn}
                    onClick={() => {
                      setTemplateState((prev) => ({
                        ...prev,
                        labels: [...(prev.labels || [""]), ""],
                      }));
                    }}
                  >
                    + 라벨 추가
                  </button>
                </div>
              </div>
            )}

            {/* 정원 */}
            <div className={style.configRow}>
              <label>슬롯 정원</label>
              <input
                type="number"
                className={style.configNumberInput}
                min={1}
                value={templateState.capacity}
                onChange={(e) =>
                  setTemplateState((prev) => ({
                    ...prev,
                    capacity: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* 신청 양식 */}
      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 500 }}>
            신청 양식 (선택)
          </span>
          <Button type="hover" onClick={addFormField}>
            + 필드 추가
          </Button>
        </div>
        {(config.applicationForm || []).length > 0 && (
          <div className={style.configSection}>
            {(config.applicationForm || []).map((field, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  className={style.configInput}
                  placeholder="필드명"
                  value={field.label}
                  onChange={(e) =>
                    updateFormField(idx, "label", e.target.value)
                  }
                />
                <select
                  className={style.configSelect}
                  value={field.type}
                  onChange={(e) =>
                    updateFormField(
                      idx,
                      "type",
                      e.target.value as TApplicationFieldType
                    )
                  }
                >
                  <option value="text">텍스트</option>
                  <option value="textarea">장문</option>
                  <option value="select">선택</option>
                </select>
                <label
                  style={{
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateFormField(idx, "required", e.target.checked)
                    }
                  />
                  필수
                </label>
                <button
                  className={style.removeBtn}
                  onClick={() => removeFormField(idx)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
};

export default ReservationConfigPopup;
