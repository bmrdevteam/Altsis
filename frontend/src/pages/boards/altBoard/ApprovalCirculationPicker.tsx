import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import style from "./altBoard.module.scss";
import { formatApproverLabel, TApprovalApprover } from "utils/approvalLine";

const LIST_MAX_HEIGHT = 320;
const LIST_GAP = 4;

export type TSearchListPlacement = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

/** viewport 좌표. 위로 열 때는 bottom을 입력칸에 붙여 짧은 목록이 동떨어지지 않게 한다. */
export function searchListPlacement(
  rect: Pick<DOMRect, "top" | "bottom" | "left" | "width">,
  viewportHeight: number,
  maxH = LIST_MAX_HEIGHT
): TSearchListPlacement {
  const left = rect.left;
  const width = rect.width;
  const topBelow = rect.bottom + LIST_GAP;
  const wouldOverflowBelow = topBelow + maxH > viewportHeight - 8;
  const spaceAbove = rect.top - 8;
  const spaceBelow = viewportHeight - rect.bottom - 8;
  if (wouldOverflowBelow && spaceAbove > spaceBelow) {
    return { left, width, bottom: viewportHeight - rect.top + LIST_GAP };
  }
  return { left, width, top: topBelow };
}

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
  const [listPos, setListPos] = useState<TSearchListPlacement>({
    left: 0,
    width: 0,
    top: 0,
  });

  useLayoutEffect(() => {
    if (!showList) return;
    const updatePos = () => {
      const el = wrapRef.current;
      if (!el) return;
      const maxH = Math.min(window.innerHeight * 0.5, LIST_MAX_HEIGHT);
      setListPos(
        searchListPlacement(el.getBoundingClientRect(), window.innerHeight, maxH)
      );
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
            top: listPos.bottom != null ? "auto" : listPos.top,
            bottom: listPos.bottom != null ? listPos.bottom : "auto",
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

type ChipProps = {
  users: TApprovalApprover[];
  onRemove?: (userId: string) => void;
};

export function CirculationUserChips({ users, onRemove }: ChipProps) {
  if (!users.length) return null;
  return (
    <div className={style.circulationChips}>
      {users.map((u) => (
        <span
          key={u.userId}
          className={`${style.circulationChip}${
            onRemove ? ` ${style.circulationChipRemovable}` : ""
          }`}
        >
          {formatApproverLabel(u)}
          {onRemove && (
            <button
              type="button"
              className={style.removeBtn}
              aria-label={`${u.userName || u.userId} 제거`}
              onClick={() => onRemove(u.userId)}
            >
              ×
            </button>
          )}
        </span>
      ))}
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
      <CirculationUserChips
        users={selected}
        onRemove={
          disabled
            ? undefined
            : (userId) =>
                onChange(selected.filter((s) => s.userId !== userId))
        }
      />
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
