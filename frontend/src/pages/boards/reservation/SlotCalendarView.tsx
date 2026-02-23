import { useMemo, useState } from "react";
import { TReservationSlot, TSlotMode } from "types/reservation";
import { SlotStatusBadge } from "./ReservationStatusBadge";
import style from "./reservation.module.scss";

type Props = {
  slots: TReservationSlot[];
  slotMode: TSlotMode;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

const SlotCalendarView = ({
  slots,
  slotMode,
  selectedDate,
  onSelectDate,
}: Props) => {
  const [viewDate, setViewDate] = useState(() => {
    // 슬롯이 있으면 첫 슬롯 날짜 기준, 아니면 현재 달
    if (slots.length > 0) {
      const d = new Date(slots[0].date);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () =>
    setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // 날짜별 슬롯 그룹
  const slotsByDate = useMemo(() => {
    const map: Record<string, TReservationSlot[]> = {};
    for (const slot of slots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [slots]);

  // 캘린더 셀 생성
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const result: {
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // 이전 달
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === todayStr });
    }

    // 현재 달
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === todayStr });
    }

    // 다음 달
    const remaining = 7 - (result.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        result.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === todayStr });
      }
    }

    return result;
  }, [year, month]);

  // 선택한 날짜의 슬롯
  const selectedSlots = selectedDate ? slotsByDate[selectedDate] || [] : [];

  const formatSlotLabel = (slot: TReservationSlot) => {
    let text = "";
    if (slotMode === "time") {
      text = `${slot.startTime} ~ ${slot.endTime}`;
    } else {
      text = slot.label || "";
    }
    if (slot.item) {
      text += ` · ${slot.item}`;
    }
    return text;
  };

  return (
    <div className={style.calendarContainer}>
      {/* 네비게이션 */}
      <div className={style.calendarNav}>
        <button className={style.calendarNavBtn} onClick={prevMonth}>
          ‹
        </button>
        <div className={style.calendarNavCenter}>
          <span className={style.calendarMonth}>
            {year}년 {month + 1}월
          </span>
          <button className={style.calendarNavBtn} onClick={goToday}>
            오늘
          </button>
        </div>
        <button className={style.calendarNavBtn} onClick={nextMonth}>
          ›
        </button>
      </div>

      {/* 캘린더 그리드 */}
      <div className={style.calendarGrid}>
        {DAY_HEADERS.map((d) => (
          <div key={d} className={style.calendarDayHeader}>
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const dateSlots = slotsByDate[cell.date] || [];
          const openCount = dateSlots.filter((s) => s.status === "open").length;
          const fullCount = dateSlots.filter((s) => s.status === "full").length;

          return (
            <div
              key={cell.date}
              className={`${style.calendarCell} ${
                !cell.isCurrentMonth ? style.calendarCellOther : ""
              } ${cell.isToday ? style.calendarCellToday : ""} ${
                selectedDate === cell.date ? style.calendarCellSelected : ""
              }`}
              onClick={() => onSelectDate(cell.date)}
            >
              <div className={style.calendarDate}>
                {cell.isToday ? (
                  <span className={style.calendarDateToday}>{cell.day}</span>
                ) : (
                  cell.day
                )}
              </div>
              {dateSlots.length > 0 && (
                <>
                  <div className={style.calendarSlotDot}>
                    {dateSlots.slice(0, 6).map((s, i) => (
                      <span
                        key={i}
                        className={`${style.slotDot} ${
                          s.status === "full" ? style.slotDotFull : ""
                        }`}
                      />
                    ))}
                  </div>
                  <div className={style.calendarSlotCount}>
                    {openCount > 0 && `${openCount}건`}
                    {fullCount > 0 && ` (마감 ${fullCount})`}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택한 날짜의 슬롯 목록 */}
      {selectedDate && (
        <div className={style.dayPanel}>
          <div className={style.dayPanelHeader}>
            <span className={style.dayPanelTitle}>
              {selectedDate} ({DAY_HEADERS[new Date(selectedDate).getDay()]})
            </span>
            <span className={style.dayPanelSubtext}>
              {selectedSlots.length}개 슬롯
            </span>
          </div>

          {selectedSlots.length === 0 ? (
            <div className={style.emptyState}>
              이 날짜에 등록된 슬롯이 없습니다.
            </div>
          ) : (
            <div className={style.slotList}>
              {selectedSlots
                .sort((a, b) => {
                  const primary =
                    slotMode === "time"
                      ? (a.startTime || "").localeCompare(b.startTime || "")
                      : (a.label || "").localeCompare(b.label || "");
                  if (primary !== 0) return primary;
                  return (a.item || "").localeCompare(b.item || "");
                })
                .map((slot) => (
                  <div key={slot._id} className={style.slotCard}>
                    <div className={style.slotInfo}>
                      <span className={style.slotTime}>
                        {formatSlotLabel(slot)}
                      </span>
                      <span className={style.slotCapacity}>
                        {slot.currentCount}/{slot.capacity}명
                        {slot.memo && ` · ${slot.memo}`}
                      </span>
                    </div>
                    <div className={style.slotActions}>
                      <SlotStatusBadge status={slot.status} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SlotCalendarView;
