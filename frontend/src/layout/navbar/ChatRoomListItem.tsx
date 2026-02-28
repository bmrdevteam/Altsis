import { useState, useRef, useEffect } from "react";
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
  onPin?: (room: TChatRoom) => void;
  onArchive?: (room: TChatRoom) => void;
  onLeave?: (room: TChatRoom) => void;
  onSettings?: (room: TChatRoom) => void;
  onStorage?: (room: TChatRoom) => void;
};

const ChatRoomListItem = ({
  room,
  isActive,
  currentUserId,
  currentUserObjId,
  onClick,
  onPin,
  onArchive,
  onLeave,
  onSettings,
  onStorage,
}: Props) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

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

  const hasMenuActions = onPin || onArchive || onLeave || onSettings || onStorage;

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
      {hasMenuActions && room._id && (
        <div
          className={style.list_item_menu}
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={style.list_item_menu_button}
            onClick={() => setShowMenu(!showMenu)}
          >
            <Svg type="verticalDots" width="16px" height="16px" style={{ fill: "var(--accent-3)" }} />
          </button>
          {showMenu && (
            <div className={style.list_item_menu_dropdown}>
              {onPin && (
                <div
                  className={style.menu_item}
                  onClick={() => {
                    setShowMenu(false);
                    onPin(room);
                  }}
                >
                  <Svg type={room.isPinned ? "pinOff" : "pin"} width="16px" height="16px" />
                  <span>{room.isPinned ? "고정 해제" : "고정"}</span>
                </div>
              )}
              {onStorage && (
                <div
                  className={style.menu_item}
                  onClick={() => {
                    setShowMenu(false);
                    onStorage(room);
                  }}
                >
                  <Svg type="file" width="16px" height="16px" />
                  <span>내 파일</span>
                </div>
              )}
              {onArchive && (
                <div
                  className={style.menu_item}
                  onClick={() => {
                    setShowMenu(false);
                    onArchive(room);
                  }}
                >
                  <Svg type="archive" width="16px" height="16px" />
                  <span>{room.isArchived ? "보관 해제" : "보관"}</span>
                </div>
              )}
              {onSettings && (
                <div
                  className={style.menu_item}
                  onClick={() => {
                    setShowMenu(false);
                    onSettings(room);
                  }}
                >
                  <Svg type="settings" width="16px" height="16px" />
                  <span>설정</span>
                </div>
              )}
              {onLeave && (
                <div
                  className={`${style.menu_item} ${style.danger}`}
                  onClick={() => {
                    setShowMenu(false);
                    onLeave(room);
                  }}
                >
                  <Svg type="logout" width="16px" height="16px" />
                  <span>채팅방 나가기</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatRoomListItem;
