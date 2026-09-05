import { useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import { formatApproverLabel, TApprovalApprover } from "utils/approvalLine";
import type { TBoard, TMemberUser } from "types/board";

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

const boardCreator = (board: TBoard): TMemberUser[] =>
  board.creator && board.creatorId
    ? [
        {
          user: board.creator,
          userId: board.creatorId,
          userName: board.creatorName || board.creatorId,
        },
      ]
    : [];

export function approvalCandidatesForBoard(
  board: TBoard,
  resolvedMembers: TMemberUser[] = []
): TApprovalApprover[] {
  const explicitWriterIds = new Set(
    (board.writers?.users || []).map((user) => user.userId)
  );
  const derived = resolvedMembers.filter((member) => {
    const boardRole = board.altBoardRole?.[String(member.user)];
    if (boardRole === "admin" || boardRole === "writer") return true;
    if (explicitWriterIds.has(member.userId)) return true;
    if (String(member.user) === String(board.creator)) return true;
    if (member.auth === "admin" || member.auth === "manager") return true;
    return Boolean(member.role && board.writers?.groups?.[member.role]);
  });
  return uniqueApprovalCandidates(
    board.approvalCandidates,
    derived,
    board.writers?.users,
    boardCreator(board)
  );
}

export function circulationCandidatesForBoard(
  board: TBoard,
  resolvedMembers: TMemberUser[] = []
): TApprovalApprover[] {
  return uniqueApprovalCandidates(
    board.circulationCandidates,
    resolvedMembers,
    board.members?.users,
    board.writers?.users,
    boardCreator(board)
  );
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

  const pick = (u: TApprovalApprover) => {
    onPick(u);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className={style.userSearchWrap}>
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
      {showList && (
        <div
          className={style.userSearchDropdown}
          data-user-search-dropdown
          role="listbox"
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
        </div>
      )}
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
