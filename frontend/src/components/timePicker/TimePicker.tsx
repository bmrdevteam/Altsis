import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import style from "./timePicker.module.scss";
import {
  formatTimeDisplay,
  parseTimeValue,
  toHHmm,
  TParsedTime,
} from "./timeValue";

type Draft = Partial<TParsedTime>;

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PANEL_HEIGHT = 220;
const PANEL_WIDTH = 192;

const completeTime = (draft: Draft): TParsedTime => ({
  ampm: draft.ampm ?? "am",
  hour12: draft.hour12 ?? 12,
  minute: draft.minute ?? 0,
});

const TimePicker = ({ value, onChange, disabled }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const parsed = useMemo(() => parseTimeValue(value), [value]);
  const display = formatTimeDisplay(value);

  useEffect(() => {
    if (!open) return;
    setDraft(parsed || {});
  }, [open, parsed]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let top = rect.bottom + 4;
      if (top + PANEL_HEIGHT > window.innerHeight - 8 && rect.top > PANEL_HEIGHT) {
        top = rect.top - PANEL_HEIGHT - 4;
      }
      let left = rect.left;
      if (left + PANEL_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - PANEL_WIDTH - 8);
      }
      setPanelPos({ top, left });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scrollSelected = (col: HTMLDivElement | null) => {
      const el = col?.querySelector<HTMLElement>("[data-selected='true']");
      if (!col || !el) return;
      col.scrollTop =
        el.offsetTop - col.clientHeight / 2 + el.clientHeight / 2;
    };
    scrollSelected(hourColRef.current);
    scrollSelected(minuteColRef.current);
  }, [open, draft.hour12, draft.minute]);

  const commit = (next: Draft, close: boolean) => {
    const full = completeTime(next);
    onChange(toHHmm(full.ampm, full.hour12, full.minute));
    setDraft(next);
    if (close) setOpen(false);
  };

  const selectedAmpm = draft.ampm ?? parsed?.ampm;
  const selectedHour = draft.hour12 ?? parsed?.hour12;
  const selectedMinute =
    draft.minute !== undefined ? draft.minute : parsed?.minute;

  const panel =
    open && !disabled
      ? createPortal(
          <div
            className={style.panel}
            ref={panelRef}
            role="listbox"
            aria-label="시간"
            style={{
              top: panelPos.top,
              left: panelPos.left,
            }}
          >
            <div className={style.column} role="group" aria-label="오전 오후">
              {(
                [
                  { key: "am" as const, label: "오전" },
                  { key: "pm" as const, label: "오후" },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={selectedAmpm === item.key}
                  className={`${style.option} ${
                    selectedAmpm === item.key ? style.optionSelected : ""
                  }`}
                  onClick={() =>
                    commit({ ...completeTime(draft), ampm: item.key }, false)
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div
              className={style.column}
              role="group"
              aria-label="시"
              ref={hourColRef}
            >
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  role="option"
                  data-selected={selectedHour === hour ? "true" : undefined}
                  aria-selected={selectedHour === hour}
                  className={`${style.option} ${
                    selectedHour === hour ? style.optionSelected : ""
                  }`}
                  onClick={() =>
                    commit({ ...completeTime(draft), hour12: hour }, false)
                  }
                >
                  {String(hour).padStart(2, "0")}
                </button>
              ))}
            </div>
            <div
              className={style.column}
              role="group"
              aria-label="분"
              ref={minuteColRef}
            >
              {MINUTES.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  role="option"
                  data-selected={selectedMinute === minute ? "true" : undefined}
                  aria-selected={selectedMinute === minute}
                  className={`${style.option} ${
                    selectedMinute === minute ? style.optionSelected : ""
                  }`}
                  onClick={() =>
                    commit({ ...completeTime(draft), minute }, true)
                  }
                >
                  {String(minute).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={style.wrap} ref={wrapRef}>
      <button
        type="button"
        className={style.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="시간 선택"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        {display ? (
          display
        ) : (
          <span className={style.placeholder}>-- --:--</span>
        )}
      </button>
      {panel}
    </div>
  );
};

export default TimePicker;
