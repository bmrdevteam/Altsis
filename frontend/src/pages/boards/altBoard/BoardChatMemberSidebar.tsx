import { TBoard, TAltBoardRole } from "types/board";
import style from "./boardChatContainer.module.scss";

type Member = {
  user: string;
  userId: string;
  userName: string;
};

type Props = {
  members: Member[];
  board: TBoard;
  myRole: TAltBoardRole | null;
  chatMode: "group" | "ai" | "dm";
  aiEnabled: boolean;
  selectedAISessionId?: string;
  selectedDMUserId?: string;
  onSelectGroupChat: () => void;
  onSelectAIChat: () => void;
  onDMClick: (member: Member) => void;
};

const BoardChatMemberSidebar = ({
  members,
  board,
  myRole,
  chatMode,
  aiEnabled,
  selectedAISessionId,
  selectedDMUserId,
  onSelectGroupChat,
  onSelectAIChat,
  onDMClick,
}: Props) => {
  const getRoleLabel = (member: Member): string | null => {
    const role = board.altBoardRole?.[member.user];
    if (role === "admin") return "관리자";
    if (role === "writer") return "작성자";
    return null;
  };

  return (
    <div className={style.sidebar}>
      {/* Board Group Chat Section */}
      <div className={style.sidebar_section}>
        <div className={style.sidebar_header}>보드 채팅</div>
        <div
          className={`${style.sidebar_item} ${
            chatMode === "group" ? style.active : ""
          }`}
          onClick={onSelectGroupChat}
        >
          <div className={style.sidebar_avatar}>전</div>
          <span className={style.sidebar_name}>전체 채팅</span>
        </div>
      </div>

      {/* Members Section */}
      <div className={style.sidebar_section}>
        <div className={style.sidebar_header}>
          멤버 ({members.length})
        </div>
        {members.map((member) => {
          const roleLabel = getRoleLabel(member);
          const isDMActive =
            chatMode === "dm" && selectedDMUserId === member.user;
          return (
            <div
              key={member.user}
              className={`${style.sidebar_item} ${isDMActive ? style.active : ""}`}
              onClick={() => onDMClick(member)}
              title={`${member.userName}에게 메시지`}
            >
              <div className={style.sidebar_avatar}>
                {member.userName?.[0] || "?"}
              </div>
              <span className={style.sidebar_name}>{member.userName}</span>
              {roleLabel && (
                <span className={style.sidebar_role}>{roleLabel}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Section */}
      {aiEnabled && (
        <div className={style.sidebar_section}>
          <div className={style.sidebar_header}>AI 도우미</div>
          <div
            className={`${style.sidebar_item} ${
              chatMode === "ai" && !selectedAISessionId ? style.active : ""
            }`}
            onClick={() => onSelectAIChat()}
          >
            <div className={`${style.sidebar_avatar} ${style.sidebar_avatar_ai}`}>
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
