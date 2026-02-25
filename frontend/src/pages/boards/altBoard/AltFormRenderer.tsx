import { useCallback, useEffect, useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import {
  TAltForm,
  TAltFormField,
  TDisplayCondition,
} from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { TChatUser } from "types/chat";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";

type Props = {
  board: TBoard;
  formId: string;
  onBack: () => void;
};

/* ── 시스템 변수 ── */

const getSystemVariableValue = (varId: string): string => {
  const now = new Date();
  switch (varId) {
    case "_system_date":
      return now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    case "_system_time": {
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
    case "_system_day":
      return ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
    default:
      return "";
  }
};

/* ── 조건부 필드 평가 유틸 ── */

const evaluateCondition = (
  condition: { fieldId: string; operator: string; value: any },
  data: Record<string, any>
): boolean => {
  const fieldValue = condition.fieldId.startsWith("_system_")
    ? getSystemVariableValue(condition.fieldId)
    : data[condition.fieldId];
  switch (condition.operator) {
    case "equals":
      return String(fieldValue ?? "") === String(condition.value ?? "");
    case "notEquals":
      return String(fieldValue ?? "") !== String(condition.value ?? "");
    case "contains":
      return String(fieldValue ?? "").includes(String(condition.value ?? ""));
    case "before":
      return String(fieldValue ?? "") < String(condition.value ?? "");
    case "after":
      return String(fieldValue ?? "") > String(condition.value ?? "");
    case "isEmpty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "isNotEmpty":
      return !(
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
};

const isFieldVisible = (
  field: TAltFormField,
  data: Record<string, any>
): boolean => {
  const dc = field.displayCondition;
  if (!dc?.enabled || !dc.conditions.length) return true;

  if (dc.logic === "or") {
    return dc.conditions.some((c) => evaluateCondition(c, data));
  }
  return dc.conditions.every((c) => evaluateCondition(c, data));
};

const AltFormRenderer = ({ board, formId, onBack }: Props) => {
  const { AltFormAPI, AltSheetRowAPI, ChatAPI } = useAPIv2();
  const { currentSchool, currentRegistration } = useAuth();

  const [form, setForm] = useState<TAltForm | null>(null);
  const [myRow, setMyRow] = useState<TAltSheetRow | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // counter 필드용 현재 카운트
  const [counterCounts, setCounterCounts] = useState<Record<string, number>>(
    {}
  );

  // userSelect / approval 용 사용자 검색
  const [userSearchQuery, setUserSearchQuery] = useState<
    Record<string, string>
  >({});
  const [userSearchResults, setUserSearchResults] = useState<
    Record<string, TChatUser[]>
  >({});

  // 사전등록 모드용 가용 조합
  const [availableCombinations, setAvailableCombinations] = useState<
    { values: Record<string, any>; availableCount: number }[]
  >([]);

  useEffect(() => {
    Promise.all([
      AltFormAPI.RAltForm({ params: { _id: formId } }),
      AltSheetRowAPI.RAltSheetRowMy({ query: { form: formId } }),
    ])
      .then(([{ form: loadedForm }, { row }]) => {
        setForm(loadedForm);
        if (row) {
          if (loadedForm.settings.allowMultipleResponses) {
            // 다중 응답: 항상 빈 폼 유지 (이전 응답 불러오지 않음)
          } else {
            setMyRow(row);
            setData(row.data || {});
            setIsSubmitted(true);
          }
        }

        // counter 필드 카운트 로드
        const counterFields = loadedForm.fields.filter(
          (f: TAltFormField) => f.type === "counter"
        );
        if (counterFields.length > 0) {
          AltSheetRowAPI.RAltSheetRowCount({
            query: { form: loadedForm._id },
          })
            .then(({ count }: { count: number }) => {
              const counts: Record<string, number> = {};
              for (const cf of counterFields) {
                counts[cf._id] = count;
              }
              setCounterCounts(counts);
            })
            .catch(() => {});
        }

        // 사전등록 가용 조합 로드
        const preRegFields = loadedForm.fields.filter(
          (f: TAltFormField) =>
            f.duplicateCheck?.enabled &&
            f.duplicateCheck.mode === "preRegistration"
        );
        if (preRegFields.length > 0) {
          AltSheetRowAPI.RAltSheetRowAvailableCombinations({
            query: { form: loadedForm._id },
          })
            .then(({ combinations }: any) => {
              setAvailableCombinations(combinations || []);
            })
            .catch(() => {});
        }

        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        onBack();
      });
  }, [formId]);

  // 사용자 검색 디바운스
  const searchUsers = useCallback(
    async (fieldId: string, query: string) => {
      if (!query.trim()) {
        setUserSearchResults((prev) => ({ ...prev, [fieldId]: [] }));
        return;
      }
      try {
        const { users } = await ChatAPI.RChatUsers({
          query: {
            q: query,
            sid: currentSchool?.school || undefined,
          },
        });
        setUserSearchResults((prev) => ({ ...prev, [fieldId]: users }));
      } catch {
        /* ignore */
      }
    },
    [currentSchool?.school]
  );

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (const [fieldId, query] of Object.entries(userSearchQuery)) {
      const timer = setTimeout(() => searchUsers(fieldId, query), 300);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, [userSearchQuery, searchUsers]);

  // 조건부 표시를 반영한 필드 목록
  const respondentFields = useMemo(
    () =>
      form?.fields.filter(
        (f) => f.permission === "respondent" && isFieldVisible(f, data)
      ) || [],
    [form, data]
  );

  const visibleOwnerFields = useMemo(
    () =>
      form?.fields.filter(
        (f) =>
          f.permission === "owner" &&
          (f.visibleToRespondent || form.settings.showOwnerFields) &&
          isFieldVisible(f, data)
      ) || [],
    [form, data]
  );

  const isClosed =
    form?.settings.closeAt && new Date(form.settings.closeAt) < new Date();
  const isNotOpen =
    form?.settings.openAt && new Date(form.settings.openAt) > new Date();

  const canSubmit = !isClosed && !isNotOpen;
  const canResubmit =
    (form?.settings.allowResubmit || form?.settings.allowMultipleResponses) &&
    isSubmitted &&
    canSubmit;

  // 퀴즈 결과 가시성
  const quizScoreVisible = useMemo(() => {
    if (!form?.settings.quizMode) return false;
    const reveal = form.settings.quizSettings?.scoreReveal;
    if (reveal === "immediately") return isSubmitted;
    if (reveal === "afterDeadline") return !!isClosed;
    return false;
  }, [form, isSubmitted, isClosed]);

  const quizAnswerVisible = useMemo(() => {
    if (!form?.settings.quizMode) return false;
    const reveal = form.settings.quizSettings?.answerReveal;
    if (reveal === "immediately") return isSubmitted;
    if (reveal === "afterDeadline") return !!isClosed;
    return false;
  }, [form, isSubmitted, isClosed]);

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
    for (const field of form?.fields || []) {
      if (field.permission !== "respondent") continue;
      if (!isFieldVisible(field, data)) continue;

      const value = data[field._id];

      if (field.required) {
        if (value === undefined || value === null || value === "") {
          newErrors[field._id] = "필수 항목입니다.";
          continue;
        }
      }
      if (
        field.type === "userSelect" &&
        field.required &&
        !data[field._id]?.userId
      ) {
        newErrors[field._id] = "사용자를 선택해주세요.";
      }
      if (
        field.type === "approval" &&
        field.required &&
        !data[field._id]?.approver?.userId
      ) {
        newErrors[field._id] = "승인자를 선택해주세요.";
      }
      // 날짜 필드 제한 검증
      if (field.type === "date" && value) {
        const v = field.validation;
        if (v?.minDate && value < v.minDate) {
          newErrors[field._id] = `${v.minDate} 이후 날짜를 선택해주세요.`;
        } else if (v?.maxDate && value > v.maxDate) {
          newErrors[field._id] = `${v.maxDate} 이전 날짜를 선택해주세요.`;
        } else if (v?.allowedDays && v.allowedDays.length < 7) {
          const day = new Date(value + "T00:00:00").getDay();
          if (!v.allowedDays.includes(day)) {
            newErrors[field._id] = "해당 요일은 선택할 수 없습니다.";
          }
        }
        // 시간 윈도우 검증
        if (v?.availableFrom && v?.availableUntil) {
          const now = new Date();
          const nowMs = now.getTime();
          const [fH, fM] = v.availableFrom.split(":").map(Number);
          const [uH, uM] = v.availableUntil.split(":").map(Number);
          const fDays: number = v.availableFromDays ?? 1;
          const uDays: number = v.availableUntilDays ?? 0;

          const candidate = new Date(value + "T00:00:00");
          const winStart = new Date(candidate);
          winStart.setDate(winStart.getDate() - fDays);
          winStart.setHours(fH, fM, 0, 0);
          const winEnd = new Date(candidate);
          winEnd.setDate(winEnd.getDate() + uDays);
          winEnd.setHours(uH, uM, 0, 0);

          if (nowMs < winStart.getTime() || nowMs > winEnd.getTime()) {
            newErrors[field._id] = "현재 시간에 선택할 수 없는 날짜입니다.";
          }
        }
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

      if (form.settings.allowMultipleResponses) {
        // 다중 응답: 제출 후 완전 초기화
        alert("응답이 제출되었습니다.");
        setMyRow(null);
        setData({});
        setIsSubmitted(false);
      } else {
        setMyRow(row);
        setData(row.data || data);
        setIsSubmitted(true);
      }
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

  /* ── 필드별 퀴즈 결과 마크 ── */
  const getQuizMark = (field: TAltFormField) => {
    if (!quizAnswerVisible || !myRow) return null;
    const fieldResults = myRow.data?._quiz_fieldResults;
    if (!fieldResults) return null;
    const isCorrect = fieldResults[field._id];
    if (isCorrect === undefined) return null;
    return isCorrect;
  };

  /* ── 사전등록 모드: 특정 필드의 가용 옵션 ── */
  const getPreRegOptions = (field: TAltFormField): string[] => {
    if (
      !field.duplicateCheck?.enabled ||
      field.duplicateCheck.mode !== "preRegistration"
    )
      return field.options || [];

    const available = new Set<string>();
    for (const combo of availableCombinations) {
      if (combo.availableCount > 0 && combo.values[field._id] !== undefined) {
        available.add(String(combo.values[field._id]));
      }
    }
    return Array.from(available);
  };

  /* ── 필드 렌더 ── */
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

      case "date": {
        const v = field.validation || {};
        const allowedDays: number[] | undefined = v.allowedDays;
        const availableFrom: string = v.availableFrom || "";
        const availableUntil: string = v.availableUntil || "";
        const fromDays: number = v.availableFromDays ?? 1;
        const untilDays: number = v.availableUntilDays ?? 0;
        const hasTimeWindow = !!(availableFrom && availableUntil);

        // 시간 윈도우: 현재 시각으로 선택 가능한 날짜 목록 계산
        const getSelectableDates = (): string[] => {
          if (!hasTimeWindow) return [];
          const now = new Date();
          const nowMs = now.getTime();
          const toDateStr = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${dd}`;
          };
          const [fH, fM] = availableFrom.split(":").map(Number);
          const [uH, uM] = availableUntil.split(":").map(Number);
          const results: string[] = [];

          // 현재 시간 기준 ±30일 범위 탐색 (충분한 범위)
          for (let offset = -30; offset <= 30; offset++) {
            const candidate = new Date(now);
            candidate.setDate(candidate.getDate() + offset);
            candidate.setHours(0, 0, 0, 0);
            const dateStr = toDateStr(candidate);

            // minDate/maxDate 범위 확인
            if (v.minDate && dateStr < v.minDate) continue;
            if (v.maxDate && dateStr > v.maxDate) continue;

            // 윈도우 시작: 대상일 - fromDays 일 at fromTime
            const winStart = new Date(candidate);
            winStart.setDate(winStart.getDate() - fromDays);
            winStart.setHours(fH, fM, 0, 0);

            // 윈도우 종료: 대상일 + untilDays 일 at untilTime
            const winEnd = new Date(candidate);
            winEnd.setDate(winEnd.getDate() + untilDays);
            winEnd.setHours(uH, uM, 0, 0);

            if (nowMs >= winStart.getTime() && nowMs <= winEnd.getTime()) {
              results.push(dateStr);
            }
          }
          return results;
        };

        const selectableDates = hasTimeWindow ? getSelectableDates() : [];
        const selectableSet = new Set(selectableDates);

        // min/max 적용
        let effectiveMin = v.minDate || "";
        let effectiveMax = v.maxDate || "";
        if (hasTimeWindow && selectableDates.length > 0) {
          effectiveMin = selectableDates[0];
          effectiveMax = selectableDates[selectableDates.length - 1];
        }

        const isDateDisabled = hasTimeWindow && selectableDates.length === 0;

        const handleDateChange = (dateStr: string) => {
          if (dateStr && allowedDays && allowedDays.length < 7) {
            const day = new Date(dateStr + "T00:00:00").getDay();
            if (!allowedDays.includes(day)) {
              setErrors((prev) => ({
                ...prev,
                [field._id]: "해당 요일은 선택할 수 없습니다.",
              }));
              setValue(field._id, "");
              return;
            }
          }
          if (hasTimeWindow && !selectableSet.has(dateStr)) {
            setErrors((prev) => ({
              ...prev,
              [field._id]: "현재 시간에 선택할 수 없는 날짜입니다.",
            }));
            setValue(field._id, "");
            return;
          }
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field._id];
            return next;
          });
          setValue(field._id, dateStr);
        };

        const formattedDate = value
          ? new Date(value + "T00:00:00").toLocaleDateString("ko-KR", {
              year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
            })
          : "";

        return (
          <div>
            <div style={{ position: "relative" }}>
              <input
                className={style.textInput}
                type="date"
                value={value}
                min={effectiveMin}
                max={effectiveMax}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={disabled || isDateDisabled}
                style={value ? { color: "transparent" } : undefined}
              />
              {value && (
                <span
                  style={{
                    position: "absolute", left: "12px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    fontSize: "14px", color: "var(--primary-text-color)",
                  }}
                >
                  {formattedDate}
                </span>
              )}
            </div>
            {allowedDays && allowedDays.length < 7 && (
              <div style={{ fontSize: "11px", color: "var(--text-color-2)", marginTop: "2px" }}>
                {["일", "월", "화", "수", "목", "금", "토"]
                  .filter((_, i) => allowedDays.includes(i))
                  .join(", ")}
                요일만 선택 가능
              </div>
            )}
            {hasTimeWindow && (
              <div style={{ fontSize: "11px", color: isDateDisabled ? "var(--status-error)" : "var(--text-color-2)", marginTop: "2px" }}>
                {isDateDisabled
                  ? "현재 선택 가능한 날짜가 없습니다."
                  : `선택 가능: ${selectableDates.join(", ")}`}
              </div>
            )}
          </div>
        );
      }

      case "multiDate": {
        const mv = field.validation || {};
        const mAllowedDays: number[] | undefined = mv.allowedDays;
        const mAvailFrom: string = mv.availableFrom || "";
        const mAvailUntil: string = mv.availableUntil || "";
        const mFromDays: number = mv.availableFromDays ?? 1;
        const mUntilDays: number = mv.availableUntilDays ?? 0;
        const mHasWindow = !!(mAvailFrom && mAvailUntil);

        const selected: string[] = Array.isArray(value) ? value : [];

        // 시간 윈도우 선택 가능 날짜 계산 (date case와 동일 로직)
        const mSelectableSet = new Set<string>();
        if (mHasWindow) {
          const now = new Date();
          const nowMs = now.getTime();
          const [fH, fM] = mAvailFrom.split(":").map(Number);
          const [uH, uM] = mAvailUntil.split(":").map(Number);
          for (let off = -30; off <= 30; off++) {
            const c = new Date(now);
            c.setDate(c.getDate() + off);
            c.setHours(0, 0, 0, 0);
            const y = c.getFullYear();
            const mo = String(c.getMonth() + 1).padStart(2, "0");
            const dd = String(c.getDate()).padStart(2, "0");
            const ds = `${y}-${mo}-${dd}`;
            if (mv.minDate && ds < mv.minDate) continue;
            if (mv.maxDate && ds > mv.maxDate) continue;
            const ws = new Date(c);
            ws.setDate(ws.getDate() - mFromDays);
            ws.setHours(fH, fM, 0, 0);
            const we = new Date(c);
            we.setDate(we.getDate() + mUntilDays);
            we.setHours(uH, uM, 0, 0);
            if (nowMs >= ws.getTime() && nowMs <= we.getTime()) mSelectableSet.add(ds);
          }
        }

        const handleAddDate = (dateStr: string) => {
          if (!dateStr || selected.includes(dateStr)) return;
          if (mAllowedDays && mAllowedDays.length < 7) {
            const day = new Date(dateStr + "T00:00:00").getDay();
            if (!mAllowedDays.includes(day)) {
              setErrors((p) => ({ ...p, [field._id]: "해당 요일은 선택할 수 없습니다." }));
              return;
            }
          }
          if (mHasWindow && !mSelectableSet.has(dateStr)) {
            setErrors((p) => ({ ...p, [field._id]: "현재 시간에 선택할 수 없는 날짜입니다." }));
            return;
          }
          setErrors((p) => { const n = { ...p }; delete n[field._id]; return n; });
          setValue(field._id, [...selected, dateStr].sort());
        };

        const handleRemoveDate = (dateStr: string) => {
          setValue(field._id, selected.filter((d) => d !== dateStr));
        };

        const mSelectableDates = mHasWindow ? Array.from(mSelectableSet).sort() : [];

        // 요일별 일괄 선택용 날짜 풀 계산
        const dayPool: string[] = (() => {
          if (mHasWindow) return mSelectableDates;
          if (mv.minDate && mv.maxDate) {
            const dates: string[] = [];
            const cur = new Date(mv.minDate + "T00:00:00");
            const end = new Date(mv.maxDate + "T00:00:00");
            while (cur <= end) {
              const y = cur.getFullYear();
              const mo = String(cur.getMonth() + 1).padStart(2, "0");
              const dd = String(cur.getDate()).padStart(2, "0");
              dates.push(`${y}-${mo}-${dd}`);
              cur.setDate(cur.getDate() + 1);
            }
            return dates;
          }
          return [];
        })();

        const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

        const getDatesForDay = (dayIndex: number) =>
          dayPool.filter((d) => new Date(d + "T00:00:00").getDay() === dayIndex);

        const handleToggleDay = (dayIndex: number) => {
          const datesForDay = getDatesForDay(dayIndex);
          if (datesForDay.length === 0) return;
          const allSelected = datesForDay.every((d) => selected.includes(d));
          if (allSelected) {
            const removeSet = new Set(datesForDay);
            setValue(field._id, selected.filter((d) => !removeSet.has(d)));
          } else {
            const merged = Array.from(new Set([...selected, ...datesForDay])).sort();
            setValue(field._id, merged);
          }
        };

        return (
          <div>
            {!disabled && dayPool.length > 0 && (
              <div className={style.dayOfWeekBar}>
                {DAY_LABELS.map((label, i) => {
                  const datesForDay = getDatesForDay(i);
                  const isDayDisabled = datesForDay.length === 0 ||
                    (mAllowedDays && mAllowedDays.length < 7 && !mAllowedDays.includes(i));
                  const allSelected = datesForDay.length > 0 &&
                    datesForDay.every((d) => selected.includes(d));
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${style.dayOfWeekBtn} ${allSelected ? style.dayOfWeekBtnActive : ""}`}
                      disabled={!!isDayDisabled}
                      onClick={() => handleToggleDay(i)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {selected.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                {selected.map((d) => (
                  <span
                    key={d}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 8px", fontSize: "12px", borderRadius: "12px",
                      background: "var(--background-color-2)", border: "var(--border-default)",
                    }}
                  >
                    {new Date(d + "T00:00:00").toLocaleDateString("ko-KR", {
                      year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
                    })}
                    {!disabled && (
                      <button
                        type="button" className={style.removeBtn}
                        style={{ fontSize: "12px", padding: 0, lineHeight: 1 }}
                        onClick={() => handleRemoveDate(d)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {!disabled && (
              <input
                className={style.textInput}
                type="date"
                min={mv.minDate || (mHasWindow && mSelectableDates.length > 0 ? mSelectableDates[0] : "")}
                max={mv.maxDate || (mHasWindow && mSelectableDates.length > 0 ? mSelectableDates[mSelectableDates.length - 1] : "")}
                disabled={mHasWindow && mSelectableDates.length === 0}
                onChange={(e) => {
                  handleAddDate(e.target.value);
                  e.target.value = "";
                }}
              />
            )}
            {mAllowedDays && mAllowedDays.length < 7 && (
              <div style={{ fontSize: "11px", color: "var(--text-color-2)", marginTop: "2px" }}>
                {["일", "월", "화", "수", "목", "금", "토"].filter((_, i) => mAllowedDays.includes(i)).join(", ")}
                요일만 선택 가능
              </div>
            )}
            {mHasWindow && (
              <div style={{ fontSize: "11px", color: mSelectableDates.length === 0 ? "var(--status-error)" : "var(--text-color-2)", marginTop: "2px" }}>
                {mSelectableDates.length === 0
                  ? "현재 선택 가능한 날짜가 없습니다."
                  : `선택 가능: ${mSelectableDates.join(", ")}`}
              </div>
            )}
          </div>
        );
      }

      case "time":
        return (
          <input
            className={style.textInput}
            type="time"
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          />
        );

      case "select": {
        const isPreReg =
          field.duplicateCheck?.enabled &&
          field.duplicateCheck.mode === "preRegistration";
        const options = isPreReg
          ? getPreRegOptions(field)
          : field.options || [];

        return (
          <select
            className={style.selectInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            {options.map((opt, i) => {
              const isUnavailable =
                isPreReg &&
                !availableCombinations.some(
                  (c) =>
                    c.values[field._id] === opt && c.availableCount > 0
                );
              return (
                <option
                  key={i}
                  value={opt}
                  disabled={isUnavailable}
                >
                  {opt}
                  {isUnavailable ? " (마감)" : ""}
                </option>
              );
            })}
          </select>
        );
      }

      case "radio": {
        const isPreReg =
          field.duplicateCheck?.enabled &&
          field.duplicateCheck.mode === "preRegistration";
        const options = isPreReg
          ? getPreRegOptions(field)
          : field.options || [];

        return (
          <div>
            {options.map((opt, i) => {
              const isUnavailable =
                isPreReg &&
                !availableCombinations.some(
                  (c) =>
                    c.values[field._id] === opt && c.availableCount > 0
                );
              return (
                <label
                  key={i}
                  className={style.choiceOption}
                  style={isUnavailable ? { opacity: 0.5 } : undefined}
                >
                  <input
                    type="radio"
                    name={`field-${field._id}`}
                    value={opt}
                    checked={value === opt}
                    onChange={() => setValue(field._id, opt)}
                    disabled={disabled || isUnavailable}
                  />
                  {opt}
                  {isUnavailable && (
                    <span className={style.closedTag}>(마감)</span>
                  )}
                </label>
              );
            })}
          </div>
        );
      }

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

      case "multiSelect": {
        const selected: string[] = Array.isArray(value) ? value : [];
        return (
          <div>
            {field.options?.map((opt, i) => (
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
            ))}
          </div>
        );
      }

      case "rating": {
        const maxStars = field.validation?.maxStars || 5;
        const currentRating = Number(value) || 0;
        return (
          <div className={style.ratingContainer}>
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                className={`${style.ratingStar} ${
                  star <= currentRating ? style.ratingStarActive : ""
                }`}
                onClick={() => !disabled && setValue(field._id, star)}
                disabled={disabled}
                title={`${star}점`}
              >
                ★
              </button>
            ))}
            {currentRating > 0 && (
              <span className={style.ratingValue}>{currentRating}점</span>
            )}
          </div>
        );
      }

      case "scale": {
        const min = field.validation?.min ?? 1;
        const max = field.validation?.max ?? 5;
        const minLabel = field.validation?.minLabel || "";
        const maxLabel = field.validation?.maxLabel || "";
        const currentVal = value !== "" ? Number(value) : "";

        return (
          <div className={style.scaleContainer}>
            <div className={style.scaleLabels}>
              {minLabel && (
                <span className={style.scaleMinLabel}>{minLabel}</span>
              )}
              <div className={style.scaleOptions}>
                {Array.from(
                  { length: max - min + 1 },
                  (_, i) => min + i
                ).map((n) => (
                  <label key={n} className={style.scaleOption}>
                    <input
                      type="radio"
                      name={`scale-${field._id}`}
                      value={n}
                      checked={currentVal === n}
                      onChange={() => setValue(field._id, n)}
                      disabled={disabled}
                    />
                    <span
                      className={`${style.scaleNum} ${
                        currentVal === n ? style.scaleNumActive : ""
                      }`}
                    >
                      {n}
                    </span>
                  </label>
                ))}
              </div>
              {maxLabel && (
                <span className={style.scaleMaxLabel}>{maxLabel}</span>
              )}
            </div>
          </div>
        );
      }

      case "counter": {
        const maxCount = field.validation?.maxCount || 0;
        const currentCount = counterCounts[field._id] || 0;
        const isFull = maxCount > 0 && currentCount >= maxCount;
        return (
          <div className={style.counterDisplay}>
            <div className={style.counterBar}>
              <div
                className={style.counterFill}
                style={{
                  width: maxCount
                    ? `${Math.min(100, (currentCount / maxCount) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <div className={style.counterText}>
              모집 현황: {currentCount}
              {maxCount > 0 ? ` / ${maxCount}명` : "명"}
              {isFull && (
                <span className={style.counterClosedBadge}>마감</span>
              )}
            </div>
          </div>
        );
      }

      case "userSelect": {
        const selectedUser = value as
          | { user: string; userId: string; userName: string }
          | undefined;
        const searchQuery = userSearchQuery[field._id] || "";
        const results = userSearchResults[field._id] || [];

        if (disabled && selectedUser?.userName) {
          return (
            <div className={style.userSelectDisplay}>
              {selectedUser.userName} ({selectedUser.userId})
            </div>
          );
        }

        return (
          <div className={style.userSelectContainer}>
            {selectedUser?.userName ? (
              <div className={style.userSelectSelected}>
                <span>
                  {selectedUser.userName} ({selectedUser.userId})
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className={style.removeBtn}
                    onClick={() => {
                      setValue(field._id, undefined);
                      setUserSearchQuery((p) => ({
                        ...p,
                        [field._id]: "",
                      }));
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  className={style.textInput}
                  placeholder="이름 또는 아이디로 검색"
                  value={searchQuery}
                  onChange={(e) =>
                    setUserSearchQuery((p) => ({
                      ...p,
                      [field._id]: e.target.value,
                    }))
                  }
                  disabled={disabled}
                />
                {results.length > 0 && (
                  <div className={style.userSearchDropdown}>
                    {results.map((u) => (
                      <div
                        key={u._id}
                        className={style.userSearchItem}
                        onClick={() => {
                          setValue(field._id, {
                            user: u._id,
                            userId: u.userId,
                            userName: u.userName,
                          });
                          setUserSearchQuery((p) => ({
                            ...p,
                            [field._id]: "",
                          }));
                          setUserSearchResults((p) => ({
                            ...p,
                            [field._id]: [],
                          }));
                        }}
                      >
                        {u.userName} ({u.userId})
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case "approval": {
        const approvalData = value as
          | {
              approver?: { user: string; userId: string; userName: string };
              status?: string;
              reason?: string;
            }
          | undefined;

        // 제출 후: 승인 상태 표시
        if (isSubmitted && approvalData?.approver) {
          const status = approvalData.status || "pending";
          const statusLabels: Record<string, string> = {
            pending: "승인 대기",
            approved: "승인됨",
            rejected: "반려됨",
          };
          const statusStyles: Record<string, string> = {
            pending: style.badgePending,
            approved: style.badgeApproved,
            rejected: style.badgeRejected,
          };
          return (
            <div className={style.approvalStatus}>
              <div className={style.approvalApprover}>
                승인자: {approvalData.approver.userName} (
                {approvalData.approver.userId})
              </div>
              <span
                className={`${style.approvalBadge} ${statusStyles[status] || ""}`}
              >
                {statusLabels[status] || status}
              </span>
              {approvalData.reason && (
                <div className={style.approvalReason}>
                  사유: {approvalData.reason}
                </div>
              )}
            </div>
          );
        }

        // 제출 전: 승인자 선택 (보드 작성자 목록에서 검색)
        const approverQuery = userSearchQuery[field._id] || "";
        const selectedApprover = approvalData?.approver;
        const writerUsers = board.writers?.users || [];
        const approverCandidates = approverQuery.trim()
          ? writerUsers.filter(
              (u) =>
                u.userName.includes(approverQuery) ||
                u.userId.toLowerCase().includes(approverQuery.toLowerCase())
            )
          : writerUsers;

        return (
          <div className={style.userSelectContainer}>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginBottom: "4px",
              }}
            >
              승인자를 선택하세요
            </span>
            {selectedApprover?.userName ? (
              <div className={style.userSelectSelected}>
                <span>
                  {selectedApprover.userName} ({selectedApprover.userId})
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className={style.removeBtn}
                    onClick={() => setValue(field._id, undefined)}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  className={style.textInput}
                  placeholder="이름 또는 아이디로 검색"
                  value={approverQuery}
                  onChange={(e) =>
                    setUserSearchQuery((p) => ({
                      ...p,
                      [field._id]: e.target.value,
                    }))
                  }
                  disabled={disabled}
                />
                {approverCandidates.length > 0 && (
                  <div className={style.userSearchDropdown}>
                    {approverCandidates.map((u) => (
                      <div
                        key={u.user}
                        className={style.userSearchItem}
                        onClick={() => {
                          setValue(field._id, {
                            approver: {
                              user: u.user,
                              userId: u.userId,
                              userName: u.userName,
                            },
                            status: "pending",
                          });
                          setUserSearchQuery((p) => ({
                            ...p,
                            [field._id]: "",
                          }));
                        }}
                      >
                        {u.userName} ({u.userId})
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

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

      {/* 퀴즈 점수 배너 */}
      {quizScoreVisible && myRow && (
        <div className={style.quizScoreBanner}>
          <div className={style.quizScoreIcon}>📝</div>
          <div className={style.quizScoreText}>
            <strong>
              점수: {myRow.data?._quiz_score ?? 0} /{" "}
              {myRow.data?._quiz_total ?? 0}점
            </strong>
            {myRow.data?._quiz_total > 0 && (
              <span>
                (
                {Math.round(
                  ((myRow.data?._quiz_score ?? 0) /
                    myRow.data._quiz_total) *
                    100
                )}
                %)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 제출 완료 배너 */}
      {isSubmitted && !canResubmit && !quizScoreVisible && (
        <div className={style.successBanner}>
          <div className={style.successIcon}>✓</div>
          <div className={style.successText}>
            <strong>응답이 제출되었습니다.</strong>
            <span>
              {myRow?._submittedAt &&
                `제출일: ${new Date(myRow._submittedAt).toLocaleString("ko-KR", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  weekday: "short", hour: "2-digit", minute: "2-digit",
                })}`}
            </span>
          </div>
        </div>
      )}
      {/* 응답자 필드 */}
      {(!isSubmitted || canResubmit || form?.settings.showOwnResponse !== false || quizScoreVisible) &&
        respondentFields.map((field) => {
          const disabled = (isSubmitted && !canResubmit) || !canSubmit;
          const quizMark = getQuizMark(field);

          return (
            <div
              key={field._id}
              className={`${style.questionItem} ${
                quizMark === true
                  ? style.questionCorrect
                  : quizMark === false
                    ? style.questionWrong
                    : ""
              }`}
            >
              <div className={style.questionLabel}>
                <span className={style.questionLabelText}>{field.label}</span>
                {field.required && (
                  <span className={style.requiredMark}>*</span>
                )}
                {quizMark === true && (
                  <span className={style.quizMarkCorrect}>✓</span>
                )}
                {quizMark === false &&
                  form.settings.quizSettings?.showWrongMarks && (
                    <span className={style.quizMarkWrong}>✗</span>
                  )}
                {field.points != null &&
                  field.points > 0 &&
                  form.settings.quizMode && (
                    <span className={style.pointsBadge}>
                      {field.points}점
                    </span>
                  )}
              </div>
              {renderField(field, disabled)}
              {errors[field._id] && (
                <div className={style.questionError}>{errors[field._id]}</div>
              )}
              {/* 퀴즈 정답 표시 */}
              {quizAnswerVisible &&
                field.correctAnswer !== undefined &&
                field.correctAnswer !== null && (
                  <div className={style.correctAnswerHint}>
                    정답:{" "}
                    {Array.isArray(field.correctAnswer)
                      ? field.correctAnswer.join(", ")
                      : String(field.correctAnswer)}
                  </div>
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
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-color-2)",
                    marginLeft: "8px",
                  }}
                >
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
        {isSubmitted && myRow && canSubmit && !form?.settings.allowMultipleResponses && (
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
                ? form?.settings.allowMultipleResponses
                  ? "추가 제출"
                  : "수정 제출"
                : "제출"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AltFormRenderer;
