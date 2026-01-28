import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatMessage } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import InviteUsers from "./InviteUsers";
import RoomSettings from "./RoomSettings";
import NewChat from "./NewChat";
import style from "./chat.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";

const PanelIcon = ({ fill = "#212121" }: { fill?: string }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.82097 10.5L7.81949 11.3737C8.0273 11.5556 8.04836 11.8714 7.86652 12.0793C7.68468 12.2871 7.3688 12.3081 7.16098 12.1263L5.16098 10.3763C5.05247 10.2814 4.99023 10.1442 4.99023 10C4.99023 9.85583 5.05247 9.71866 5.16098 9.62372L7.16098 7.87372C7.3688 7.69188 7.68468 7.71294 7.86652 7.92075C8.04836 8.12857 8.0273 8.44445 7.81949 8.6263L6.82095 9.50001L10.5 9.50001C10.7761 9.50001 11 9.72387 11 10C11 10.2762 10.7761 10.5 10.5 10.5L6.82097 10.5ZM18 14C18 15.1046 17.1046 16 16 16L4 16C2.89543 16 2 15.1046 2 14V6C2 4.89543 2.89543 4 4 4H16C17.1046 4 18 4.89543 18 6V14ZM12 15L12 5L4 5C3.44772 5 3 5.44771 3 6L3 14C3 14.5523 3.44772 15 4 15L12 15Z" fill={fill}/>
  </svg>
);

type Props = {
  room: TChatRoom | null;
  rooms: TChatRoom[];
  socket?: Socket;
  onClose: () => void;
  onRoomSelect: (room: TChatRoom) => void;
  onRoomUpdated?: (room: TChatRoom) => void;
  onNewChatCreated: (room: TChatRoom) => void;
  mode?: "popup" | "panel";
  onModeChange?: (mode: "popup" | "panel") => void;
};

