import { useState } from "react";
import style from "./altBoard.module.scss";
import { TApprovalApprover } from "utils/approvalLine";

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
  const [query, setQuery] = useState("");
  const selectedIds = new Set(selected.map((u) => u.userId));
  const q = query.trim();
  const matches = q
    ? candidates.filter(
        (u) =>
          !selectedIds.has(u.userId) &&
          (u.userName.includes(q) ||
            u.userId.toLowerCase().includes(q.toLowerCase()))
      )
    : [];

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
        <>
          <input
            className={style.textInput}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="회람 대상 검색"
          />
          {matches.length > 0 && (
            <div className={style.userSearchDropdown} role="listbox">
              {matches.map((u) => (
                <div
                  key={u.userId}
                  className={style.userSearchItem}
                  role="option"
                  onClick={() => {
                    onChange([
                      ...selected,
                      {
                        user: u.user,
                        userId: u.userId,
                        userName: u.userName,
                      },
                    ]);
                    setQuery("");
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
};

export default ApprovalCirculationPicker;
