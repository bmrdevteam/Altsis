import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useOutsideClick from "hooks/useOutsideClick";
import style from "./dateRangeFilter.module.scss";

export type DateRange = {
  from: string; // "YYYY-MM-DD" or ""
  to: string; // "YYYY-MM-DD" or ""
};

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  compact?: boolean;
};

const getToday = (): DateRange => {
  const d = new Date();
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: s, to: s };
};

const getThisWeek = (): DateRange => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(monday), to: fmt(sunday) };
};

const getThisMonth = (): DateRange => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(first), to: fmt(last) };
};

const rangesEqual = (a: DateRange, b: DateRange) =>
  a.from === b.from && a.to === b.to;

const formatShort = (dateStr: string): string => {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  return `${parts[1]}.${parts[2]}`;
};

const DateRangeFilterDropdown = ({
  value,
  onChange,
  placeholder = "날짜 필터",
  compact,
}: Props) => {
  const outsideClick = useOutsideClick();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 2,
        left: rect.left,
      });
    }
  }, []);

  useEffect(() => {
    if (outsideClick.active) {
      updatePosition();
    }
  }, [outsideClick.active, updatePosition]);

  const activePreset = useMemo(() => {
    if (!value.from && !value.to) return null;
    if (rangesEqual(value, getToday())) return "today";
    if (rangesEqual(value, getThisWeek())) return "week";
    if (rangesEqual(value, getThisMonth())) return "month";
    return null;
  }, [value]);

  const displayText = useMemo(() => {
    if (!value.from && !value.to) return placeholder;
    if (activePreset === "today") return "오늘";
    if (activePreset === "week") return "이번 주";
    if (activePreset === "month") return "이번 달";
    if (value.from && value.to)
      return `${formatShort(value.from)}~${formatShort(value.to)}`;
    if (value.from) return `${formatShort(value.from)}~`;
    return `~${formatShort(value.to)}`;
  }, [value, activePreset, placeholder]);

  const hasFilter = value.from || value.to;

  const handlePreset = (range: DateRange) => {
    onChange(range);
    outsideClick.setActive(false);
  };

  return (
    <div
      className={compact ? style.containerInline : style.container}
      ref={outsideClick.RefObject}
    >
      <button
        ref={triggerRef}
        className={`${style.trigger} ${compact ? style.triggerCompact : ""} ${hasFilter ? style.triggerActive : ""}`}
        onClick={() => outsideClick.setActive(!outsideClick.active)}
      >
        {displayText}
      </button>
      {outsideClick.active && (
        <div
          className={style.dropdown}
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className={style.presets}>
            <button
              className={activePreset === "today" ? style.presetActive : ""}
              onClick={() => handlePreset(getToday())}
            >
              오늘
            </button>
            <button
              className={activePreset === "week" ? style.presetActive : ""}
              onClick={() => handlePreset(getThisWeek())}
            >
              이번 주
            </button>
            <button
              className={activePreset === "month" ? style.presetActive : ""}
              onClick={() => handlePreset(getThisMonth())}
            >
              이번 달
            </button>
          </div>
          <div className={style.dateInputs}>
            <label>
              <span>시작일</span>
              <input
                type="date"
                value={value.from}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
              />
            </label>
            <label>
              <span>종료일</span>
              <input
                type="date"
                value={value.to}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
              />
            </label>
          </div>
          {hasFilter && (
            <button
              className={style.resetBtn}
              onClick={() => {
                onChange({ from: "", to: "" });
                outsideClick.setActive(false);
              }}
            >
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangeFilterDropdown;
