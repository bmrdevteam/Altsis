import { TChatRoom } from "types/chat";
import Svg from "assets/svg/Svg";
import { ChatListRow } from "./chatUi";
import style from "./chat.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";

type Props = {
  room: TChatRoom;
  isActive: boolean;
  currentUserId: string;
  currentUserObjId: string;
  isArchived?: boolean;
  onClick: (room: TChatRoom) => void;
  onPin?: (room: TChatRoom) => void;
  onShowStorage?: (room: TChatRoom) => void;
  onArchive?: (room: TChatRoom) => void;
  onLeave?: (room: TChatRoom) => void;
};

const ChatRoomListItem = ({
  room,
  isActive,
  currentUserId,
  isArchived = false,
  onClick,
  onPin,
  onShowStorage,
  onArchive,
  onLeave,
}: Props) => {
  const displayName = (() => {
    if (room.name) return room.name;
    const others = room.participants.filter((p) => p.userId !== currentUserId);
    if (others.length === 0) return "채팅";
    return others.map((p) => p.userName || p.userId).join(", ");
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
    }
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
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
            alt={p.userName || p.userId}
            className={style.stacked_avatar}
            style={{ zIndex: others.length - i }}
          />
        ))}
      </div>
    );
  };

  const preview = room.lastMessage ? (
    <div className={style.chat_list_preview}>
      <span className={style.preview_text}>
        {room.type === "group" && room.lastMessage.senderName
          ? `${room.lastMessage.senderName}: `
          : ""}
        {room.lastMessage.content}
      </span>
      {unreadCount > 0 && (
        <span className={style.unread_badge}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  ) : undefined;

  return (
    <ChatListRow
      title={displayName}
      count={room.participants.length}
      time={
        <>
          {room.isPinned && (
            <Svg
              type="pin"
              width="12px"
              height="12px"
              style={{ fill: "var(--accent-3)", marginRight: 4 }}
            />
          )}
          {formatTime(room.lastMessage?.sentAt)}
        </>
      }
      preview={preview}
      leading={renderAvatar()}
      active={isActive}
      onClick={() => onClick(room)}
      menuItems={[
        ...(!isArchived
          ? [
              {
                key: "pin",
                label: room.isPinned ? "고정 해제" : "고정",
                icon: (
                  <Svg
                    type={room.isPinned ? "pinOff" : "pin"}
                    width="16px"
                    height="16px"
                  />
                ),
                onClick: () => onPin?.(room),
              },
            ]
          : []),
        {
          key: "files",
          label: "내 파일",
          icon: <Svg type="file" width="16px" height="16px" />,
          onClick: () => onShowStorage?.(room),
        },
        {
          key: "archive",
          label: isArchived ? "보관 해제" : "보관",
          icon: (
            <Svg
              type={isArchived ? "unarchive" : "archive"}
              width="16px"
              height="16px"
              style={{ fill: "var(--accent-2)" }}
            />
          ),
          onClick: () => onArchive?.(room),
        },
        {
          key: "leave",
          label: "채팅방 나가기",
          danger: true,
          icon: <Svg type="logout" width="16px" height="16px" />,
          onClick: () => onLeave?.(room),
        },
      ]}
    />
  );
};

export default ChatRoomListItem;
