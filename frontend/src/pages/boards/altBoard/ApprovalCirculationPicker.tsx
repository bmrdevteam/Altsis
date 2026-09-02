import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import style from "./altBoard.module.scss";
import { TApprovalApprover } from "utils/approvalLine";

const LIST_MAX_HEIGHT = 320;

export function uniqueApprovalCandidates(
  ...lists: Array<
    | Array<{ user?: string; userId?: string; userName?: string }>
    | undefined
  >
): TApprovalApprover[] {
  const seen = new Set<string>();
  const out: TApprovalApprover[] = [];
  for (const list of lists) {
    for (const u of list || []) {
      if (!u?.userId || seen.has(u.userId)) continue;
      seen.add(u.userId);
      out.push({
        user: String(u.user || ""),
        userId: u.userId,
        userName: u.userName || u.userId,
      });
    }
  }
  return out;
}

export function filterApprovalCandidates(
  candidates: TApprovalApprover[],
  query: string,
  excludeIds?: Iterable<string>
): TApprovalApprover[] {
  const excluded =
    excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  const q = query.trim();
  return candidates.filter((u) => {
    if (excluded.has(u.userId)) return false;
    if (!q) return true;
    return (
      u.userName.includes(q) ||
      u.userId.toLowerCase().includes(q.toLowerCase())
    );
  });
}

type SearchInputProps = {
  candidates: TApprovalApprover[];
  excludeIds?: Iterable<string>;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  onPick: (user: TApprovalApprover) => void;
};

export function ApprovalUserSearchInput({
  candidates,
  excludeIds,
  disabled,
  placeholder = "이름 또는 아이디로 검색",
  ariaLabel = "이름 또는 아이디로 검색",
  onPick,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const excluded = useMemo(
    () => (excludeIds instanceof Set ? excludeIds : new Set(excludeIds || [])),
    [excludeIds]
  );
  const remainingCount = useMemo(
    () => candidates.filter((u) => !excluded.has(u.userId)).length,
    [candidates, excluded]
  );
  const matches = useMemo(
    () => filterApprovalCandidates(candidates, query, excluded),
    [candidates, query, excluded]
  );
  const canOpen = remainingCount > 0;
  const showList = open && canOpen;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!showList) return;
    const updatePos = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxH = Math.min(window.innerHeight * 0.5, LIST_MAX_HEIGHT);
      let top = rect.bottom + 4;
      if (top + maxH > window.innerHeight - 8 && rect.top > maxH + 8) {
        top = Math.max(8, rect.top - maxH - 4);
      }
      setListPos({ top, left: rect.left, width: rect.width });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showList]);

  const pick = (u: TApprovalApprover) => {
    onPick(u);
    setQuery("");
    setOpen(false);
  };

  const list = showList
    ? createPortal(
        <div
          className={style.userSearchDropdown}
          role="listbox"
          style={{
            top: listPos.top,
            left: listPos.left,
            width: listPos.width,
          }}
        >
          {matches.length > 0 ? (
            matches.map((u) => (
              <div
                key={u.userId}
                className={style.userSearchItem}
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
              >
                {u.userName} ({u.userId})
              </div>
            ))
          ) : (
            <div className={style.userSearchEmpty} role="status">
              검색 결과 없음
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={style.userSearchWrap} ref={wrapRef}>
      <input
        className={style.textInput}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-haspopup="listbox"
        onFocus={() => {
          if (canOpen) setOpen(true);
        }}
        onMouseDown={() => {
          if (!disabled && canOpen) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (canOpen) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {list}
    </div>
  );
}

type Props = {
  selected: TApprovalApprover[];
  candidates: TApprovalApprover[];
  disabled?: boolean;
  onChange: (next: TApprovalApprover[]) => void;
  placeholder?: string;
};

const ApprovalCirculationPicker = ({
  selected,
  candidates,
  disabled,
  onChange,
  placeholder = "이름 또는 아이디로 검색",
}: Props) => {
  const selectedIds = selected.map((u) => u.userId);

  return (
    <div className={style.userSelectContainer}>
      {selected.length > 0 && (
        <div className={style.circulationChips}>
          {selected.map((u) => (
            <span key={u.userId} className={style.circulationChip}>
              {u.userName} ({u.userId})
              {!disabled && (
                <button
                  type="button"
                  className={style.removeBtn}
                  aria-label={`${u.userName} 제거`}
                  onClick={() =>
                    onChange(selected.filter((s) => s.userId !== u.userId))
                  }
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <ApprovalUserSearchInput
          candidates={candidates}
          excludeIds={selectedIds}
          placeholder={placeholder}
          ariaLabel="회람 대상 검색"
          onPick={(u) =>
            onChange([
              ...selected,
              {
                user: u.user,
                userId: u.userId,
                userName: u.userName,
              },
            ])
          }
        />
      )}
    </div>
  );
};

export default ApprovalCirculationPicker;
