import { Ref, useEffect, useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import Svg from "assets/svg/Svg";
import { TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { NO_PRINT_CLASS } from "utils/printArea";
import {
  buildTimetableSlots,
  buildWeekGrid,
  formatDateOnly,
  isDateFieldType,
  isPeriodFieldType,
  shiftWeekStart,
  weekStartMonday,
  TTimetableSlot,
} from "utils/timetableSlots";

type Props = {
  formId: string;
  rows: TAltSheetRow[];
  fields: TAltFormField[];
  onOpenRow: (rowId: string) => void;
  /** 인쇄 대상 루트 (현재 주 그리드) */
  printRootRef?: Ref<HTMLDivElement>;
  printTitle?: string;
};

type TTimetablePrefs = {
  dateFieldId?: string;
  periodFieldId?: string;
  selectedDays?: number[];
  contentKeys?: string[];
};

/** 칸 내용용 특수 키: 응답자 이름 */
const CONTENT_RESPONDENT = "__respondent";

const DAY_OPTIONS: { index: number; label: string }[] = [
  { index: 0, label: "월" },
  { index: 1, label: "화" },
  { index: 2, label: "수" },
  { index: 3, label: "목" },
  { index: 4, label: "금" },
  { index: 5, label: "토" },
  { index: 6, label: "일" },
];

const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6];

const CONTENT_FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "radio",
  "multiSelect",
  "number",
  "time",
  "userSelect",
];

const prefsKey = (formId: string) => `altSheet_${formId}_timetablePrefs`;

