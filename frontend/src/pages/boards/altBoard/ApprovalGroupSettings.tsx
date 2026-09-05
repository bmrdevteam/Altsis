import { useState } from "react";
import style from "./altBoard.module.scss";
import {
  TApprovalPersonGroup,
  TApprovalPersonGroupKind,
} from "types/altForm";
import { TApprovalApprover } from "utils/approvalLine";
import { MAX_APPROVAL_GROUPS, MAX_GROUP_MEMBERS } from "utils/formApprovalGroup";
import ApprovalCirculationPicker, {
  ApprovalUserSearchInput,
  CirculationUserChips,
} from "./ApprovalCirculationPicker";

type Props = {
  groups: TApprovalPersonGroup[];
  candidates: TApprovalApprover[];
  onChange: (next: TApprovalPersonGroup[]) => void;
};

const KIND_OPTIONS: { value: TApprovalPersonGroupKind; label: string }[] = [
  { value: "both", label: "결재·회람" },
  { value: "approver", label: "결재자" },
  { value: "circulation", label: "회람" },
];

const emptyMember = () => ({
  label: "",
  user: { user: "", userId: "", userName: "" },
});

const emptyGroup = (): TApprovalPersonGroup => ({
  id: crypto.randomUUID(),
  title: "새 그룹",
  kind: "both",
  members: [emptyMember()],
});

const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const kindLabel = (kind: TApprovalPersonGroupKind) =>
  KIND_OPTIONS.find((o) => o.value === kind)?.label || "그룹";

const groupSummary = (group: TApprovalPersonGroup) => {
  const people = group.members.filter((m) => m.user?.userId).length;
  if (group.kind === "circulation") {
    return `${kindLabel(group.kind)} · ${people}명`;
  }
  return `${kindLabel(group.kind)} · ${group.members.length}단계`;
};

const MI = ({ icon, size = 18 }: { icon: string; size?: number }) => (
  <span
    className="material-symbols-outlined"
    style={{ fontSize: size, lineHeight: 1 }}
  >
    {icon}
  </span>
);