const ChatWindow = ({ room: initialRoom, rooms, socket, onClose, onRoomSelect, onRoomUpdated, onNewChatCreated, mode = "popup", onModeChange }: Props) => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [room, setRoom] = useState<TChatRoom | null>(initialRoom);
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChatList, setShowChatList] = useState(!initialRoom);
  const [showNewChat, setShowNewChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCreator = room?.creator === currentUser?._id;
  const canInvite = isCreator || room?.settings?.allowInvites !== false;
  const canChat = isCreator || room?.settings?.allowChat !== false;

  // Update room when initialRoom changes
  useEffect(() => {
    setRoom(initialRoom);
    if (initialRoom) {
      setShowChatList(false);
    }
  }, [initialRoom]);

  const loadMessages = async () => {
    if (!room) return;
    try {
      const { messages } = await ChatAPI.RChatMessages({
        params: { roomId: room._id },
      });
      setMessages(messages);
      setIsLoading(false);
      scrollToBottom();

      // Mark as read
      await ChatAPI.UChatRoomRead({ params: { roomId: room._id } });
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (room?._id) {
      setIsLoading(true);
      loadMessages();
    }
  }, [room?._id]);

  // Socket events
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit("join_room", { roomId: room._id });

    const handleNewMessage = (data: {
      room: string;
      message: TChatMessage;
    }) => {
      if (data.room === room._id) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        // Mark as read
        ChatAPI.UChatRoomRead({ params: { roomId: room._id } });
      }
    };

    const handleUserTyping = (data: {
      roomId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.roomId === room._id && data.userId !== currentUser?.userId) {
        if (data.isTyping) {
          setIsTyping({ userId: data.userId, userName: data.userName });
        } else {
          setIsTyping(null);
        }
      }
    };

    const handleParticipantsAdded = (data: {
      room: string;
      newParticipants: any[];
      addedBy: string;
    }) => {
      if (data.room === room._id) {
        // Reload room data
        loadRoomData();
      }
    };

    const handleParticipantRemoved = (data: {
      room: string;
      removedUserId: string;
      removedBy: string;
    }) => {
      if (data.room === room._id) {
        // If current user was removed, close the chat window
        if (data.removedUserId === currentUser?.userId) {
          alert("채팅방에서 내보내졌습니다.");
          onClose();
        } else {
          // Otherwise, reload room data
          loadRoomData();
        }
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("participants_added", handleParticipantsAdded);
    socket.on("participant_removed", handleParticipantRemoved);

    return () => {
      socket.emit("leave_room", { roomId: room._id });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("participants_added", handleParticipantsAdded);
      socket.off("participant_removed", handleParticipantRemoved);
    };
  }, [socket, room?._id, currentUser?.userId]);

  const loadRoomData = async () => {
    if (!room) return;
    try {
      const { room: updatedRoom } = await ChatAPI.RChatRoom({
        params: { roomId: room._id },
      });
      setRoom(updatedRoom);
      onRoomUpdated?.(updatedRoom);
    } catch (err) {
      console.error("Failed to reload room data", err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async () => {
    if (!room || !newMessage.trim() || isSending || !canChat) return;

    setIsSending(true);
    try {
      const { message } = await ChatAPI.CChatMessage({
        params: { roomId: room._id },
        data: { content: newMessage },
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      scrollToBottom();
      inputRef.current?.focus();
    } catch (err) {
      ALERT_ERROR(err);
    }
    setIsSending(false);
  };

  const handleTyping = () => {
    if (socket && room) {
      socket.emit("typing", {
        roomId: room._id,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
        isTyping: true,
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          roomId: room._id,
          userId: currentUser?.userId,
          userName: currentUser?.userName,
          isTyping: false,
        });
      }, 2000);
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || !window.confirm("정말 채팅방을 나가시겠습니까?")) return;

    try {
      await ChatAPI.DChatRoom({ params: { roomId: room._id } });
      setRoom(null);
      setShowChatList(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleRoomClick = (selectedRoom: TChatRoom) => {
    onRoomSelect(selectedRoom);
    setRoom(selectedRoom);
    setShowChatList(false);
  };

  const handleNewChatComplete = (newRoom: TChatRoom) => {
    setShowNewChat(false);
    onNewChatCreated(newRoom);
    setRoom(newRoom);
    setShowChatList(false);
  };

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

  const handleInviteComplete = () => {
    setShowInvite(false);
    loadRoomData();
  };

  const handleSettingsUpdate = (updatedRoom: TChatRoom) => {
    setRoom(updatedRoom);
    setShowSettings(false);
    onRoomUpdated?.(updatedRoom);
  };

  const getRoomDisplayName = (targetRoom?: TChatRoom | null) => {
    const r = targetRoom ?? room;
    return r?.name || "그룹 채팅";
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].createdAt).toDateString();
    const prevDate = new Date(messages[index - 1].createdAt).toDateString();
    return currentDate !== prevDate;
  };

  const getSenderProfile = (senderId: string) => {
    if (!room) return defaultProfilePic;
    const participant = room.participants.find((p) => p.user === senderId);
    return participant?.profile || defaultProfilePic;
  };

  // Chat list view
  const chatListContent = (
    <div className={style.chat_list_container}>
      <div className={style.chat_list_items}>
        {rooms.length === 0 ? (
          <div className={style.empty}>채팅방이 없습니다</div>
        ) : (
          rooms.map((r) => {
            const participant = r.participants.find(
              (p) => p.userId === currentUser?.userId
            );
            const hasUnread =
              r.lastMessage?.sentAt &&
              r.lastMessage.sender !== currentUser?._id &&
              (!participant?.lastReadAt ||
                new Date(r.lastMessage.sentAt) >
                  new Date(participant.lastReadAt));

            return (
              <div
                key={r._id}
                className={`${style.chat_list_item} ${room?._id === r._id ? style.active : ""}`}
                onClick={() => handleRoomClick(r)}
              >
                <img
                  src={defaultProfilePic}
                  alt={getRoomDisplayName(r)}
                  className={style.chat_list_avatar}
                />
                <div className={style.chat_list_info}>
                  <div className={style.chat_list_header}>
                    <span className={`${style.chat_list_name} ${hasUnread ? style.unread : ""}`}>
                      {getRoomDisplayName(r)}
                      <span className={style.participant_count}>({r.participants.length})</span>
                    </span>
                    <span className={style.chat_list_time}>
                      {formatTime(r.lastMessage?.sentAt)}
                    </span>
                  </div>
                  {r.lastMessage && (
                    <div className={style.chat_list_preview}>
                      {hasUnread && <span className={style.unread_badge}>N</span>}
                      {r.lastMessage.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className={style.chat_list_footer}>
        <Button type="ghost" onClick={() => setShowNewChat(true)} style={{ width: "100%" }}>
          새 채팅
        </Button>
      </div>
    </div>
  );

  // Chat conversation view
  const chatConversationContent = room ? (
    <>
      {/* Chat Header with Menu */}
      <div className={style.room_header}>
        <div className={style.room_header_top}>
          <div
            className={style.room_title}
            onClick={() => setShowParticipants(!showParticipants)}
          >
            {room.participants.length}명 참여 중
            <span className={`${style.expand_icon} ${showParticipants ? style.expanded : ""}`}>
              ▼
            </span>
          </div>
          <div className={style.room_actions}>
            {mode === "popup" && onModeChange && (
              <button
                className={style.menu_button}
                onClick={() => onModeChange("panel")}
                title="패널로 전환"
              >
                <PanelIcon fill="var(--accent-1, #333)" />
              </button>
            )}
            <button
              className={style.menu_button}
              onClick={() => setShowMenu(!showMenu)}
            >
              <Svg type="verticalDots" width="18px" height="18px" style={{ fill: "var(--accent-1, #333)" }} />
            </button>
            {showMenu && (
              <div className={style.menu_dropdown}>
                {canInvite && (
                  <div
                    className={style.menu_item}
                    onClick={() => {
                      setShowMenu(false);
                      setShowInvite(true);
                    }}
                  >
                    사용자 초대
                  </div>
                )}
                {isCreator && (
                  <div
                    className={style.menu_item}
                    onClick={() => {
                      setShowMenu(false);
                      setShowSettings(true);
                    }}
                  >
                    채팅방 설정
                  </div>
                )}
                {onModeChange && (
                  <div
                    className={style.menu_item}
                    onClick={() => {
                      setShowMenu(false);
                      onModeChange(mode === "popup" ? "panel" : "popup");
                    }}
                  >
                    {mode === "popup" ? "패널 사용" : "팝업 사용"}
                  </div>
                )}
                <div
                  className={`${style.menu_item} ${style.danger}`}
                  onClick={() => {
                    setShowMenu(false);
                    handleLeaveRoom();
                  }}
                >
                  채팅방 나가기
                </div>
              </div>
            )}
          </div>
        </div>
        {showParticipants && (
          <div className={style.participants_list}>
            {room.participants.map((participant) => (
              <div key={participant.userId} className={style.participant_item}>
                <img
                  src={participant.profile || defaultProfilePic}
                  alt={participant.userName}
                  className={style.participant_avatar}
                />
                <span className={style.participant_name}>
                  {participant.userName}
                </span>
                {participant.user === room.creator && (
                  <span className={style.creator_badge}>방장</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={style.messages_container}>
        {isLoading ? (
          <div className={style.loading}>메시지를 불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className={style.empty}>
            아직 메시지가 없습니다. 첫 메시지를 보내보세요!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg._id}
              className={`${style.message_wrapper} ${
                msg.sender === currentUser?._id ? style.own : ""
              }`}
            >
              {shouldShowDate(index) && (
                <div className={style.date_divider}>
                  {formatMessageDate(msg.createdAt)}
                </div>
              )}
              {msg.sender !== currentUser?._id && (
                <img
                  src={msg.senderProfile || getSenderProfile(msg.sender)}
                  alt={msg.senderName}
                  className={style.sender_avatar}
                />
              )}
              <div className={style.message}>
                {msg.sender !== currentUser?._id && (
                  <div className={style.sender}>{msg.senderName}</div>
                )}
                <div className={style.content}>{msg.content}</div>
                <div className={style.time}>
                  {formatMessageTime(msg.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className={style.typing}>{isTyping.userName}님이 입력 중...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={style.input_container}>
        {canChat ? (
          <>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onKeyUp={handleTyping}
              placeholder="메시지를 입력하세요..."
              rows={2}
            />
            <Button
              type="ghost"
              onClick={handleSend}
              disabled={isSending || !newMessage.trim()}
            >
              전송
            </Button>
          </>
        ) : (
          <div className={style.chat_disabled}>
            채팅이 비활성화되었습니다.
          </div>
        )}
      </div>
    </>
  ) : null;

  const chatContent = (
    <div className={`${style.chat_window} ${mode === "panel" ? style.panel_mode : ""}`}>
      {showChatList || !room ? chatListContent : chatConversationContent}
    </div>
  );

  const headerTitle = showChatList || !room ? "채팅" : getRoomDisplayName();

  return (
    <>
      {mode === "panel" ? (
        <div className={style.chat_panel_container}>
          <div className={style.chat_panel_header}>
            <div className={style.chat_panel_title_area}>
              <button
                className={style.chat_panel_btn}
                onClick={() => setShowChatList(!showChatList)}
                title="채팅 목록"
              >
                <Svg type="chat" width="16px" height="16px" style={{ fill: "var(--accent-1, #333)" }} />
              </button>
              <span className={style.chat_panel_title}>{headerTitle}</span>
            </div>
            <div className={style.chat_panel_actions}>
              {onModeChange && (
                <button
                  className={style.chat_panel_btn}
                  onClick={() => onModeChange("popup")}
                  title="팝업으로 전환"
                >
                  <Svg type="linkExternal" width="16px" height="16px" style={{ fill: "var(--accent-1, #333)" }} />
                </button>
              )}
              <button className={style.chat_panel_btn} onClick={onClose} title="닫기">
                <Svg type="x" width="16px" height="16px" style={{ fill: "var(--accent-1, #333)" }} />
              </button>
            </div>
          </div>
          {chatContent}
        </div>
      ) : (
        <Popup
          setState={onClose}
          closeBtn
          style={{ maxWidth: "450px", width: "100%", height: "600px" }}
          title={headerTitle}
          footer={
            room ? (
              <button
                className={style.chat_list_toggle_btn}
                onClick={() => setShowChatList(!showChatList)}
                title={showChatList ? "현재 채팅으로" : "채팅 목록"}
              >
                <Svg type="chat" width="18px" height="18px" style={{ fill: "var(--accent-1, #333)" }} />
                <span style={{ marginLeft: "6px", fontSize: "13px" }}>
                  {showChatList ? "현재 채팅으로" : "채팅 목록"}
                </span>
              </button>
            ) : undefined
          }
        >
          {chatContent}
        </Popup>
      )}

      {showInvite && room && (
        <InviteUsers
          room={room}
          onClose={() => setShowInvite(false)}
          onInvited={handleInviteComplete}
        />
      )}

      {showSettings && room && (
        <RoomSettings
          room={room}
          onClose={() => setShowSettings(false)}
          onUpdated={handleSettingsUpdate}
        />
      )}

      {showNewChat && (
        <NewChat
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleNewChatComplete}
        />
      )}
    </>
  );
};

export default ChatWindow;
