import { TChatRoom } from "types/chat";
import Svg from "assets/svg/Svg";
import style from "./chat.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";

type Props = {
  room: TChatRoom;
  isActive: boolean;
  currentUserId: string;
  currentUserObjId: string;
  onClick: (room: TChatRoom) => void;
};

const ChatRoomListItem = ({
  room,
  isActive,
  currentUserId,
  currentUserObjId,
  onClick,
}: Props) => {
  const displayName = (() => {
    if (room.name) return room.name;
    // Show participant names instead of "그룹 채팅"
    const others = room.participants.filter((p) => p.userId !== currentUserId);
    if (others.length === 0) return "채팅";
    return others.map((p) => p.userName).join(", ");
  })();

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "어제";
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const unreadCount = room.unreadCount ?? 0;

  const renderAvatar = () => {
    if (room.type === "direct") {
      const other = room.participants.find((p) => p.userId !== currentUserId);
      return (
        <img
          src={other?.profile || defaultProfilePic}
          alt={displayName}
          className={style.chat_list_avatar}
        />
      );
    }

    const others = room.participants
      .filter((p) => p.userId !== currentUserId)
      .slice(0, 3);

    if (others.length <= 1) {
      return (
        <img
          src={others[0]?.profile || defaultProfilePic}
          alt={displayName}
          className={style.chat_list_avatar}
        />
      );
    }

    return (
      <div className={style.stacked_avatars}>
        {others.map((p, i) => (
          <img
            key={p.userId}
            src={p.profile || defaultProfilePic}
            alt={p.userName}
            className={style.stacked_avatar}
            style={{ zIndex: others.length - i }}
          />
        ))}
      </div>
    );
  };

  const renderPreview = () => {
    if (!room.lastMessage) return null;

    const prefix =
      room.type === "group" && room.lastMessage.senderName
        ? `${room.lastMessage.senderName}: `
        : "";

    return (
      <div className={style.chat_list_preview}>
        <span className={style.preview_text}>
          {prefix}
          {room.lastMessage.content}
        </span>
        {unreadCount > 0 && (
          <span className={style.unread_badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`${style.chat_list_item} ${isActive ? style.active : ""}`}
      onClick={() => onClick(room)}
    >
      {renderAvatar()}
      <div className={style.chat_list_info}>
        <div className={style.chat_list_header}>
          <span
            className={`${style.chat_list_name} ${unreadCount > 0 ? style.unread : ""}`}
          >
            {displayName}
            <span className={style.participant_count}>
              ({room.participants.length})
            </span>
          </span>
          <span className={style.chat_list_time}>
            {room.isPinned && (
              <Svg type="pin" width="12px" height="12px" style={{ fill: "var(--accent-3)" }} />
            )}
            {formatTime(room.lastMessage?.sentAt)}
          </span>
        </div>
        {renderPreview()}
      </div>
    </div>
  );
};

export default ChatRoomListItem;