const ApprovalGroupSettings = ({ groups, candidates, onChange }: Props) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [groupDrag, setGroupDrag] = useState<number | null>(null);
  const [groupOver, setGroupOver] = useState<number | null>(null);
  const [memberDrag, setMemberDrag] = useState<{
    groupId: string;
    index: number;
  } | null>(null);
  const [memberOver, setMemberOver] = useState<{
    groupId: string;
    index: number;
  } | null>(null);

  const updateGroup = (index: number, patch: Partial<TApprovalPersonGroup>) => {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  const isExpanded = (group: TApprovalPersonGroup) =>
    groups.length === 1 || expandedIds.has(group.id);

  return (
    <div className={style.settingsApprovalGroupsBlock}>
      <div className={style.settingsItemRow}>
        <div className={style.settingsItemText}>
          <span className={style.settingsLabel}>그룹</span>
          <p className={style.settingsInlineNote}>
            {groups.length === 0
              ? "아직 없습니다. 추가하면 제출자가 불러와 결재선에 넣을 수 있습니다."
              : `${groups.length}개 · 제출 화면에서 불러오면 결재선이 바뀝니다.`}
          </p>
        </div>
        <button
          type="button"
          className={style.settingsRubricsAddBtn}
          disabled={groups.length >= MAX_APPROVAL_GROUPS}
          onClick={() => {
            const created = emptyGroup();
            onChange([...groups, created]);
            setExpandedIds(new Set([created.id]));
          }}
        >
          + 그룹 추가
        </button>
      </div>

      {groups.length > 0 && (
        <div className={style.settingsApprovalGroupList}>
          {groups.map((group, gi) => {
            const expanded = isExpanded(group);
            return (
              <div
                key={group.id}
                className={`${style.settingsRubricCard}${
                  groupDrag === gi ? ` ${style.settingsRubricCardDragging}` : ""
                }${
                  groupOver === gi ? ` ${style.settingsRubricCardDragOver}` : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (groupDrag == null) return;
                  setGroupOver(gi);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (groupDrag == null) return;
                  onChange(moveItem(groups, groupDrag, gi));
                  setGroupDrag(null);
                  setGroupOver(null);
                }}
              >
                <div className={style.settingsRubricCardTop}>
                  <button
                    type="button"
                    className={style.settingsRubricDragHandle}
                    title="드래그하여 순서 변경"
                    draggable
                    onDragStart={(e) => {
                      setGroupDrag(gi);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(gi));
                    }}
                    onDragEnd={() => {
                      setGroupDrag(null);
                      setGroupOver(null);
                    }}
                  >
                    <MI icon="drag_indicator" size={18} />
                  </button>
                  {groups.length > 1 && (
                    <button
                      type="button"
                      className={style.settingsRubricCollapseBtn}
                      aria-label={expanded ? "접기" : "펼치기"}
                      onClick={() =>
                        setExpandedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.id)) next.delete(group.id);
                          else next.add(group.id);
                          return next;
                        })
                      }
                    >
                      {expanded ? "▲" : "▼"}
                    </button>
                  )}
                  <input
                    className={style.settingsRubricTitleInput}
                    value={group.title}
                    placeholder="그룹 이름"
                    aria-label="그룹 이름"
                    onChange={(e) => updateGroup(gi, { title: e.target.value })}
                    onFocus={() => {
                      if (groups.length > 1) {
                        setExpandedIds(new Set([group.id]));
                      }
                    }}
                  />
                  <span className={style.settingsRubricSummaryChip}>
                    {groupSummary(group)}
                  </span>
                  <select
                    className={style.settingsApprovalGroupKind}
                    value={group.kind}
                    aria-label="그룹 종류"
                    onChange={(e) => {
                      const kind = e.target.value as TApprovalPersonGroupKind;
                      if (kind === "circulation") {
                        const members = group.members.filter(
                          (m) => m.user?.userId
                        );
                        updateGroup(gi, {
                          kind,
                          members: members.length ? members : [emptyMember()],
                        });
                        return;
                      }
                      updateGroup(gi, { kind });
                    }}
                  >
                    {KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className={style.settingsRubricCardActions}>
                    <button
                      type="button"
                      className={style.settingsRubricGhostBtn}
                      disabled={groups.length >= MAX_APPROVAL_GROUPS}
                      onClick={() => {
                        const copied: TApprovalPersonGroup = {
                          ...group,
                          id: crypto.randomUUID(),
                          title: `${group.title || "그룹"} (복사)`,
                          members: group.members.map((m) => ({
                            ...m,
                            user: { ...m.user },
                          })),
                        };
                        const next = [...groups];
                        next.splice(gi + 1, 0, copied);
                        onChange(next);
                        setExpandedIds(new Set([copied.id]));
                      }}
                    >
                      복제
                    </button>
                    <button
                      type="button"
                      className={style.settingsRubricGhostBtn}
                      onClick={() => {
                        onChange(groups.filter((_, i) => i !== gi));
                        setExpandedIds((prev) => {
                          const next = new Set(prev);
                          next.delete(group.id);
                          return next;
                        });
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className={style.settingsRubricCardBody}>
                    {group.kind === "circulation" ? (
                      <ApprovalCirculationPicker
                        selected={group.members
                          .map((m) => m.user)
                          .filter((u) => !!u?.userId)}
                        candidates={candidates}
                        onChange={(users) =>
                          updateGroup(gi, {
                            members: users.map((user) => ({
                              label: "",
                              user,
                            })),
                          })
                        }
                      />
                    ) : (
                      <>
                        <table className={style.settingsRubricTable}>
                          <thead>
                            <tr>
                              <th className={style.settingsRubricLevelDragCell} />
                              <th className={style.settingsApprovalThStep}>
                                단계
                              </th>
                              <th className={style.settingsApprovalThLabel}>
                                이름
                              </th>
                              <th className={style.settingsApprovalThPerson}>
                                사람
                              </th>
                              <th className={style.settingsRubricThActions} />
                            </tr>
                          </thead>
                          <tbody>
                            {group.members.map((member, mi) => {
                              const dragging =
                                memberDrag?.groupId === group.id &&
                                memberDrag.index === mi;
                              const over =
                                memberOver?.groupId === group.id &&
                                memberOver.index === mi;
                              return (
                                <tr
                                  key={`${group.id}-${mi}`}
                                  className={`${
                                    dragging
                                      ? style.settingsRubricLevelDragging
                                      : ""
                                  }${
                                    over
                                      ? ` ${style.settingsRubricLevelDragOver}`
                                      : ""
                                  }`}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (memberDrag?.groupId !== group.id) return;
                                    setMemberOver({
                                      groupId: group.id,
                                      index: mi,
                                    });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (memberDrag?.groupId !== group.id) return;
                                    updateGroup(gi, {
                                      members: moveItem(
                                        group.members,
                                        memberDrag.index,
                                        mi
                                      ),
                                    });
                                    setMemberDrag(null);
                                    setMemberOver(null);
                                  }}
                                >
                                  <td className={style.settingsRubricLevelDragCell}>
                                    <button
                                      type="button"
                                      className={style.settingsRubricDragHandle}
                                      title="드래그하여 순서 변경"
                                      draggable
                                      onDragStart={(e) => {
                                        setMemberDrag({
                                          groupId: group.id,
                                          index: mi,
                                        });
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      onDragEnd={() => {
                                        setMemberDrag(null);
                                        setMemberOver(null);
                                      }}
                                    >
                                      <MI icon="drag_indicator" size={16} />
                                    </button>
                                  </td>
                                  <td className={style.settingsApprovalStepCell}>
                                    {mi + 1}차
                                  </td>
                                  <td>
                                    <input
                                      className={style.settingsRubricLevelInput}
                                      value={member.label}
                                      placeholder="단계 이름"
                                      aria-label={`${mi + 1}번째 단계 이름`}
                                      onChange={(e) => {
                                        const members = group.members.map(
                                          (m, i) =>
                                            i === mi
                                              ? { ...m, label: e.target.value }
                                              : m
                                        );
                                        updateGroup(gi, { members });
                                      }}
                                    />
                                  </td>
                                  <td className={style.settingsApprovalPersonCell}>
                                    {member.user?.userId ? (
                                      <CirculationUserChips
                                        users={[member.user]}
                                        onRemove={() => {
                                          const members = group.members.map(
                                            (m, i) =>
                                              i === mi
                                                ? {
                                                    ...m,
                                                    user: emptyMember().user,
                                                  }
                                                : m
                                          );
                                          updateGroup(gi, { members });
                                        }}
                                      />
                                    ) : (
                                      <ApprovalUserSearchInput
                                        candidates={candidates}
                                        excludeIds={group.members
                                          .map((m) => m.user.userId)
                                          .filter(Boolean)}
                                        placeholder="이름 또는 아이디로 검색"
                                        ariaLabel={`${mi + 1}번째 사람 검색`}
                                        onPick={(u) => {
                                          const members = group.members.map(
                                            (m, i) =>
                                              i === mi
                                                ? {
                                                    ...m,
                                                    user: {
                                                      user: u.user,
                                                      userId: u.userId,
                                                      userName: u.userName,
                                                    },
                                                  }
                                                : m
                                          );
                                          updateGroup(gi, { members });
                                        }}
                                      />
                                    )}
                                  </td>
                                  <td className={style.settingsRubricThActions}>
                                    <button
                                      type="button"
                                      className={style.removeBtn}
                                      title="단계 삭제"
                                      aria-label={`${mi + 1}번째 단계 삭제`}
                                      disabled={group.members.length <= 1}
                                      onClick={() =>
                                        updateGroup(gi, {
                                          members: group.members.filter(
                                            (_, i) => i !== mi
                                          ),
                                        })
                                      }
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {group.members.length < MAX_GROUP_MEMBERS && (
                          <button
                            type="button"
                            className={style.settingsRubricAddLevel}
                            onClick={() =>
                              updateGroup(gi, {
                                members: [...group.members, emptyMember()],
                              })
                            }
                          >
                            + 단계
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalGroupSettings;
