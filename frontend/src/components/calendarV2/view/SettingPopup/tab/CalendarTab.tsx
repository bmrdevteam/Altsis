import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import Input from "components/input/Input";
import { DEFAULT_CATEGORY_COLORS } from "components/calendarV2/calendarData";
import ColorPicker from "components/colorPicker/ColorPicker";

type CalendarSettings = {
  visibleDays: number[];
  referenceTime: string | null;
  categoryColors: Record<string, string>;
};

type Props = {
  onVisibilityChange?: () => void;
  onSettingsChange?: (settings: CalendarSettings) => void;
  calendarSettings?: CalendarSettings;
  isViewingOther?: boolean;
  userId?: string;
};

type TVisibility = {
  schoolCalendar: boolean;
  personalCalendar: boolean;
  enrollments: boolean;
  mentorings: boolean;
  activities: boolean;
  memos: boolean;
  [key: string]: boolean;
};

const STORAGE_KEY = "calendarVisibility";

const getVisibility = (): TVisibility => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    schoolCalendar: true,
    personalCalendar: true,
    enrollments: true,
    mentorings: true,
    activities: true,
    memos: true,
  };
};

const saveVisibility = (v: TVisibility) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
};

const systemCategories = [
  { key: "schoolCalendar", label: "학교 캘린더" },
  { key: "personalCalendar", label: "개인 캘린더" },
  { key: "enrollments", label: "수강 수업" },
  { key: "mentorings", label: "담당 수업" },
  { key: "activities", label: "교육활동" },
  { key: "memos", label: "메모" },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const CalendarTab = (props: Props) => {
  const { currentRegistration, currentSchool, currentUser } = useAuth();
  const { UserCalendarAPI, CalendarSettingAPI } = useAPIv2();

  const isTeacher = currentRegistration?.role === "teacher";
  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const [visibility, setVisibility] = useState<TVisibility>(getVisibility());
  const [userCalendars, setUserCalendars] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4285f4");
  const [newScope, setNewScope] = useState<"personal" | "school">("personal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Calendar settings
  const [visibleDays, setVisibleDays] = useState<number[]>(
    props.calendarSettings?.visibleDays ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [referenceTime, setReferenceTime] = useState<string | null>(
    props.calendarSettings?.referenceTime ?? null
  );
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    props.calendarSettings?.categoryColors ?? {}
  );

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      const { userCalendars } = await UserCalendarAPI.RUserCalendars({
        query: {
          school: currentSchool?._id,
          ...(props.userId ? { user: props.userId } : {}),
        },
      });
      setUserCalendars(userCalendars);
    } catch {}
  };

  const toggleVisibility = (key: string) => {
    const newVis = { ...visibility, [key]: !visibility[key] };
    setVisibility(newVis);
    saveVisibility(newVis);
    props.onVisibilityChange?.();
  };

  const emitSettingsChange = (updates: Partial<CalendarSettings>) => {
    const newSettings: CalendarSettings = {
      visibleDays: updates.visibleDays ?? visibleDays,
      referenceTime:
        updates.referenceTime !== undefined
          ? updates.referenceTime
          : referenceTime,
      categoryColors: updates.categoryColors ?? categoryColors,
    };
    props.onSettingsChange?.(newSettings);
  };

  const handleCategoryColorChange = async (key: string, color: string) => {
    const newColors = { ...categoryColors, [key]: color };
    setCategoryColors(newColors);
    emitSettingsChange({ categoryColors: newColors });
    try {
      await CalendarSettingAPI.UCalendarSettings({
        data: { categoryColors: { [key]: color } },
      });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleVisibleDaysChange = async (day: number) => {
    const newDays = visibleDays.includes(day)
      ? visibleDays.filter((d) => d !== day)
      : [...visibleDays, day].sort();
    if (newDays.length === 0) return; // At least 1 day required
    setVisibleDays(newDays);
    emitSettingsChange({ visibleDays: newDays });
    try {
      await CalendarSettingAPI.UCalendarSettings({
        data: { visibleDays: newDays },
      });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleReferenceTimeChange = async (time: string | null) => {
    setReferenceTime(time);
    emitSettingsChange({ referenceTime: time });
    try {
      await CalendarSettingAPI.UCalendarSettings({
        data: { referenceTime: time },
      });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleAddCalendar = async () => {
    if (!newName.trim()) return;
    try {
      await UserCalendarAPI.CUserCalendar({
        data: {
          name: newName,
          color: newColor,
          scope: newScope,
          ...(newScope === "school" ? { school: currentSchool?._id } : {}),
        },
      });
      setNewName("");
      setNewColor("#4285f4");
      setNewScope("personal");
      setIsAdding(false);
      loadCalendars();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleUpdateCalendar = async (id: string) => {
    try {
      await UserCalendarAPI.UUserCalendar({
        params: { _id: id },
        data: { name: editName, color: editColor },
      });
      setEditingId(null);
      loadCalendars();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDeleteCalendar = async (id: string) => {
    if (!window.confirm("이 캘린더를 삭제하시겠습니까?")) return;
    try {
      await UserCalendarAPI.DUserCalendar({ params: { _id: id } });
      loadCalendars();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const filteredCategories = systemCategories.filter((cat) => {
    if (cat.key === "mentorings" && !isTeacher && !props.isViewingOther) return false;
    return true;
  });

  const getEffectiveColor = (key: string) =>
    categoryColors[key] || DEFAULT_CATEGORY_COLORS[key];

  const schoolCalendars = userCalendars.filter((c) => c.scope === "school");
  const personalCalendars = userCalendars.filter((c) => c.scope === "personal");

  const renderCalendarItem = (
    cal: any,
    canManage: boolean
  ) => (
    <div key={cal._id}>
      {editingId === cal._id ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px",
          }}
        >
          <ColorPicker value={editColor} onChange={setEditColor} />
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 8px",
              fontSize: "13px",
              border: "var(--border-default)",
              borderRadius: "4px",
              outline: "none",
            }}
          />
          <Button
            type="solid"
            onClick={() => handleUpdateCalendar(cal._id)}
            style={{ fontSize: "12px", padding: "2px 8px" }}
          >
            저장
          </Button>
          <Button
            type="ghost"
            onClick={() => setEditingId(null)}
            style={{ fontSize: "12px", padding: "2px 8px" }}
          >
            취소
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 4px",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "3px",
              backgroundColor:
                visibility[`custom_${cal._id}`] !== false
                  ? cal.color
                  : "transparent",
              border: `2px solid ${cal.color}`,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onClick={() => toggleVisibility(`custom_${cal._id}`)}
          />
          <span
            style={{ fontSize: "14px", flex: 1, cursor: "pointer" }}
            onClick={() => toggleVisibility(`custom_${cal._id}`)}
          >
            {cal.name}
          </span>
          {canManage && (
            <>
              <Button
                type="ghost"
                onClick={() => {
                  setEditingId(cal._id);
                  setEditName(cal.name);
                  setEditColor(cal.color);
                }}
                style={{ fontSize: "11px", padding: "2px 6px" }}
              >
                수정
              </Button>
              {!cal.isDefault && (
                <Button
                  type="ghost"
                  onClick={() => handleDeleteCalendar(cal._id)}
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    color: "#ea4335",
                  }}
                >
                  삭제
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "8px 0",
      }}
    >
      {/* System calendars with color picker */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "var(--accent-3)",
          }}
        >
          기본 캘린더
        </div>
        {filteredCategories.map((cat) => {
          const color = getEffectiveColor(cat.key);
          return (
            <div
              key={cat.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 4px",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "3px",
                  backgroundColor:
                    visibility[cat.key] !== false ? color : "transparent",
                  border: `2px solid ${color}`,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={() => toggleVisibility(cat.key)}
              />
              <span
                style={{ fontSize: "14px", flex: 1, cursor: "pointer" }}
                onClick={() => toggleVisibility(cat.key)}
              >
                {cat.label}
              </span>
              <ColorPicker
                value={color}
                onChange={(c) => handleCategoryColorChange(cat.key, c)}
              />
            </div>
          );
        })}
      </div>

      {/* School calendars section */}
      {(schoolCalendars.length > 0 || isManager) && (
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--accent-3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            학교 캘린더
            {isManager && (
              <Button
                type="ghost"
                onClick={() => {
                  setNewScope("school");
                  setIsAdding(true);
                }}
                style={{ fontSize: "12px", padding: "2px 8px" }}
              >
                + 추가
              </Button>
            )}
          </div>
          {schoolCalendars.map((cal) => renderCalendarItem(cal, isManager))}
          {schoolCalendars.length === 0 && !isAdding && (
            <div
              style={{
                fontSize: "13px",
                color: "var(--accent-4)",
                padding: "4px",
              }}
            >
              학교 캘린더가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* Personal custom calendars */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "var(--accent-3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          사용자 캘린더
          {!props.isViewingOther && (
            <Button
              type="ghost"
              onClick={() => {
                setNewScope("personal");
                setIsAdding(true);
              }}
              style={{ fontSize: "12px", padding: "2px 8px" }}
            >
              + 추가
            </Button>
          )}
        </div>

        {personalCalendars.map((cal) => renderCalendarItem(cal, !props.isViewingOther))}

        {isAdding && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px",
              marginTop: "4px",
            }}
          >
            <ColorPicker value={newColor} onChange={setNewColor} />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="캘린더 이름"
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: "13px",
                border: "var(--border-default)",
                borderRadius: "4px",
                outline: "none",
              }}
            />
            {isManager && (
              <select
                value={newScope}
                onChange={(e) =>
                  setNewScope(e.target.value as "personal" | "school")
                }
                style={{
                  padding: "4px 8px",
                  fontSize: "13px",
                  border: "var(--border-default)",
                  borderRadius: "4px",
                  outline: "none",
                }}
              >
                <option value="personal">개인</option>
                <option value="school">학교</option>
              </select>
            )}
            <Button
              type="solid"
              onClick={handleAddCalendar}
              disabled={!newName.trim()}
              style={{ fontSize: "12px", padding: "2px 8px" }}
            >
              추가
            </Button>
            <Button
              type="ghost"
              onClick={() => {
                setIsAdding(false);
                setNewName("");
              }}
              style={{ fontSize: "12px", padding: "2px 8px" }}
            >
              취소
            </Button>
          </div>
        )}

        {personalCalendars.length === 0 && !isAdding && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--accent-4)",
              padding: "4px",
            }}
          >
            사용자 캘린더가 없습니다.
          </div>
        )}
      </div>

      {/* Visible days selector (weekly view) */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "var(--accent-3)",
          }}
        >
          주간 뷰 표시 요일
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {DAY_LABELS.map((label, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleVisibleDaysChange(idx)}
              style={{
                width: "36px",
                height: "32px",
                border: visibleDays.includes(idx)
                  ? "2px solid var(--accent-1)"
                  : "1px solid var(--accent-5)",
                borderRadius: "6px",
                backgroundColor: visibleDays.includes(idx)
                  ? "var(--accent-1)"
                  : "transparent",
                color: visibleDays.includes(idx)
                  ? "var(--background)"
                  : "var(--text-color)",
                fontSize: "13px",
                fontWeight: visibleDays.includes(idx) ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reference time setting */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "var(--accent-3)",
          }}
        >
          기준 시간
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="referenceTime"
              checked={referenceTime === null}
              onChange={() => handleReferenceTimeChange(null)}
            />
            현재 시간
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="referenceTime"
              checked={referenceTime !== null}
              onChange={() => handleReferenceTimeChange("09:00")}
            />
            고정 시간
          </label>
          {referenceTime !== null && (
            <input
              type="time"
              value={referenceTime}
              onChange={(e) => handleReferenceTimeChange(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "13px",
                border: "var(--border-default)",
                borderRadius: "4px",
                outline: "none",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarTab;