const readTimetablePrefs = (formId: string): TTimetablePrefs => {
  if (!formId) return {};
  try {
    const raw = localStorage.getItem(prefsKey(formId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as TTimetablePrefs;
  } catch {
    return {};
  }
};

const writeTimetablePrefs = (formId: string, prefs: TTimetablePrefs) => {
  if (!formId) return;
  try {
    localStorage.setItem(prefsKey(formId), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
};

const sanitizeDays = (days: unknown): number[] => {
  if (!Array.isArray(days)) return DEFAULT_DAYS;
  const next = Array.from(
    new Set(
      days.filter(
        (d): d is number =>
          typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6
      )
    )
  ).sort((a, b) => a - b);
  return next.length > 0 ? next : DEFAULT_DAYS;
};

const formatCellValue = (value: unknown): string => {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const o = value as { name?: string; userName?: string };
    if (o.name) return String(o.name);
    if (o.userName) return String(o.userName);
    return "";
  }
  return String(value);
};

const resolveRespondentLabel = (
  row: TAltSheetRow,
  fields: TAltFormField[]
): string => {
  if (row._respondentName) return String(row._respondentName);
  const nameField = fields.find((f) => f.label === "이름");
  if (nameField) {
    const fromName = formatCellValue(row.data?.[nameField._id]);
    if (fromName) return fromName;
  }
  if (row._respondentId) return String(row._respondentId);
  return "";
};

const slotContentLines = (
  slot: TTimetableSlot,
  fields: TAltFormField[],
  contentKeys: string[]
): string[] => {
  const row = slot.row as TAltSheetRow;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const key of contentKeys) {
    let text = "";
    if (key === CONTENT_RESPONDENT) {
      text = resolveRespondentLabel(row, fields);
    } else {
      const field = fields.find((f) => f._id === key);
      if (!field) continue;
      text = formatCellValue(row.data?.[field._id]);
    }
    if (!text) continue;
    const line = text.length > 48 ? `${text.slice(0, 48)}…` : text;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  if (lines.length === 0) lines.push("응답");
  return lines;
};

export const getTimetableAxisFields = (fields: TAltFormField[]) => {
  const dateFields = fields.filter(
    (f) => f.type !== "content" && isDateFieldType(f.type)
  );
  const periodFields = fields.filter(
    (f) =>
      f.type !== "content" &&
      f.type !== "approval" &&
      f.type !== "file" &&
      !isDateFieldType(f.type) &&
      isPeriodFieldType(f.type)
  );
  return { dateFields, periodFields };
};

const getContentFieldOptions = (
  fields: TAltFormField[],
  dateFieldId: string,
  periodFieldId: string
) => {
  const formFields = fields.filter(
    (f) =>
      f._id !== dateFieldId &&
      f._id !== periodFieldId &&
      f.type !== "content" &&
      f.type !== "approval" &&
      f.type !== "file" &&
      CONTENT_FIELD_TYPES.includes(f.type)
  );
  return [
    { id: CONTENT_RESPONDENT, label: "응답자" },
    ...formFields.map((f) => ({ id: f._id, label: f.label })),
  ];
};

const defaultContentKeys = (
  options: { id: string; label: string }[]
): string[] => {
  const byLabel = (label: string) =>
    options.find((o) => o.label === label)?.id;
  const picked: string[] = [];
  // 응답자 칩이 이름 필드로 폴백하므로 기본은 응답자 우선
  if (options.some((o) => o.id === CONTENT_RESPONDENT)) {
    picked.push(CONTENT_RESPONDENT);
  } else {
    const nameId = byLabel("이름");
    if (nameId) picked.push(nameId);
  }
  const roomId = byLabel("강의실");
  if (roomId) picked.push(roomId);
  if (picked.length === 0 && options[0]) picked.push(options[0].id);
  if (picked.length === 1) {
    const next = options.find(
      (o) => !picked.includes(o.id) && o.id !== byLabel("이름")
    );
    if (next) picked.push(next.id);
  }
  return picked;
};

const SheetTimetableView = ({
  formId,
  rows,
  fields,
  onOpenRow,
  printRootRef,
  printTitle,
}: Props) => {
  const { dateFields, periodFields } = useMemo(
    () => getTimetableAxisFields(fields),
    [fields]
  );

  const [dateFieldId, setDateFieldId] = useState(() => {
    const prefs = readTimetablePrefs(formId);
    if (
      prefs.dateFieldId &&
      dateFields.some((f) => f._id === prefs.dateFieldId)
    ) {
      return prefs.dateFieldId;
    }
    return dateFields[0]?._id || "";
  });
  const [periodFieldId, setPeriodFieldId] = useState(() => {
    const prefs = readTimetablePrefs(formId);
    if (
      prefs.periodFieldId &&
      periodFields.some((f) => f._id === prefs.periodFieldId)
    ) {
      return prefs.periodFieldId;
    }
    return periodFields[0]?._id || "";
  });
  const [weekStart, setWeekStart] = useState<string | null>(null);
  /** Mon=0 .. Sun=6 */
  const [selectedDays, setSelectedDays] = useState<number[]>(() =>
    sanitizeDays(readTimetablePrefs(formId).selectedDays)
  );
  const [contentKeys, setContentKeys] = useState<string[]>([]);
  const [contentInit, setContentInit] = useState(false);

  const todayStr = formatDateOnly(new Date());

  useEffect(() => {
    if (
      dateFieldId &&
      !dateFields.some((f) => f._id === dateFieldId) &&
      dateFields[0]
    ) {
      setDateFieldId(dateFields[0]._id);
    }
  }, [dateFields, dateFieldId]);

  useEffect(() => {
    if (
      periodFieldId &&
      !periodFields.some((f) => f._id === periodFieldId) &&
      periodFields[0]
    ) {
      setPeriodFieldId(periodFields[0]._id);
    }
  }, [periodFields, periodFieldId]);

  const contentOptions = useMemo(
    () => getContentFieldOptions(fields, dateFieldId, periodFieldId),
    [fields, dateFieldId, periodFieldId]
  );

  const contentOptionIds = useMemo(
    () => contentOptions.map((o) => o.id).join("\0"),
    [contentOptions]
  );

  useEffect(() => {
    if (!contentInit && contentOptions.length > 0) {
      const prefs = readTimetablePrefs(formId);
      const allowed = new Set(contentOptions.map((o) => o.id));
      const fromPrefs = (prefs.contentKeys || []).filter((id) =>
        allowed.has(id)
      );
      setContentKeys(
        fromPrefs.length > 0
          ? fromPrefs
          : defaultContentKeys(contentOptions)
      );
      setContentInit(true);
      return;
    }
    if (!contentInit) return;
    setContentKeys((prev) => {
      const allowed = new Set(contentOptions.map((o) => o.id));
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev;
      }
      if (next.length > 0) return next;
      return defaultContentKeys(contentOptions);
    });
    // contentOptionIds: options membership only (avoid resetting chips on parent re-render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentOptionIds, contentInit, formId]);

  useEffect(() => {
    if (!formId || !contentInit) return;
    writeTimetablePrefs(formId, {
      dateFieldId,
      periodFieldId,
      selectedDays,
      contentKeys,
    });
  }, [
    formId,
    dateFieldId,
    periodFieldId,
    selectedDays,
    contentKeys,
    contentInit,
  ]);

  const dateField = dateFields.find((f) => f._id === dateFieldId);
  const periodField = periodFields.find((f) => f._id === periodFieldId);

  const { slots, error, periodOrder } = useMemo(() => {
    if (!dateField || !periodField) {
      return { slots: [], error: null, periodOrder: [] as string[] };
    }
    return buildTimetableSlots(rows as any[], fields as any[], {
      dateLabel: dateField.label,
      periodLabel: periodField.label,
    });
  }, [rows, fields, dateField, periodField]);

  useEffect(() => {
    if (weekStart) return;
    const weeks = Array.from(
      new Set(
        slots.map((s) => s.weekStart).filter((w): w is string => !!w)
      )
    ).sort();
    if (weeks[0]) setWeekStart(weeks[0]);
    else {
      const today = weekStartMonday(formatDateOnly(new Date()));
      if (today) setWeekStart(today);
    }
  }, [slots, weekStart]);

  const dayIndexes = useMemo(() => {
    const sorted = [...selectedDays].sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : DEFAULT_DAYS;
  }, [selectedDays]);

  const gridResult = useMemo(() => {
    if (!weekStart) return null;
    return buildWeekGrid(slots, periodOrder, weekStart, dayIndexes);
  }, [slots, periodOrder, weekStart, dayIndexes]);

  const weekLabel = useMemo(() => {
    if (!weekStart) return "";
    const parts = weekStart.split("-").map(Number);
    if (parts.length < 3 || parts.some((n) => isNaN(n))) return weekStart;
    const sun = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    sun.setUTCDate(sun.getUTCDate() + 6);
    return `${weekStart} ~ ${formatDateOnly(sun)}`;
  }, [weekStart]);

  const goToToday = () => {
    const today = weekStartMonday(formatDateOnly(new Date()));
    if (today) setWeekStart(today);
  };

  const toggleDay = (index: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(index)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== index);
      }
      return [...prev, index].sort((a, b) => a - b);
    });
  };

  const toggleContent = (id: string) => {
    setContentKeys((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== id);
      }
      return [...prev, id];
    });
  };

  if (dateFields.length === 0 || periodFields.length === 0) {
    return (
      <div className={style.sheetEmpty}>
        시간표 보기를 쓰려면 날짜 필드와 항목(선택·텍스트 등) 필드가 필요합니다.
      </div>
    );
  }

  return (
    <div className={style.sheetTimetable}>
      <div
        className={`${style.sheetTimetableToolbar} ${style.noPrint} ${NO_PRINT_CLASS}`}
      >
        <div className={style.sheetTimetableToolbarLeft}>
          <label className={style.sheetTimetableField}>
            <span>날짜</span>
            <select
              value={dateFieldId}
              onChange={(e) => {
                setDateFieldId(e.target.value);
                setWeekStart(null);
              }}
            >
              {dateFields.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className={style.sheetTimetableField}>
            <span>항목</span>
            <select
              value={periodFieldId}
              onChange={(e) => {
                setPeriodFieldId(e.target.value);
                setWeekStart(null);
              }}
            >
              {periodFields.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={style.sheetTimetableWeekNav}>
          <div className={style.sheetTimetableWeekNavBtns}>
            <button
              type="button"
              className={style.sheetTimetableWeekNavBtn}
              disabled={!weekStart}
              onClick={() =>
                weekStart && setWeekStart(shiftWeekStart(weekStart, -1))
              }
              title="이전 주"
              aria-label="이전 주"
            >
              <Svg type="chevronLeft" width="16px" height="16px" />
            </button>
            <button
              type="button"
              className={style.sheetTimetableWeekNavBtn}
              disabled={!weekStart}
              onClick={goToToday}
              title="오늘"
            >
              오늘
            </button>
            <button
              type="button"
              className={style.sheetTimetableWeekNavBtn}
              disabled={!weekStart}
              onClick={() =>
                weekStart && setWeekStart(shiftWeekStart(weekStart, 1))
              }
              title="다음 주"
              aria-label="다음 주"
            >
              <Svg type="chevronRight" width="16px" height="16px" />
            </button>
          </div>
          <span className={style.sheetTimetableWeekLabel}>
            {weekLabel || "—"}
          </span>
        </div>
      </div>

      <div
        className={`${style.sheetTimetableOptions} ${style.noPrint} ${NO_PRINT_CLASS}`}
      >
        <div className={style.sheetTimetableOptionGroup}>
          <span className={style.sheetTimetableOptionLabel}>요일</span>
          <div
            className={style.sheetTimetableChipRow}
            role="group"
            aria-label="요일 선택"
          >
            {DAY_OPTIONS.map((d) => {
              const active = selectedDays.includes(d.index);
              return (
                <button
                  key={d.index}
                  type="button"
                  className={`${style.sheetTimetableChip} ${
                    active ? style.sheetTimetableChipActive : ""
                  }`}
                  aria-pressed={active}
                  onClick={() => toggleDay(d.index)}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className={style.sheetTimetableOptionGroup}>
          <span className={style.sheetTimetableOptionLabel}>내용</span>
          <div
            className={style.sheetTimetableChipRow}
            role="group"
            aria-label="칸 내용"
          >
            {contentOptions.map((opt) => {
              const active = contentKeys.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`${style.sheetTimetableChip} ${
                    active ? style.sheetTimetableChipActive : ""
                  }`}
                  aria-pressed={active}
                  onClick={() => toggleContent(opt.id)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? (
        <div className={style.sheetEmpty}>시간표: {error}</div>
      ) : !gridResult || slots.length === 0 ? (
        <div className={style.sheetEmpty}>표시할 시간표 데이터가 없습니다.</div>
      ) : gridResult.grid.length === 0 ? (
        <div className={style.sheetEmpty}>이 주에 표시할 항목이 없습니다.</div>
      ) : (
        <div ref={printRootRef} className={style.sheetTimetableWrap}>
          {printTitle ? (
            <div className={style.printTitle}>{printTitle}</div>
          ) : null}
          {weekLabel ? (
            <div className={style.printTitle} style={{ fontSize: 13, fontWeight: 500 }}>
              {weekLabel}
            </div>
          ) : null}
          <table className={style.sheetTimetableTable}>
            <thead>
              <tr>
                <th>{periodField?.label || "항목"}</th>
                {gridResult.dayCols.map((col) => {
                  const isToday = !!col.date && col.date === todayStr;
                  return (
                    <th key={col.index}>
                      <div className={style.sheetTimetableDayHead}>
                        <span className={style.sheetTimetableDayName}>
                          {col.label}
                        </span>
                        {col.date ? (
                          <span
                            className={`${style.sheetTimetableDayDate} ${
                              isToday ? style.sheetTimetableDayDateToday : ""
                            }`}
                          >
                            {col.date.slice(5)}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {gridResult.grid.map((row) => (
                <tr key={row.period}>
                  <th scope="row">{row.period}</th>
                  {row.cells.map((slotList, ci) => (
                    <td key={ci}>
                      {slotList.length === 0 ? null : (
                        <div className={style.sheetTimetableCell}>
                          {slotList.map((slot, si) => {
                            const rowId = (slot.row as TAltSheetRow)._id;
                            const lines = slotContentLines(
                              slot,
                              fields,
                              contentKeys
                            );
                            return (
                              <button
                                key={`${rowId || si}-${si}`}
                                type="button"
                                className={style.sheetTimetableSlot}
                                title="문서 보기로 열기"
                                onClick={() => rowId && onOpenRow(rowId)}
                                disabled={!rowId}
                              >
                                {lines.map((line, li) => (
                                  <span
                                    key={li}
                                    className={
                                      li === 0
                                        ? style.sheetTimetableSlotPrimary
                                        : style.sheetTimetableSlotSecondary
                                    }
                                  >
                                    {line}
                                  </span>
                                ))}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SheetTimetableView;
