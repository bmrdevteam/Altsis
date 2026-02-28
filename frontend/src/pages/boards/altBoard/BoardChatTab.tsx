import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { TBoard } from "types/board";
import { TChatRoom, TChatMessage } from "types/chat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import ChatMessageContent from "layout/navbar/ChatMessageContent";
import ImageLightbox from "layout/navbar/ImageLightbox";
import Svg from "assets/svg/Svg";
import style from "./boardChat.module.scss";

type Props = {
  board: TBoard;
  socket: Socket | null;
  onNewMessage?: () => void;
};

const BoardChatTab = ({ board, socket, onNewMessage }: Props) => {
  const { currentUser } = useAuth();
  const { BoardChatAPI } = useAPIv2();
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

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load room
  useEffect(() => {
    if (!board._id) return;

    setIsLoading(true);
    BoardChatAPI.RBoardChatRoom({ params: { boardId: board._id } })
      .then(({ room: loadedRoom }) => {
        setRoom(loadedRoom);
        return BoardChatAPI.RBoardChatMessages({
          params: { boardId: board._id },
          query: { limit: 50 },
        });
      })
      .then(({ messages: loadedMessages }) => {
        setMessages(loadedMessages);
        setHasMore(loadedMessages.length >= 50);
        setIsLoading(false);
        isInitialLoadRef.current = true;
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [board._id]);

  // Join/leave socket room
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit("join_room", { roomId: room._id });

    return () => {
      socket.emit("leave_room", { roomId: room._id });
    };
  }, [socket, room?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !room) return;

    const handleNewMessage = (data: {
      room: string;
      message: TChatMessage;
    }) => {
      if (data.room === room._id) {
        setMessages((prev) => [...prev, data.message]);
        onNewMessage?.();
        // Mark as read
        BoardChatAPI.UBoardChatRead({
          params: { boardId: board._id },
        }).catch(() => {});
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
        // Auto-remove typing after 3s
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
  }, [socket, room?._id, currentUser?.userId, board._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoadRef.current) {
      scrollToBottom("instant" as ScrollBehavior);
      isInitialLoadRef.current = false;
    } else {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Mark as read on mount
  useEffect(() => {
    if (room) {
      BoardChatAPI.UBoardChatRead({
        params: { boardId: board._id },
      }).catch(() => {});
    }
  }, [room?._id]);

  // Load older messages
  const loadMoreMessages = async () => {
    if (!hasMore || messages.length === 0) return;
    const area = messagesAreaRef.current;
    const prevScrollHeight = area?.scrollHeight || 0;

    const { messages: olderMessages } = await BoardChatAPI.RBoardChatMessages({
      params: { boardId: board._id },
      query: { limit: 50, before: messages[0].createdAt },
    });

    if (olderMessages.length < 50) setHasMore(false);
    setMessages((prev) => [...olderMessages, ...prev]);

    // Preserve scroll position
    requestAnimationFrame(() => {
      if (area) {
        area.scrollTop = area.scrollHeight - prevScrollHeight;
      }
    });
  };

  // Handle scroll (load more at top)
  const handleScroll = () => {
    const area = messagesAreaRef.current;
    if (area && area.scrollTop === 0 && hasMore) {
      loadMoreMessages();
    }
  };

  // Send message
  const handleSend = async () => {
    if (isSending) return;

    // File upload
    if (pendingFile) {
      setIsSending(true);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        const { attachment } = await BoardChatAPI.CBoardChatFileUpload({
          params: { boardId: board._id },
          data: formData,
        });
        const isImage = pendingFile.type.startsWith("image/");
        const { message } = await BoardChatAPI.CBoardChatMessage({
          params: { boardId: board._id },
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

    // Text message
    const text = newMessage.trim();
    if (!text) return;

    setIsSending(true);
    setNewMessage("");

    try {
      const { message } = await BoardChatAPI.CBoardChatMessage({
        params: { boardId: board._id },
        data: { content: text },
      });
      setMessages((prev) => [...prev, message]);
    } catch {
      setNewMessage(text); // restore on failure
    }

    setIsSending(false);

    // Stop typing indicator
    if (socket && room) {
      socket.emit("typing", {
        roomId: room._id,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
        isTyping: false,
      });
    }
  };

  // Typing indicator emit
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

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clipboard paste
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

  // Drag & drop
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

  // File input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  // File download
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
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
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
    // Same sender within 2 minutes → consecutive
    const diff =
      new Date(msg.createdAt).getTime() -
      new Date(prevMsg.createdAt).getTime();
    return diff > 2 * 60 * 1000;
  };

  if (isLoading) {
    return (
      <div className={style.container} style={{ height: "100%", minHeight: 0, border: "none", borderRadius: 0 }}>
        <div className={style.loading}>채팅을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div
      className={style.container}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative", height: "100%", minHeight: 0, border: "none", borderRadius: 0 }}
    >
      {isDragging && (
        <div className={style.drag_overlay}>
          <span>파일을 여기에 놓으세요</span>
        </div>
      )}

      {/* Messages */}
      <div
        className={style.messages_area}
        ref={messagesAreaRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className={style.empty_state}>
            첫 메시지를 보내보세요!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDate = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
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
                          {msg.senderProfile ? (
                            <img src={msg.senderProfile} alt="" />
                          ) : (
                            msg.senderName?.[0] || "?"
                          )}
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
            placeholder="메시지를 입력하세요..."
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

export default BoardChatTab;
