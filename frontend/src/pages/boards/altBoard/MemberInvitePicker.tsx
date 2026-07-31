import { useMemo, useState } from "react";
import style from "./boardChatContainer.module.scss";

type Member = {
  user: string;
  userId: string;
  userName: string;
  profile?: string;
};

type Props = {
  members: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
};

const MemberInvitePicker = ({
  members,
  selectedIds,
  onChange,
  emptyText = "초대할 다른 멤버가 없습니다.",
}: Props) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.userName.toLowerCase().includes(q) ||
        m.userId.toLowerCase().includes(q)
    );
  }, [members, query]);

  const filteredIds = filtered.map((m) => m.user);
  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedIds.includes(id));

  const toggleOne = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const remove = new Set(filteredIds);
      onChange(selectedIds.filter((id) => !remove.has(id)));
    } else {
      const next = new Set(selectedIds);
      filteredIds.forEach((id) => next.add(id));
      onChange(Array.from(next));
    }
  };

  if (members.length === 0) {
    return (
      <div className={style.member_checklist}>
        <div className={style.member_checklist_empty}>{emptyText}</div>
      </div>
    );
  }

  return (
    <div className={style.member_picker}>
      <input
        className={style.member_search}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 검색"
        aria-label="멤버 검색"
      />
      <div className={style.member_picker_toolbar}>
        <label className={style.member_check_item}>
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAllFiltered}
            disabled={filtered.length === 0}
          />
          <span>
            {query.trim()
              ? `검색 결과 전체 선택 (${filtered.length})`
              : `전체 선택 (${members.length})`}
          </span>
        </label>
        <span className={style.member_selected_count}>
          {selectedIds.length}명 선택
        </span>
      </div>
      <div className={style.member_checklist}>
        {filtered.length === 0 ? (
          <div className={style.member_checklist_empty}>
            검색 결과가 없습니다.
          </div>
        ) : (
          filtered.map((member) => (
            <label key={member.user} className={style.member_check_item}>
              <input
                type="checkbox"
                checked={selectedIds.includes(member.user)}
                onChange={() => toggleOne(member.user)}
              />
              <span>{member.userName}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export default MemberInvitePicker;
