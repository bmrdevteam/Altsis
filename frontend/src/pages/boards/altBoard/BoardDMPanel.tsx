import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { TChatRoom, TChatMessage } from "types/chat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import ChatMessageContent from "layout/navbar/ChatMessageContent";
import ImageLightbox from "layout/navbar/ImageLightbox";
import Svg from "assets/svg/Svg";
import defaultProfilePic from "assets/img/default_profile.png";
import style from "./boardChat.module.scss";

type Partner = {
  user: string;
  userId: string;
  userName: string;
};

type Props = {
  roomId: string | null;
  partner: Partner;
  partnerName: string;
  socket: Socket | null;
  onBack: () => void;
  onRoomCreated: (roomId: string) => void;
  onViewStudentAI?: () => void; // 교사: 상대 학생의 AI 대화 보기
};

const BoardDMPanel = ({ roomId, partner, partnerName, socket, onBack, onRoomCreated, onViewStudentAI }: Props) => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [room, setRoom] = useState<TChatRoom | null>(null);
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Typing
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; userName: string }[]
  >([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // File upload
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  // Load room + messages (only when roomId exists)
  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      setRoom(null);
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setMessages([]);
    isInitialLoadRef.current = true;

    ChatAPI.RChatRoom({ params: { roomId } })
      .then(({ room: loadedRoom }) => {
        setRoom(loadedRoom);
        return ChatAPI.RChatMessages({
          params: { roomId },
          query: { limit: 50 },
        });
      })
      .then(({ messages: loadedMessages }) => {
        setMessages(loadedMessages);
        setHasMore(loadedMessages.length >= 50);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [roomId]);

  // Join/leave socket room
  useEffect(() => {
    if (!socket || !room) return;
    socket.emit("join_room", { roomId: room._id });
    return () => {
      socket.emit("leave_room", { roomId: room._id });
    };
  }, [socket, room?._id]);

  // Socket events
  useEffect(() => {
    if (!socket || !room) return;

    const handleNewMessage = (data: {
      room: string;
      message: TChatMessage;
    }) => {
      if (data.room === room._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        ChatAPI.UChatRoomRead({ params: { roomId: room._id } }).catch(
          () => {}
        );
      }
    };

    const handleTyping = (data: {
      roomId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.roomId !== room._id) return;
      if (data.userId === currentUser?.userId) return;

      if (data.isTyping) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        });
        if (typingTimeoutRef.current[data.userId]) {
          clearTimeout(typingTimeoutRef.current[data.userId]);
        }
        typingTimeoutRef.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId)
          );
        }, 3000);
      } else {
        setTypingUsers((prev) =>
          prev.filter((u) => u.userId !== data.userId)
        );
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTyping);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTyping);
    };
  }, [socket, room?._id, currentUser?.userId]);

  // Scroll on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoadRef.current) {
      scrollToBottom("instant" as ScrollBehavior);
      isInitialLoadRef.current = false;
    } else {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Mark as read (only when room exists)
  useEffect(() => {
    if (room?._id) {
      ChatAPI.UChatRoomRead({ params: { roomId: room._id } }).catch(() => {});
    }
  }, [room?._id]);

  // Load older messages
  const loadMoreMessages = async () => {
    if (!hasMore || messages.length === 0 || !roomId) return;
    const area = messagesAreaRef.current;
    const prevScrollHeight = area?.scrollHeight || 0;

    const { messages: olderMessages } = await ChatAPI.RChatMessages({
      params: { roomId },
      query: { limit: 50, before: messages[0].createdAt },
    });

    if (olderMessages.length < 50) setHasMore(false);
    setMessages((prev) => [...olderMessages, ...prev]);

    requestAnimationFrame(() => {
      if (area) {
        area.scrollTop = area.scrollHeight - prevScrollHeight;
      }
    });
  };

  const handleScroll = () => {
    const area = messagesAreaRef.current;
    if (area && area.scrollTop === 0 && hasMore) {
      loadMoreMessages();
    }
  };

  // Ensure room exists (create on first message if needed)
  const ensureRoom = async (): Promise<TChatRoom | null> => {
    if (room) return room;

    try {
      const { room: newRoom } = await ChatAPI.CChatRoom({
        data: {
          type: "direct",
          participants: [
            {
              user: partner.user,
              userId: partner.userId,
              userName: partner.userName,
            },
          ],
        },
      });
      setRoom(newRoom);
      onRoomCreated(newRoom._id);
      return newRoom;
    } catch {
      return null;
    }
  };

  // Send message
  const handleSend = async () => {
    if (isSending) return;

    if (pendingFile) {
      setIsSending(true);
      try {
        const activeRoom = await ensureRoom();
        if (!activeRoom) {
          setIsSending(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", pendingFile);
        const { attachment } = await ChatAPI.CChatFileUpload({
          params: { roomId: activeRoom._id },
          data: formData,
        });
        const isImage = pendingFile.type.startsWith("image/");
        const { message } = await ChatAPI.CChatMessage({
          params: { roomId: activeRoom._id },
          data: {
            content: isImage ? "[이미지]" : pendingFile.name,
            messageType: isImage ? "image" : "file",
            attachment,
          },
        });
        setMessages((prev) => [...prev, message]);
        setPendingFile(null);
      } catch {
        // error handled by useAPIv2
      }
      setIsSending(false);
      return;
    }

    const text = newMessage.trim();
    if (!text) return;

    setIsSending(true);
    setNewMessage("");

    try {
      const activeRoom = await ensureRoom();
      if (!activeRoom) {
        setNewMessage(text);
        setIsSending(false);
        return;
      }
      const { message } = await ChatAPI.CChatMessage({
        params: { roomId: activeRoom._id },
        data: { content: text },
      });
      setMessages((prev) => [...prev, message]);
    } catch {
      setNewMessage(text);
    }

    setIsSending(false);

    if (socket && room) {
      socket.emit("typing", {
        roomId: room._id,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
        isTyping: false,
      });
    }
  };

  // Typing
  const lastTypingRef = useRef(0);
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (socket && room && Date.now() - lastTypingRef.current > 2000) {
      socket.emit("typing", {
        roomId: room._id,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
        isTyping: true,
      });
      lastTypingRef.current = Date.now();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setPendingFile(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setPendingFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const handleFileDownload = (message: TChatMessage) => {
    if (message.attachment?.url) {
      window.open(message.attachment.url, "_blank");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Helpers
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const isSameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  const isGroupStart = (msg: TChatMessage, prevMsg?: TChatMessage) => {
    if (!prevMsg) return true;
    if (prevMsg.sender !== msg.sender) return true;
    if (prevMsg.messageType === "system") return true;
    const diff =
      new Date(msg.createdAt).getTime() -
      new Date(prevMsg.createdAt).getTime();
    return diff > 2 * 60 * 1000;
  };

  const containerStyle: React.CSSProperties = {
    position: "relative",
    height: "100%",
    minHeight: 0,
    border: "none",
    borderRadius: 0,
  };

  if (isLoading) {
    return (
      <div className={style.container} style={containerStyle}>
        <div className={style.loading}>대화를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div
      className={style.container}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={containerStyle}
    >
      {isDragging && (
        <div className={style.drag_overlay}>
          <span>파일을 여기에 놓으세요</span>
        </div>
      )}

      {/* Header */}
      <div className={style.dm_header}>
        <button className={style.dm_back_btn} onClick={onBack}>
          ←
        </button>
        <span className={style.dm_partner_name}>{partnerName}</span>
        {onViewStudentAI && (
          <button
            className={style.dm_ai_btn}
            onClick={onViewStudentAI}
            title={`${partnerName}의 AI 대화 보기`}
          >
            AI 대화
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className={style.messages_area}
        ref={messagesAreaRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className={style.empty_state}>
            {partnerName}님과의 대화를 시작하세요!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDate =
              !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
            const groupStart = isGroupStart(msg, prevMsg);
            const isMine = msg.sender === currentUser?._id;

            return (
              <div key={msg._id}>
                {showDate && (
                  <div className={style.date_divider}>
                    <span>{formatDate(msg.createdAt)}</span>
                  </div>
                )}

                {msg.messageType === "system" ? (
                  <div className={style.system_msg}>{msg.content}</div>
                ) : (
                  <div
                    className={`${style.message_group} ${
                      isMine ? style.mine : ""
                    } ${!groupStart ? style.consecutive : ""}`}
                  >
                    {!isMine &&
                      (groupStart ? (
                        <div className={style.avatar}>
                          <img
                            src={msg.senderProfile || defaultProfilePic}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = defaultProfilePic;
                            }}
                          />
                        </div>
                      ) : (
                        <div className={style.avatar_space} />
                      ))}
                    <div className={style.message_content}>
                      {groupStart && !isMine && (
                        <div className={style.sender_name}>
                          {msg.senderName}
                        </div>
                      )}
                      <div className={style.bubble}>
                        <ChatMessageContent
                          message={msg}
                          onImageClick={(url) => setLightboxUrl(url)}
                          onFileDownload={handleFileDownload}
                        />
                      </div>
                      {groupStart && (
                        <div className={style.message_time}>
                          {formatTime(msg.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className={style.typing_indicator}>
          {typingUsers.map((u) => u.userName).join(", ")}님이 입력 중...
        </div>
      )}

      {/* File preview modal */}
      {pendingFile && (
        <div className={style.file_preview_modal}>
          {pendingFile.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(pendingFile)}
              alt="Preview"
              className={style.preview_image}
            />
          ) : (
            <div className={style.file_info}>
              <Svg type="file" width="32px" height="32px" />
              <div className={style.file_details}>
                <span className={style.file_name}>{pendingFile.name}</span>
                <span className={style.file_size}>
                  {formatFileSize(pendingFile.size)}
                </span>
              </div>
            </div>
          )}
          <div className={style.preview_actions}>
            <button
              className={style.preview_cancel_btn}
              onClick={() => setPendingFile(null)}
              disabled={isSending}
            >
              취소
            </button>
            <button
              className={style.preview_send_btn}
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? "업로드 중..." : "전송"}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={style.input_area}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.hwp,.hwpx,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.zip,.txt,.csv,.json,.md"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <div className={style.input_bar}>
          <button
            className={style.attach_btn}
            onClick={() => fileInputRef.current?.click()}
            title="파일 첨부"
          >
            <Svg type="paperclip" width="20px" height="20px" />
          </button>
          <textarea
            className={style.text_input}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`${partnerName}님에게 메시지 보내기...`}
            rows={1}
            disabled={isSending}
          />
          <button
            className={`${style.send_btn} ${
              newMessage.trim() || pendingFile ? style.active : ""
            }`}
            onClick={handleSend}
            disabled={isSending || (!newMessage.trim() && !pendingFile)}
            title="전송"
          >
            <Svg type="send" width="20px" height="20px" />
          </button>
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <ImageLightbox
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
};

export default BoardDMPanel;
