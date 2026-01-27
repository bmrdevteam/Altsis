import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatMessage } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import style from "./chat.module.scss";

type Props = {
  room: TChatRoom;
  socket?: Socket;
  onClose: () => void;
};

const ChatWindow = ({ room, socket, onClose }: Props) => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.emit("leave_room", { roomId: room._id });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
    };
  }, [socket, room._id, currentUser?.userId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

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

  return (
    <Popup
      setState={onClose}
      title={getRoomDisplayName()}
      closeBtn
      style={{ maxWidth: "450px", width: "100%", height: "600px" }}
    >
      <div className={style.chat_window}>
        <div className={style.messages_container}>
          {isLoading ? (
            <div className={style.loading}>메시지를 불러오는 중...</div>
          ) : messages.length === 0 ? (
            <div className={style.empty}>
              아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg._id}>
                {shouldShowDate(index) && (
                  <div className={style.date_divider}>
                    {formatMessageDate(msg.createdAt)}
                  </div>
                )}
                <div
                  className={`${style.message} ${
                    msg.sender === currentUser?._id ? style.own : ""
                  }`}
                >
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
        </div>
      </div>
    </Popup>
  );
};

export default ChatWindow;
