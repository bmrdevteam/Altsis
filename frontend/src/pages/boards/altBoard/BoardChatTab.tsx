import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { TBoard } from "types/board";
import { TChatMessage, TChatRoom, TChatParticipant } from "types/chat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import useRegisterAlterSnapshot from "hooks/useRegisterAlterSnapshot";
import { buildBoardChatSnapshot } from "utils/alterChatSnapshot";
import { requestChatRoomsReload } from "utils/chatRoomsReload";
import ChatMessageContent from "layout/navbar/ChatMessageContent";
import ImageLightbox from "layout/navbar/ImageLightbox";
import { ChatInputBar, chatUiStyle } from "layout/navbar/chatUi";
import Svg from "assets/svg/Svg";
import defaultProfilePic from "assets/img/default_profile.png";
import style from "./boardChat.module.scss";
import containerStyle from "./boardChatContainer.module.scss";
import MemberInvitePicker from "./MemberInvitePicker";

type BoardMember = {
  user: string;
  userId: string;
  userName: string;
  profile?: string;
};

type Props = {
  board: TBoard;
  roomId: string;
  roomName: string;
  isGeneral?: boolean;
  room?: TChatRoom | null;
  boardMembers?: BoardMember[];
  canManageMembers?: boolean;
  socket: Socket | null;
  onOpenNav?: () => void;
  onNewMessage?: () => void;
  onRoomRead?: () => void;
  onRoomUpdated?: (room: TChatRoom) => void;
  onLeftRoom?: () => void;
};

