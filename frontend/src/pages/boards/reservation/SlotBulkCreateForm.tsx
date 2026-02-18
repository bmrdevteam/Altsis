import { useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import { TSlotMode } from "types/reservation";
import style from "./reservation.module.scss";

type Props = {
  setState: (state: boolean) => void;
  postId: string;
  slotMode: TSlotMode;
  defaultCapacity: number;
  onCreated: () => void;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const SlotBulkCreateForm = ({
  setState,
  postId,
  slotMode,
  defaultCapacity,
  onCreated,
}: Props) => {
  const { ReservationSlotAPI } = useAPIv2();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [capacity, setCapacity] = useState(defaultCapacity);
  const [excludeDates, setExcludeDates] = useState<string[]>([]);
  const [excludeDateInput, setExcludeDateInput] = useState("");

  // 시간 모드
  const [timeSlots, setTimeSlots] = useState<
    { startTime: string; endTime: string }[]
  >([{ startTime: "09:00", endTime: "10:00" }]);

  // 라벨 모드
  const [labels, setLabels] = useState<string[]>([""]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addTimeSlot = () => {
    const last = timeSlots[timeSlots.length - 1];
    setTimeSlots([
      ...timeSlots,
      { startTime: last?.endTime || "09:00", endTime: "" },
    ]);
  };

  const updateTimeSlot = (
    idx: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setTimeSlots((prev) =>
      prev.map((ts, i) => (i === idx ? { ...ts, [field]: value } : ts))
    );
  };

  const removeTimeSlot = (idx: number) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLabel = () => {
    setLabels([...labels, ""]);
  };

  const updateLabel = (idx: number, value: string) => {
    setLabels((prev) => prev.map((l, i) => (i === idx ? value : l)));
  };

  const removeLabel = (idx: number) => {
    if (labels.length <= 1) return;
    setLabels((prev) => prev.filter((_, i) => i !== idx));
  };

  const addExcludeDate = () => {
    if (!excludeDateInput) return;
    if (excludeDates.includes(excludeDateInput)) return;
    setExcludeDates([...excludeDates, excludeDateInput]);
    setExcludeDateInput("");
  };

  const removeExcludeDate = (date: string) => {
    setExcludeDates((prev) => prev.filter((d) => d !== date));
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      alert("시작일과 종료일을 입력해주세요.");
      return;
    }
    if (days.length === 0) {
      alert("최소 하나의 요일을 선택해주세요.");
      return;
    }

    if (slotMode === "time") {
      const invalid = timeSlots.some((ts) => !ts.startTime || !ts.endTime);
      if (invalid) {
        alert("모든 시간 슬롯의 시작/종료 시간을 입력해주세요.");
        return;
      }
    } else {
      const invalid = labels.some((l) => !l.trim());
      if (invalid) {
        alert("모든 라벨을 입력해주세요.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const rule: any = {
        startDate,
        endDate,
        days,
        capacity,
        excludeDates,
      };

      if (slotMode === "time") {
        rule.timeSlots = timeSlots;
      } else {
        rule.labels = labels.map((l) => l.trim());
      }

      const res = await ReservationSlotAPI.CReservationSlotsBulk({
        data: { post: postId, rule },
      });

      alert(`${res.created}개의 슬롯이 생성되었습니다.`);
      onCreated();
      setState(false);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popup
      setState={setState}
      title="슬롯 일괄 생성"
      closeBtn
      contentScroll
      style={{ maxWidth: "560px", width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button type="hover" onClick={() => setState(false)}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "일괄 생성"}
          </Button>
        </div>
      }
    >
      <div className={style.bulkFormSection}>
        {/* 기간 */}
        <div className={style.bulkFormRow}>
          <span className={style.bulkFormLabel}>기간</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="date"
              className={style.configDateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: "var(--text-color-2)" }}>~</span>
            <input
              type="date"
              className={style.configDateInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* 요일 */}
        <div className={style.bulkFormRow}>
          <span className={style.bulkFormLabel}>요일</span>
          <div className={style.dayCheckboxGroup}>
            {DAY_LABELS.map((label, idx) => (
              <label
                key={idx}
                className={`${style.dayCheckbox} ${
                  days.includes(idx) ? style.dayCheckboxChecked : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={days.includes(idx)}
                  onChange={() => toggleDay(idx)}
                  style={{ display: "none" }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* 슬롯 (시간 모드) */}
        {slotMode === "time" && (
          <div className={style.bulkFormRow}>
            <span className={style.bulkFormLabel}>시간 슬롯</span>
            <div className={style.timeSlotGroup}>
              {timeSlots.map((ts, idx) => (
                <div key={idx} className={style.timeSlotRow}>
                  <input
                    type="time"
                    className={style.timeInput}
                    value={ts.startTime}
                    onChange={(e) =>
                      updateTimeSlot(idx, "startTime", e.target.value)
                    }
                  />
                  <span style={{ color: "var(--text-color-2)" }}>~</span>
                  <input
                    type="time"
                    className={style.timeInput}
                    value={ts.endTime}
                    onChange={(e) =>
                      updateTimeSlot(idx, "endTime", e.target.value)
                    }
                  />
                  {timeSlots.length > 1 && (
                    <button
                      className={style.removeBtn}
                      onClick={() => removeTimeSlot(idx)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button className={style.addSlotBtn} onClick={addTimeSlot}>
                + 시간 추가
              </button>
            </div>
          </div>
        )}

        {/* 슬롯 (라벨 모드) */}
        {slotMode === "label" && (
          <div className={style.bulkFormRow}>
            <span className={style.bulkFormLabel}>슬롯 라벨</span>
            <div className={style.timeSlotGroup}>
              {labels.map((label, idx) => (
                <div key={idx} className={style.timeSlotRow}>
                  <input
                    className={style.labelInput}
                    placeholder={`예: ${idx + 1}교시`}
                    value={label}
                    onChange={(e) => updateLabel(idx, e.target.value)}
                  />
                  {labels.length > 1 && (
                    <button
                      className={style.removeBtn}
                      onClick={() => removeLabel(idx)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button className={style.addSlotBtn} onClick={addLabel}>
                + 라벨 추가
              </button>
            </div>
          </div>
        )}

        {/* 정원 */}
        <div className={style.bulkFormRow}>
          <span className={style.bulkFormLabel}>슬롯당 정원</span>
          <input
            type="number"
            className={style.configNumberInput}
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* 제외 날짜 */}
        <div className={style.bulkFormRow}>
          <span className={style.bulkFormLabel}>제외 날짜 (선택)</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="date"
              className={style.configDateInput}
              value={excludeDateInput}
              onChange={(e) => setExcludeDateInput(e.target.value)}
            />
            <Button type="hover" onClick={addExcludeDate}>
              추가
            </Button>
          </div>
          {excludeDates.length > 0 && (
            <div className={style.excludeDateList}>
              {excludeDates.map((d) => (
                <span key={d} className={style.excludeDateTag}>
                  {d}
                  <button onClick={() => removeExcludeDate(d)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Popup>
  );
};

export default SlotBulkCreateForm;
