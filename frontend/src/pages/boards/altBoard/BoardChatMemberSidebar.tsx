import { useEffect, useState } from "react";
import { TBoard } from "types/board";
import { TChatRoom } from "types/chat";
import defaultProfilePic from "assets/img/default_profile.png";
import style from "./boardChatContainer.module.scss";

type Member = {
  user: string;
  userId: string;
  userName: string;
  profile?: string;
};

type Props = {
  members: Member[];
  board: TBoard;
  rooms: TChatRoom[];
  selectedRoomId?: string | null;
  chatMode: "group" | "ai" | "dm";
  aiEnabled: boolean;
  selectedAISessionId?: string;
  selectedDMUserId?: string;
  canManageRooms: boolean;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onSelectAIChat: () => void;
  onDMClick: (member: Member) => void;
};

const membersCollapsedKey = (boardId: string) =>
  `altBoardChat.membersCollapsed.${boardId}`;

const BoardChatMemberSidebar = ({
  members,
  board,
  rooms,
  selectedRoomId,
  chatMode,
  aiEnabled,
  selectedAISessionId,
  selectedDMUserId,
  canManageRooms,
  onSelectRoom,
  onCreateRoom,
  onSelectAIChat,
  onDMClick,
}: Props) => {
  const [membersCollapsed, setMembersCollapsed] = useState(true);

  useEffect(() => {
    if (!board._id) return;
    try {
      const saved = localStorage.getItem(membersCollapsedKey(board._id));
      if (saved === null) {
        setMembersCollapsed(true);
      } else {
        setMembersCollapsed(saved === "1");
      }
    } catch {
      setMembersCollapsed(true);
    }
  }, [board._id]);

  const toggleMembersCollapsed = () => {
    setMembersCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          membersCollapsedKey(board._id),
          next ? "1" : "0"
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const getRoleLabel = (member: Member): string | null => {
    const role = board.altBoardRole?.[member.user];
    if (role === "admin") return "관리자";
    if (role === "writer") return "작성자";
    return null;
  };

  const generalRoom = rooms.find((r) => r.isGeneral);
  const teamRooms = rooms.filter((r) => !r.isGeneral);

  return (
    <div className={style.sidebar}>
      <div className={style.sidebar_section}>
        <div className={style.sidebar_header_row}>
          <div className={style.sidebar_header}>보드 채팅</div>
          {canManageRooms && (
            <button
              type="button"
              className={style.sidebar_add_btn}
              onClick={onCreateRoom}
              title="팀방 만들기"
              aria-label="팀방 만들기"
            >
              +
            </button>
          )}
        </div>

        {generalRoom && (
          <div
            className={`${style.sidebar_item} ${
              chatMode === "group" && selectedRoomId === generalRoom._id
                ? style.active
                : ""
            }`}
            onClick={() => onSelectRoom(generalRoom._id)}
          >
            <div className={style.sidebar_avatar}>전</div>
            <span className={style.sidebar_name}>전체 채팅</span>
            {(generalRoom.unreadCount ?? 0) > 0 && (
              <span className={style.sidebar_unread}>
                {generalRoom.unreadCount}
              </span>
            )}
          </div>
        )}

        {teamRooms.length > 0 && (
          <div className={style.sidebar_subheader}>팀방</div>
        )}

        {teamRooms.map((room) => (
          <div
            key={room._id}
            className={`${style.sidebar_item} ${
              chatMode === "group" && selectedRoomId === room._id
                ? style.active
                : ""
            }`}
            onClick={() => onSelectRoom(room._id)}
            title={room.description || room.name}
          >
            <div
              className={`${style.sidebar_avatar} ${style.sidebar_avatar_topic}`}
              aria-label="비공개"
            >
              잠
            </div>
            <span className={style.sidebar_name}>{room.name || "팀방"}</span>
            {(room.unreadCount ?? 0) > 0 && (
              <span className={style.sidebar_unread}>{room.unreadCount}</span>
            )}
          </div>
        ))}
      </div>

      <div className={style.sidebar_section}>
        <button
          type="button"
          className={style.sidebar_header_toggle}
          onClick={toggleMembersCollapsed}
          aria-expanded={!membersCollapsed}
        >
          <span>
            멤버 ({members.length})
          </span>
          <span className={style.sidebar_chevron}>
            {membersCollapsed ? "▸" : "▾"}
          </span>
        </button>
        {!membersCollapsed &&
          members.map((member) => {
            const roleLabel = getRoleLabel(member);
            const isDMActive =
              chatMode === "dm" && selectedDMUserId === member.user;
            return (
              <div
                key={member.user}
                className={`${style.sidebar_item} ${
                  isDMActive ? style.active : ""
                }`}
                onClick={() => onDMClick(member)}
                title={`${member.userName}에게 메시지`}
              >
                <div className={style.sidebar_avatar}>
                  <img
                    src={member.profile || defaultProfilePic}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultProfilePic;
                    }}
                  />
                </div>
                <span className={style.sidebar_name}>{member.userName}</span>
                {roleLabel && (
                  <span className={style.sidebar_role}>{roleLabel}</span>
                )}
              </div>
            );
          })}
      </div>

      {aiEnabled && (
        <div className={style.sidebar_section}>
          <div className={style.sidebar_header}>AI 도우미</div>
          <div
            className={`${style.sidebar_item} ${
              chatMode === "ai" && !selectedAISessionId ? style.active : ""
            }`}
            onClick={() => onSelectAIChat()}
          >
            <div
              className={`${style.sidebar_avatar} ${style.sidebar_avatar_ai}`}
            >
              A
            </div>
            <span className={style.sidebar_name}>Alter</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardChatMemberSidebar;
