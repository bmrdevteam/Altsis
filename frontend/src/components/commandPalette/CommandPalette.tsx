import { useEffect, useMemo, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import useCommandPaletteSearch, {
  clearRecentSearches,
  getRecentSearches,
  saveRecentSearch,
} from "./useCommandPaletteSearch";
import { CommandItem } from "./types";
import style from "./commandPalette.module.scss";

type Props = {
  onClose: () => void;
};

const CommandPalette = ({ onClose }: Props) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { results, flatResults, isLoading } = useCommandPaletteSearch(query);

  // Recent searches for empty state
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const showRecent = !query.trim() && recentSearches.length > 0;

  // Total navigable items (recent items + flat results)
  const navigableCount = useMemo(() => {
    if (showRecent) {
      return recentSearches.length + flatResults.length;
    }
    return flatResults.length;
  }, [showRecent, recentSearches, flatResults]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = resultsRef.current?.querySelector(
      `.${style.active}`
    ) as HTMLElement | null;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectItem = (item: CommandItem) => {
    saveRecentSearch(item);
    item.action();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = navigableCount;
    if (total === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % total);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + total) % total);
        break;
      case "Enter":
        e.preventDefault();
        if (showRecent && activeIndex < recentSearches.length) {
          // Selecting a recent search item
          const recent = recentSearches[activeIndex];
          // Find matching item in flatResults or navigate directly
          const matchingItem = flatResults.find(
            (item) => item.id === recent.path
          );
          if (matchingItem) {
            selectItem(matchingItem);
          } else {
            // Trigger search with recent label
            setQuery(recent.label);
          }
        } else {
          const idx = showRecent
            ? activeIndex - recentSearches.length
            : activeIndex;
          if (flatResults[idx]) {
            selectItem(flatResults[idx]);
          }
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Compute flat index offset for main results when recent is shown
  let flatIndex = 0;

  return (
    <div className={style.overlay} onClick={onClose}>
      <div className={style.palette} onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className={style.inputRow}>
          <Svg type="search" width="18px" height="18px" />
          <input
            ref={inputRef}
            placeholder="검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className={style.shortcutHint}>ESC</div>
        </div>

        {/* Results */}
        <div className={style.results} ref={resultsRef}>
          {/* Recent searches (empty state) */}
          {showRecent && (
            <>
              <div className={style.recentHeader}>
                <span className={style.recentLabel}>최근 검색</span>
                <span className={style.clearBtn} onClick={handleClearRecent}>
                  지우기
                </span>
              </div>
              {recentSearches.map((recent, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <div
                    key={`recent-${idx}`}
                    className={`${style.resultItem} ${isActive ? style.active : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      const matchingItem = flatResults.find(
                        (item) => item.id === recent.path
                      );
                      if (matchingItem) {
                        selectItem(matchingItem);
                      } else {
                        setQuery(recent.label);
                      }
                    }}
                  >
                    <Svg type={recent.icon || "search"} />
                    <div className={style.itemText}>
                      <span className={style.itemLabel}>{recent.label}</span>
                      {recent.description && (
                        <span className={style.itemDesc}>
                          {recent.description}
                        </span>
                      )}
                    </div>
                    <span className={style.categoryBadge}>
                      {recent.category === "page"
                        ? "페이지"
                        : recent.category === "user"
                          ? "사용자"
                          : "수업"}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Grouped results */}
          {results.map((group) => (
            <div key={group.category}>
              <div className={style.groupHeader}>{group.label}</div>
              {group.items.map((item) => {
                const currentFlatIndex = showRecent
                  ? recentSearches.length + flatIndex
                  : flatIndex;
                flatIndex++;
                const isActive = activeIndex === currentFlatIndex;

                return (
                  <div
                    key={item.id}
                    className={`${style.resultItem} ${isActive ? style.active : ""}`}
                    onMouseEnter={() => setActiveIndex(currentFlatIndex)}
                    onClick={() => selectItem(item)}
                  >
                    <Svg type={item.icon} />
                    <div className={style.itemText}>
                      <span className={style.itemLabel}>{item.label}</span>
                      {item.description && (
                        <span className={style.itemDesc}>
                          {item.description}
                        </span>
                      )}
                    </div>
                    <span className={style.categoryBadge}>{group.label}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Loading state */}
          {isLoading && <div className={style.loading}>검색 중...</div>}

          {/* Empty state */}
          {query.trim() &&
            flatResults.length === 0 &&
            !isLoading && (
              <div className={style.empty}>검색 결과가 없습니다</div>
            )}
        </div>

        {/* Footer hints */}
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
    </div>
  );
};

export default CommandPalette;
