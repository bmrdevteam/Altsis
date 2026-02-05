import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import Input from "components/input/Input";
import { DEFAULT_CATEGORY_COLORS } from "components/calendarV2/calendarData";
import ColorPicker from "components/colorPicker/ColorPicker";

type Props = {
  onVisibilityChange?: () => void;
};

type TVisibility = {
  schoolCalendar: boolean;
  personalCalendar: boolean;
  enrollments: boolean;
  mentorings: boolean;
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
    memos: true,
  };
};

const saveVisibility = (v: TVisibility) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
};

const systemCategories = [
  { key: "schoolCalendar", label: "학교 캘린더", color: DEFAULT_CATEGORY_COLORS.schoolCalendar },
  { key: "personalCalendar", label: "개인 캘린더", color: DEFAULT_CATEGORY_COLORS.personalCalendar },
  { key: "enrollments", label: "수강 수업", color: DEFAULT_CATEGORY_COLORS.enrollments },
  { key: "mentorings", label: "담당 수업", color: DEFAULT_CATEGORY_COLORS.mentorings },
  { key: "memos", label: "메모", color: DEFAULT_CATEGORY_COLORS.memos },
];


const CalendarTab = (props: Props) => {
  const { currentRegistration, currentSchool } = useAuth();
  const { UserCalendarAPI } = useAPIv2();

  const [visibility, setVisibility] = useState<TVisibility>(getVisibility());
  const [userCalendars, setUserCalendars] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4285f4");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const isTeacher = currentRegistration?.role === "teacher";

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      const { userCalendars } = await UserCalendarAPI.RUserCalendars({
        query: { school: currentSchool?._id },
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

  const handleAddCalendar = async () => {
    if (!newName.trim()) return;
    try {
      await UserCalendarAPI.CUserCalendar({
        data: {
          name: newName,
          color: newColor,
          scope: "personal",
        },
      });
      setNewName("");
      setNewColor("#4285f4");
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
    if (cat.key === "mentorings" && !isTeacher) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
      {/* System calendars */}
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--accent-3)" }}>
          기본 캘린더
        </div>
        {filteredCategories.map((cat) => (
          <div
            key={cat.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 4px",
              cursor: "pointer",
            }}
            onClick={() => toggleVisibility(cat.key)}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "3px",
                backgroundColor: visibility[cat.key] !== false ? cat.color : "transparent",
                border: `2px solid ${cat.color}`,
                transition: "background-color 0.15s ease",
              }}
            />
            <span style={{ fontSize: "14px", flex: 1 }}>{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Custom calendars */}
      <div>
        <div style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "var(--accent-3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          사용자 캘린더
          <Button
            type="ghost"
            onClick={() => setIsAdding(true)}
            style={{ fontSize: "12px", padding: "2px 8px" }}
          >
            + 추가
          </Button>
        </div>

        {userCalendars.map((cal) => (
          <div key={cal._id}>
            {editingId === cal._id ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px" }}>
                <ColorPicker
                  value={editColor}
                  onChange={setEditColor}
                />
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
                    style={{ fontSize: "11px", padding: "2px 6px", color: "#ea4335" }}
                  >
                    삭제
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        {isAdding && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px", marginTop: "4px" }}>
            <ColorPicker
              value={newColor}
              onChange={setNewColor}
            />
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
              onClick={() => { setIsAdding(false); setNewName(""); }}
              style={{ fontSize: "12px", padding: "2px 8px" }}
            >
              취소
            </Button>
          </div>
        )}

        {userCalendars.length === 0 && !isAdding && (
          <div style={{ fontSize: "13px", color: "var(--accent-4)", padding: "4px" }}>
            사용자 캘린더가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarTab;
