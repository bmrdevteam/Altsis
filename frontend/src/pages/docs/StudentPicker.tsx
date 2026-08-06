import Svg from "assets/svg/Svg";
import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TRegistration } from "types/registrations";
import {
  filterStudentOptions,
  StudentOption,
  toStudentOption,
} from "./studentSearchOptions";
import style from "./StudentPicker.module.scss";

export type StudentPickerSelection = {
  rid: string;
  uid: string;
};

type RecentStudent = {
  rid: string;
  uid: string;
  label: string;
  summary: string;
  description: string;
};

type Props = {
  students: TRegistration[];
  schoolId: string;
  onSelect: (selection: StudentPickerSelection) => void;
};

const MAX_RECENT = 5;
const MAX_RESULTS = 30;

const getRecentKey = (schoolId: string) => `docsStudentPickerRecent_${schoolId}`;

const getRecentStudents = (schoolId: string): RecentStudent[] => {
  try {
    const raw = JSON.parse(
      localStorage.getItem(getRecentKey(schoolId)) || "[]"
    ) as Array<Partial<RecentStudent>>;
    return raw
      .filter((r) => r.rid && r.uid && r.label)
      .map((r) => ({
        rid: r.rid!,
        uid: r.uid!,
        label: r.label!,
        summary:
          r.summary ||
          [r.label, ...(r.description?.split(" · ").slice(0, 2) || [])]
            .filter(Boolean)
            .join(" · "),
        description: r.description || "",
      }));
  } catch {
    return [];
  }
};

const saveRecentStudent = (schoolId: string, item: RecentStudent) => {
  const recent = getRecentStudents(schoolId).filter((r) => r.rid !== item.rid);
  recent.unshift(item);
  localStorage.setItem(
    getRecentKey(schoolId),
    JSON.stringify(recent.slice(0, MAX_RECENT))
  );
};

const clearRecentStudents = (schoolId: string) => {
  localStorage.removeItem(getRecentKey(schoolId));
};

const StudentPicker = ({ students, schoolId, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<StudentOption | null>(null);
  const [recent, setRecent] = useState<RecentStudent[]>(() =>
    getRecentStudents(schoolId)
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  const options = useMemo(() => students.map(toStudentOption), [students]);

  const filtered = useMemo(
    () => filterStudentOptions(options, query, MAX_RESULTS),
    [options, query]
  );

  const showRecent = open && !query.trim() && recent.length > 0;
  const navigable: Array<StudentOption | RecentStudent> = showRecent
    ? recent
    : filtered;

  useEffect(() => {
    setRecent(getRecentStudents(schoolId));
  }, [schoolId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, showRecent, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const activeEl = resultsRef.current?.querySelector(
      `.${style.active}`
    ) as HTMLElement | null;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectOption = (item: StudentOption | RecentStudent) => {
    const option: StudentOption = {
      rid: item.rid,
      uid: item.uid,
      label: item.label,
      summary: item.summary,
      description: item.description,
      searchText: "",
    };
    setSelected(option);
    saveRecentStudent(schoolId, {
      rid: item.rid,
      uid: item.uid,
      label: item.label,
      summary: item.summary,
      description: item.description,
    });
    setRecent(getRecentStudents(schoolId));
    onSelect({ rid: item.rid, uid: item.uid });
    setOpen(false);
    setQuery("");
  };

  const openPanel = () => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing || composingRef.current) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }

    if (navigable.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % navigable.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + navigable.length) % navigable.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (navigable[activeIndex]) {
          selectOption(navigable[activeIndex]);
        }
        break;
    }
  };

  const handleClearRecent = () => {
    clearRecentStudents(schoolId);
    setRecent([]);
  };

  const triggerLabel = selected?.summary || "";

  return (
    <div className={style.container} ref={containerRef}>
      <div
        className={`${style.trigger} ${open ? style.open : ""}`}
        onClick={openPanel}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPanel();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="학생 검색"
      >
        <Svg type="search" width="16px" height="16px" />
        <span
          className={`${style.triggerText} ${!triggerLabel ? style.placeholder : ""}`}
        >
          {triggerLabel || "이름, 학년, 담임으로 검색"}
        </span>
      </div>

      {open && (
        <div className={style.panel} role="listbox">
          <div className={style.inputRow}>
            <Svg type="search" width="16px" height="16px" />
            <input
              ref={inputRef}
              placeholder="이름, 학년, 담임으로 검색..."
              value={query}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={() => {
                composingRef.current = false;
              }}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-autocomplete="list"
              aria-controls="docs-student-picker-results"
            />
            <div className={style.shortcutHint}>ESC</div>
          </div>

          <div
            className={style.results}
            ref={resultsRef}
            id="docs-student-picker-results"
          >
            {showRecent ? (
              <>
                <div className={style.recentHeader}>
                  <span className={style.recentLabel}>최근 검색</span>
                  <button
                    type="button"
                    className={style.clearBtn}
                    onClick={handleClearRecent}
                  >
                    지우기
                  </button>
                </div>
                {recent.map((item, idx) => (
                  <button
                    type="button"
                    key={`recent-${item.rid}`}
                    className={`${style.resultItem} ${activeIndex === idx ? style.active : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectOption(item)}
                  >
                    <Svg type="user" width="16px" height="16px" />
                    <div className={style.itemText}>
                      <span className={style.itemLabel}>{item.label}</span>
                      {item.description && (
                        <span className={style.itemDesc}>
                          {item.description}
                        </span>
                      )}
                    </div>
                    <span className={style.badge}>학생</span>
                  </button>
                ))}
              </>
            ) : (
              <>
                {filtered.length > 0 && (
                  <div className={style.groupHeader}>학생</div>
                )}
                {filtered.map((item, idx) => (
                  <button
                    type="button"
                    key={item.rid}
                    className={`${style.resultItem} ${activeIndex === idx ? style.active : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectOption(item)}
                  >
                    <Svg type="user" width="16px" height="16px" />
                    <div className={style.itemText}>
                      <span className={style.itemLabel}>{item.label}</span>
                      {item.description && (
                        <span className={style.itemDesc}>
                          {item.description}
                        </span>
                      )}
                    </div>
                    <span className={style.badge}>학생</span>
                  </button>
                ))}
                {query.trim() && filtered.length === 0 && (
                  <div className={style.empty}>검색 결과가 없습니다</div>
                )}
              </>
            )}
          </div>

          <div className={style.footer}>
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> 이동
            </span>
            <span>
              <kbd>Enter</kbd> 선택
            </span>
            <span>
              <kbd>ESC</kbd> 닫기
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPicker;