const BoardChatTab = ({
  board,
  roomId,
  roomName,
  isGeneral,
  room,
  boardMembers = [],
  canManageMembers,
  socket,
  onOpenNav,
  onNewMessage,
  onRoomRead,
  onRoomUpdated,
  onLeftRoom,
}: Props) => {
  const { currentUser } = useAuth();
  const { BoardChatAPI } = useAPIv2();
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);

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

  // Touch: show delete only for the active message
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  useRegisterAlterSnapshot({
    pageType: "board-chat",
    label: `${board.name || "보드"} · ${roomName}`,
    boardId: board._id,
    boardName: board.name,
    getChatSnapshot: (opts) =>
      buildBoardChatSnapshot({
        messages,
        roomName,
        isGeneral,
        boardName: board.name,
        dataExpand: opts?.dataExpand,
      }),
  });
  const isInitialLoadRef = useRef(true);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load messages for selected room
  useEffect(() => {
    if (!board._id || !roomId) return;

    setIsLoading(true);
    setMessages([]);
    setNewMessage("");
    setPendingFile(null);
    setTypingUsers([]);
    setHasMore(true);

    BoardChatAPI.RBoardChatMessages({
      params: { boardId: board._id, roomId },
      query: { limit: 50 },
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
  }, [board._id, roomId]);

  // Join/leave socket room
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("join_room", { roomId });

    return () => {
      socket.emit("leave_room", { roomId });
    };
  }, [socket, roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleNewMessage = (data: {
      room: string;
      message: TChatMessage;
    }) => {
      if (data.room === roomId) {
        setMessages((prev) => [...prev, data.message]);
        onNewMessage?.();
        BoardChatAPI.UBoardChatRead({
          params: { boardId: board._id, roomId },
        })
          .then(() => {
            onRoomRead?.();
            requestChatRoomsReload();
          })
          .catch(() => {});
      }
    };

    const handleTyping = (data: {
      roomId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.roomId !== roomId) return;
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

    const handleMessageDeleted = (data: {
      room: string;
      messageId: string;
    }) => {
      if (data.room === roomId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data.messageId ? { ...m, isDeleted: true } : m
          )
        );
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTyping);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTyping);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [socket, roomId, currentUser?.userId, board._id]);

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

  // Mark as read when room opens
  useEffect(() => {
    if (!board._id || !roomId) return;
    BoardChatAPI.UBoardChatRead({
      params: { boardId: board._id, roomId },
    })
      .then(() => {
        onRoomRead?.();
        requestChatRoomsReload();
      })
      .catch(() => {});
  }, [board._id, roomId]);

  // Load older messages
  const loadMoreMessages = async () => {
    if (!hasMore || messages.length === 0) return;
    const area = messagesAreaRef.current;
    const prevScrollHeight = area?.scrollHeight || 0;

    const { messages: olderMessages } = await BoardChatAPI.RBoardChatMessages({
      params: { boardId: board._id, roomId },
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
          params: { boardId: board._id, roomId },
          data: formData,
        });
        const isImage = pendingFile.type.startsWith("image/");
        const { message } = await BoardChatAPI.CBoardChatMessage({
          params: { boardId: board._id, roomId },
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
        params: { boardId: board._id, roomId },
        data: { content: text },
      });
      setMessages((prev) => [...prev, message]);
    } catch {
      setNewMessage(text); // restore on failure
    }

    setIsSending(false);

    if (socket && roomId) {
      socket.emit("typing", {
        roomId,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
        isTyping: false,
      });
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("메시지를 삭제하시겠습니까?")) return;
    try {
      await BoardChatAPI.DBoardChatMessage({
        params: { boardId: board._id, roomId, messageId },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true } : m
        )
      );
      setActiveDeleteId(null);
    } catch {
      window.alert("메시지 삭제에 실패했습니다.");
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearLongPressTimer(), []);

  const handleOwnBubblePointerDown = (messageId: string) => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setActiveDeleteId(messageId);
    }, 450);
  };

  const handleOwnBubblePointerUp = () => {
    clearLongPressTimer();
  };

  const handleOwnBubbleClick = (messageId: string) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    // Touch / no-hover: tap toggles delete affordance
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches
    ) {
      return;
    }
    setActiveDeleteId((prev) => (prev === messageId ? null : messageId));
  };

  // Typing indicator emit
  const lastTypingRef = useRef(0);
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (socket && roomId && Date.now() - lastTypingRef.current > 2000) {
      socket.emit("typing", {
        roomId,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
        isTyping: true,
      });
      lastTypingRef.current = Date.now();
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

  const participants: TChatParticipant[] = room?.participants || [];
  const participantIds = new Set(participants.map((p) => p.user));
  const addableMembers = boardMembers.filter(
    (m) => m.user !== currentUser?._id && !participantIds.has(m.user)
  );

  const handleAddMembers = async () => {
    if (!addMemberIds.length || isUpdatingMembers) return;
    setIsUpdatingMembers(true);
    try {
      const { room: updated } = await BoardChatAPI.CBoardChatRoomParticipants({
        params: { boardId: board._id, roomId },
        data: { memberIds: addMemberIds },
      });
      onRoomUpdated?.(updated);
      setAddMemberIds([]);
    } catch {
      // handled by useAPIv2
    }
    setIsUpdatingMembers(false);
  };

  const handleRemoveParticipant = async (userId: string) => {
    const isSelf = userId === currentUser?._id;
    const ok = window.confirm(
      isSelf ? "팀방에서 나가시겠습니까?" : "이 멤버를 팀방에서 제거할까요?"
    );
    if (!ok) return;
    setIsUpdatingMembers(true);
    try {
      const { room: updated } = await BoardChatAPI.DBoardChatRoomParticipant({
        params: { boardId: board._id, roomId, userId },
      });
      if (isSelf) {
        setShowMembersModal(false);
        onLeftRoom?.();
      } else {
        onRoomUpdated?.(updated);
      }
    } catch {
      // handled by useAPIv2
    }
    setIsUpdatingMembers(false);
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
      <div className={style.room_header}>
        <span className={style.room_header_title}>
          {roomName}
          {!isGeneral && (
            <span className={style.room_private_badge}>비공개</span>
          )}
        </span>
        <div className={style.room_header_actions}>
          {!isGeneral && (
            <button
              type="button"
              className={style.room_header_btn}
              onClick={() => {
                setAddMemberIds([]);
                setShowMembersModal(true);
              }}
            >
              멤버 {participants.length}
            </button>
          )}
          {onOpenNav && (
            <button
              type="button"
              className={style.nav_btn}
              onClick={onOpenNav}
              aria-label="채팅 목록"
              title="채팅 목록"
            >
              <Svg type="menu" width="18px" height="18px" />
            </button>
          )}
        </div>
      </div>

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
        onClick={() => setActiveDeleteId(null)}
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
                    } ${!groupStart ? style.consecutive : ""} ${
                      activeDeleteId === msg._id ? style.delete_visible : ""
                    }`}
                    onClick={(e) => {
                      if (isMine) e.stopPropagation();
                    }}
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
                      <div className={style.bubble_wrapper}>
                        {isMine && !msg.isDeleted && (
                          <button
                            className={style.delete_btn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg._id);
                            }}
                            title="삭제"
                          >
                            <Svg type="trash" width="14px" height="14px" />
                          </button>
                        )}
                        <div
                          className={`${style.bubble} ${
                            msg.isDeleted ? style.deleted : ""
                          } ${
                            !msg.isDeleted &&
                            (msg.messageType === "file" ||
                              msg.messageType === "image")
                              ? style.bubble_media
                              : ""
                          }`}
                          onPointerDown={() => {
                            if (isMine && !msg.isDeleted) {
                              handleOwnBubblePointerDown(msg._id);
                            }
                          }}
                          onPointerUp={handleOwnBubblePointerUp}
                          onPointerLeave={handleOwnBubblePointerUp}
                          onPointerCancel={handleOwnBubblePointerUp}
                          onClick={() => {
                            if (isMine && !msg.isDeleted) {
                              handleOwnBubbleClick(msg._id);
                            }
                          }}
                        >
                          {msg.isDeleted ? (
                            <span className={style.deleted_text}>
                              삭제된 메시지입니다
                            </span>
                          ) : (
                            <ChatMessageContent
                              message={msg}
                              onImageClick={(url) => setLightboxUrl(url)}
                              onFileDownload={handleFileDownload}
                              inBubble
                              tone={isMine ? "own" : "other"}
                            />
                          )}
                        </div>
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
        <ChatInputBar
          bare
          value={newMessage}
          onChange={handleInputChange}
          onSend={handleSend}
          onPaste={handlePaste}
          placeholder="메시지를 입력하세요..."
          disabled={isSending}
          sendDisabled={isSending || (!newMessage.trim() && !pendingFile)}
          sendActive={!!(newMessage.trim() || pendingFile)}
          sendTitle="전송"
          leftSlot={
            <button
              type="button"
              className={chatUiStyle.slotBtn}
              onClick={() => fileInputRef.current?.click()}
              title="파일 첨부"
            >
              <Svg type="paperclip" width="20px" height="20px" />
            </button>
          }
        />
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <ImageLightbox
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}

      {!isGeneral && showMembersModal && (
        <div
          className={containerStyle.modal_backdrop}
          onClick={() => !isUpdatingMembers && setShowMembersModal(false)}
        >
          <div
            className={containerStyle.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="team-room-members-title"
          >
            <h3
              id="team-room-members-title"
              className={containerStyle.modal_title}
            >
              팀방 멤버
            </h3>
            <div className={containerStyle.member_checklist}>
              {participants.map((p) => {
                const isSelf = p.user === currentUser?._id;
                const canRemove =
                  isSelf ||
                  canManageMembers ||
                  room?.creator === currentUser?._id;
                return (
                  <div key={p.user} className={containerStyle.member_row}>
                    <span>{p.userName}</span>
                    {canRemove && (
                      <button
                        type="button"
                        className={containerStyle.member_row_action}
                        disabled={isUpdatingMembers}
                        onClick={() => handleRemoveParticipant(p.user)}
                      >
                        {isSelf ? "나가기" : "제거"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {canManageMembers && addableMembers.length > 0 && (
              <div className={containerStyle.modal_label}>
                멤버 추가
                <MemberInvitePicker
                  members={addableMembers}
                  selectedIds={addMemberIds}
                  onChange={setAddMemberIds}
                />
              </div>
            )}

            <div className={containerStyle.modal_actions}>
              <button
                type="button"
                className={containerStyle.modal_btn_secondary}
                disabled={isUpdatingMembers}
                onClick={() => setShowMembersModal(false)}
              >
                닫기
              </button>
              {canManageMembers && addableMembers.length > 0 && (
                <button
                  type="button"
                  className={containerStyle.modal_btn_primary}
                  disabled={!addMemberIds.length || isUpdatingMembers}
                  onClick={handleAddMembers}
                >
                  추가
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardChatTab;
