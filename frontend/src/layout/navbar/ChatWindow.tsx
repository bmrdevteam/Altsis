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
import style from "./chat.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";

type Props = {
  room: TChatRoom;
  socket?: Socket;
  onClose: () => void;
  onRoomUpdated?: (room: TChatRoom) => void;
};

const ChatWindow = ({ room: initialRoom, socket, onClose, onRoomUpdated }: Props) => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [room, setRoom] = useState<TChatRoom>(initialRoom);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCreator = room.creator === currentUser?._id;
  const canInvite = isCreator || room.settings?.allowInvites !== false;
  const canChat = isCreator || room.settings?.allowChat !== false;
  const isGroupChat = room.type === "group";

  const loadMessages = async () => {
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
    loadMessages();
  }, [room._id]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

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

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("participants_added", handleParticipantsAdded);

    return () => {
      socket.emit("leave_room", { roomId: room._id });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("participants_added", handleParticipantsAdded);
    };
  }, [socket, room._id, currentUser?.userId]);

  const loadRoomData = async () => {
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
    if (!newMessage.trim() || isSending || !canChat) return;

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
    if (socket) {
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
    if (!window.confirm("정말 채팅방을 나가시겠습니까?")) return;

    try {
      await ChatAPI.DChatRoom({ params: { roomId: room._id } });
      onClose();
    } catch (err) {
      ALERT_ERROR(err);
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

  const getRoomDisplayName = () => {
    if (room.type === "group") return room.name || "그룹 채팅";
    const otherParticipant = room.participants.find(
      (p) => p.userId !== currentUser?.userId
    );
    return otherParticipant?.userName || "알 수 없음";
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
    const participant = room.participants.find((p) => p.user === senderId);
    return participant?.profile || defaultProfilePic;
  };

  return (
    <>
      <Popup
        setState={onClose}
        title={getRoomDisplayName()}
        closeBtn
        style={{ maxWidth: "450px", width: "100%", height: "600px" }}
      >
        <div className={style.chat_window}>
          {/* Group Chat Header Actions */}
          {isGroupChat && (
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
                  <button
                    className={style.menu_button}
                    onClick={() => setShowMenu(!showMenu)}
                  >
                    <Svg type="option" width="18px" height="18px" />
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
          )}
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
        </div>
      </Popup>

      {showInvite && (
        <InviteUsers
          room={room}
          onClose={() => setShowInvite(false)}
          onInvited={handleInviteComplete}
        />
      )}

      {showSettings && (
        <RoomSettings
          room={room}
          onClose={() => setShowSettings(false)}
          onUpdated={handleSettingsUpdate}
        />
      )}
    </>
  );
};

export default ChatWindow;
