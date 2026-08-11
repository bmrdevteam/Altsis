import { useEffect, useRef, useState, DragEvent, ClipboardEvent } from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatMessage } from "types/chat";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import NewChat from "./NewChat";
import ChatMessageContent from "./ChatMessageContent";
import ImageLightbox from "./ImageLightbox";
import ChatFileStorage from "./ChatFileStorage";
import ChatRoomListItem from "./ChatRoomListItem";
import {
  ChatPanelShell,
  ChatPanelHeader,
  ChatEmptyState,
  ChatInputBar,
  ChatMessageBubble,
  chatUiStyle,
} from "./chatUi";
import style from "./chat.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

type Props = {
  room: TChatRoom | null;
  rooms: TChatRoom[];
  archivedRooms?: TChatRoom[];
  socket?: Socket;
  onClose: () => void;
  onRoomSelect: (room: TChatRoom | null) => void;
  onRoomUpdated?: (room: TChatRoom) => void;
  onNewChatCreated: (room: TChatRoom) => void;
  onRoomLeft: () => void;
};

const ChatWindow = ({ room: initialRoom, rooms, archivedRooms = [], socket, onClose, onRoomSelect, onRoomUpdated, onNewChatCreated, onRoomLeft }: Props) => {
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
  const [showChatList, setShowChatList] = useState(!initialRoom);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // File upload states
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    file: File;
    preview: string;
    type: "image" | "file";
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canChat = true;

  // Close menu on outside click
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

  // Update room when initialRoom changes
  useEffect(() => {
    setRoom(initialRoom);
    if (initialRoom) {
      setShowChatList(false);
    } else {
      setShowChatList(true);
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

      // Mark as read and notify parent to refresh unread counts
      await ChatAPI.UChatRoomRead({ params: { roomId: room._id } });
      if (room.unreadCount && room.unreadCount > 0) {
        onRoomUpdated?.({ ...room, unreadCount: 0 });
      }
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

  // Scroll to bottom after messages render (isLoading → false)
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [isLoading]);

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

    const handleMessageDeleted = (data: {
      room: string;
      messageId: string;
    }) => {
      if (data.room === room._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data.messageId ? { ...m, isDeleted: true } : m
          )
        );
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.emit("leave_room", { roomId: room._id });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [socket, room?._id, currentUser?.userId]);

  const scrollToBottom = (instant?: boolean) => {
    setTimeout(() => {
      if (instant) {
        messagesEndRef.current?.scrollIntoView(false);
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
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

  // File handling functions
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelect(file);
          break;
        }
      }
    }
  };

  const handleFileSelect = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const maxSize = isImage ? 10 * 1024 * 1024 : 20 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(`파일 크기는 ${isImage ? "10MB" : "20MB"}를 초과할 수 없습니다.`);
      return;
    }

    const preview = isImage ? URL.createObjectURL(file) : "";
    setPreviewFile({
      file,
      preview,
      type: isImage ? "image" : "file",
    });
  };

  const handleFileUpload = async () => {
    if (!previewFile || !room || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", previewFile.file);

      const { attachment } = await ChatAPI.CChatFileUpload({
        params: { roomId: room._id },
        data: formData,
      });

      const { message } = await ChatAPI.CChatMessage({
        params: { roomId: room._id },
        data: {
          content: previewFile.file.name,
          messageType: previewFile.type,
          attachment,
        },
      });

      setMessages((prev) => [...prev, message]);
      setPreviewFile(null);
      scrollToBottom();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelFilePreview = () => {
    if (previewFile?.preview) {
      URL.revokeObjectURL(previewFile.preview);
    }
    setPreviewFile(null);
  };

  const handleFileDownload = async (msg: TChatMessage) => {
    if (!msg.attachment?.url) return;
    window.open(msg.attachment.url, "_blank");
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!room) return;
    if (!window.confirm("메시지를 삭제하시겠습니까?")) return;
    try {
      await ChatAPI.DChatMessage({
        params: { roomId: room._id, messageId },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true } : m
        )
      );
    } catch {}
  };

  const handleLeaveRoom = async () => {
    if (!room || !window.confirm("정말 채팅방을 나가시겠습니까?")) return;

    try {
      await ChatAPI.DChatRoom({ params: { roomId: room._id } });
      onRoomLeft();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handlePinRoom = async () => {
    if (!room) return;
    try {
      const { isPinned } = await ChatAPI.UChatRoomPin({
        params: { roomId: room._id },
      });
      setRoom({ ...room, isPinned });
      onRoomUpdated?.({ ...room, isPinned });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleArchiveRoom = async () => {
    if (!room) return;
    try {
      await ChatAPI.UChatRoomArchive({
        params: { roomId: room._id },
      });
      // After archiving, go back to list
      setRoom(null);
      setShowChatList(true);
      onRoomLeft();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleRoomClick = (selectedRoom: TChatRoom) => {
    onRoomSelect(selectedRoom);
    setRoom(selectedRoom);
    setShowChatList(false);
  };

  const handleListPinRoom = async (targetRoom: TChatRoom) => {
    try {
      const { isPinned } = await ChatAPI.UChatRoomPin({
        params: { roomId: targetRoom._id },
      });
      onRoomUpdated?.({ ...targetRoom, isPinned });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleListShowStorage = (targetRoom: TChatRoom) => {
    onRoomSelect(targetRoom);
    setRoom(targetRoom);
    setShowChatList(false);
    setShowStorage(true);
  };

  const handleListArchiveRoom = async (targetRoom: TChatRoom) => {
    try {
      await ChatAPI.UChatRoomArchive({
        params: { roomId: targetRoom._id },
      });
      onRoomLeft();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleListLeaveRoom = async (targetRoom: TChatRoom) => {
    if (!window.confirm("정말 채팅방을 나가시겠습니까?")) return;
    try {
      await ChatAPI.DChatRoom({ params: { roomId: targetRoom._id } });
      onRoomLeft();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleNewChatComplete = (newRoom: TChatRoom) => {
    setShowNewChat(false);
    onNewChatCreated(newRoom);
    setRoom(newRoom);
    setShowChatList(false);
  };

  const getRoomDisplayName = (targetRoom?: TChatRoom | null) => {
    const r = targetRoom ?? room;
    if (r?.type === "direct") {
      const other = r.participants.find(
        (p) => p.user !== currentUser?._id
      );
      return other?.userName || r?.name || "채팅";
    }
    return r?.name || "채팅";
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

  // Message grouping: determines if this message starts a new sender group
  const isGroupStart = (index: number) => {
    if (index === 0) return true;
    if (shouldShowDate(index)) return true;
    const current = messages[index];
    const prev = messages[index - 1];
    if (current.sender !== prev.sender) return true;
    // Break group if more than 2 minutes apart
    const timeDiff = new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime();
    if (timeDiff > 2 * 60 * 1000) return true;
    return false;
  };

  const getSenderProfile = (senderId: string) => {
    if (!room) return defaultProfilePic;
    const participant = room.participants.find((p) => p.user === senderId);
    return participant?.profile || defaultProfilePic;
  };

  // Chat list view
  const chatListContent = (
    <div className={chatUiStyle.listShell}>
      <div className={chatUiStyle.listItems}>
        {rooms.length === 0 ? (
          <ChatEmptyState
            icon={
              <Svg
                type="chatBubble"
                width="48px"
                height="48px"
                style={{ fill: "var(--accent-4, #ccc)" }}
              />
            }
            title="채팅방이 없습니다"
            action={
              <Button type="ghost" onClick={() => setShowNewChat(true)}>
                새 채팅 시작하기
              </Button>
            }
          />
        ) : (
          rooms.map((r) => (
            <ChatRoomListItem
              key={r._id}
              room={r}
              isActive={room?._id === r._id}
              currentUserId={currentUser?.userId ?? ""}
              currentUserObjId={currentUser?._id ?? ""}
              onClick={handleRoomClick}
              onPin={handleListPinRoom}
              onShowStorage={handleListShowStorage}
              onArchive={handleListArchiveRoom}
              onLeave={handleListLeaveRoom}
            />
          ))
        )}
        {showArchived && archivedRooms.length > 0 && (
          <div className={style.archived_list}>
            {archivedRooms.map((r) => (
              <ChatRoomListItem
                key={r._id}
                room={r}
                isActive={room?._id === r._id}
                isArchived
                currentUserId={currentUser?.userId ?? ""}
                currentUserObjId={currentUser?._id ?? ""}
                onClick={handleRoomClick}
                onShowStorage={handleListShowStorage}
                onArchive={handleListArchiveRoom}
                onLeave={handleListLeaveRoom}
              />
            ))}
          </div>
        )}
      </div>
      <div className={chatUiStyle.listFooter}>
        <Button type="ghost" onClick={() => setShowNewChat(true)} style={{ width: "100%" }}>
          새 채팅
        </Button>
        {archivedRooms.length > 0 && (
          <Button
            type="ghost"
            onClick={() => setShowArchived(!showArchived)}
            style={{ width: "100%" }}
          >
            <span className={style.archived_toggle}>
              <Svg
                type="archive"
                width="14px"
                height="14px"
                style={{ fill: "var(--accent-1)" }}
              />
              보관함 ({archivedRooms.length})
              <Svg
                type="chevronDown"
                width="14px"
                height="14px"
                style={{
                  fill: "var(--accent-1)",
                  transform: showArchived ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </span>
          </Button>
        )}
      </div>
    </div>
  );

  // Chat conversation view
  const chatConversationContent = room ? (
    <>
      <div className={style.messages_container}>
        {isLoading ? (
          <div className={style.loading}>메시지를 불러오는 중...</div>
        ) : messages.length === 0 ? (
          <ChatEmptyState
            icon={
              <Svg
                type="send"
                width="40px"
                height="40px"
                style={{ fill: "var(--accent-4, #ccc)" }}
              />
            }
            title="아직 메시지가 없습니다"
            subtitle="첫 메시지를 보내보세요!"
          />
        ) : (
          messages.map((msg, index) => {
            const groupStart = isGroupStart(index);
            const isOwn = msg.sender === currentUser?._id;
            return (
              <div key={msg._id}>
                {shouldShowDate(index) && (
                  <div className={style.date_divider}>
                    <span>{formatMessageDate(msg.createdAt)}</span>
                  </div>
                )}
                <div
                  className={`${style.message_wrapper} ${isOwn ? style.own : ""} ${
                    groupStart ? style.group_start : style.group_continuation
                  }`}
                >
                  {!isOwn && groupStart && (
                    <img
                      src={msg.senderProfile || getSenderProfile(msg.sender)}
                      alt={msg.senderName}
                      className={style.sender_avatar}
                    />
                  )}
                  {isOwn && !msg.isDeleted && (
                    <button
                      className={style.delete_btn}
                      onClick={() => handleDeleteMessage(msg._id)}
                      title="삭제"
                    >
                      <Svg type="trash" width="14px" height="14px" />
                    </button>
                  )}
                  <ChatMessageBubble
                    variant={isOwn ? "own" : "other"}
                    time={formatMessageTime(msg.createdAt)}
                    sender={
                      !isOwn && groupStart ? (
                        <>
                          {msg.senderName}
                          <span className={style.sender_id}>
                            ({msg.senderId})
                          </span>
                        </>
                      ) : undefined
                    }
                    className={msg.isDeleted ? chatUiStyle.bubbleDeleted : ""}
                  >
                    {msg.isDeleted ? (
                      <span className={style.deleted_text}>
                        삭제된 메시지입니다
                      </span>
                    ) : (
                      <ChatMessageContent
                        message={msg}
                        onImageClick={(url) => setLightboxImage(url)}
                        onFileDownload={handleFileDownload}
                      />
                    )}
                  </ChatMessageBubble>
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className={style.typing}>
            <div className={style.typing_dots}>
              <span /><span /><span />
            </div>
            {isTyping.userName}님이 입력 중...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`${style.input_container} ${isDragging ? style.dragging : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* File Preview Modal */}
        {previewFile && (
          <div className={style.file_preview_modal}>
            {previewFile.type === "image" ? (
              <img src={previewFile.preview} alt="Preview" className={style.preview_image} />
            ) : (
              <div className={style.file_info}>
                <Svg type="file" width="32px" height="32px" />
                <div className={style.file_details}>
                  <span className={style.file_name}>{previewFile.file.name}</span>
                  <span className={style.file_size}>{formatFileSize(previewFile.file.size)}</span>
                </div>
              </div>
            )}
            <div className={style.preview_actions}>
              <Button type="ghost" onClick={cancelFilePreview} disabled={isUploading}>
                취소
              </Button>
              <Button type="ghost" onClick={handleFileUpload} disabled={isUploading}>
                {isUploading ? "업로드 중..." : "전송"}
              </Button>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className={style.drag_overlay}>
            <Svg type="upload" width="32px" height="32px" />
            <span>파일을 여기에 놓으세요</span>
          </div>
        )}

        {canChat ? (
          <>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,.pdf,.hwp,.hwpx,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.zip,.txt,.csv,.json,.md"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
            <ChatInputBar
              bare
              value={newMessage}
              onChange={setNewMessage}
              onSend={handleSend}
              placeholder="메시지를 입력하세요..."
              disabled={isSending}
              sendDisabled={isSending || !newMessage.trim()}
              sendActive={!!newMessage.trim()}
              sendTitle="전송"
              onKeyUp={handleTyping}
              onPaste={handlePaste}
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
    <div className={style.chat_window}>
      {showChatList || !room ? chatListContent : chatConversationContent}
    </div>
  );

  const handleClose = () => {
    setIsExpanded(false);
    onClose();
  };

  // === Modal (navbar panel) layout ===
  return (
    <>
      <ChatPanelShell
        variant={isExpanded ? "expanded" : "default"}
        onOverlayClick={handleClose}
      >
        <ChatPanelHeader
          title={
            !showChatList && room ? getRoomDisplayName() : "메시지"
          }
          subtitle={
            !showChatList && room
              ? room.participants.map((p) => p.userName).join(", ")
              : undefined
          }
          leading={
            showChatList || !room ? (
              <Svg
                type="chat"
                width="16px"
                height="16px"
                style={{ fill: "var(--accent-1, #333)" }}
              />
            ) : undefined
          }
          onBack={
            !showChatList && room
              ? () => {
                  setShowChatList(true);
                  setRoom(null);
                  // 목록으로 나간 뒤 창을 닫으면 재오픈 시에도 목록 유지
                  onRoomSelect(null);
                }
              : undefined
          }
          actions={
            !showChatList && room ? (
              <div ref={menuRef} className={style.room_actions}>
                <button
                  type="button"
                  className={chatUiStyle.iconBtn}
                  onClick={() => setShowMenu(!showMenu)}
                  title="메뉴"
                >
                  <Svg
                    type="verticalDots"
                    width="16px"
                    height="16px"
                    style={{ fill: "var(--accent-1, #333)" }}
                  />
                </button>
                {showMenu && (
                  <div className={style.menu_dropdown}>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        setShowMenu(false);
                        handlePinRoom();
                      }}
                    >
                      <Svg
                        type={room.isPinned ? "pinOff" : "pin"}
                        width="16px"
                        height="16px"
                      />
                      <span>{room.isPinned ? "고정 해제" : "고정"}</span>
                    </div>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        setShowMenu(false);
                        setShowStorage(true);
                      }}
                    >
                      <Svg type="file" width="16px" height="16px" />
                      <span>내 파일</span>
                    </div>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        setShowMenu(false);
                        handleArchiveRoom();
                      }}
                    >
                      <Svg
                        type="archive"
                        width="16px"
                        height="16px"
                        style={{ fill: "var(--accent-2)" }}
                      />
                      <span>보관</span>
                    </div>
                    <div
                      className={`${style.menu_item} ${style.danger}`}
                      onClick={() => {
                        setShowMenu(false);
                        handleLeaveRoom();
                      }}
                    >
                      <Svg type="logout" width="16px" height="16px" />
                      <span>채팅방 나가기</span>
                    </div>
                  </div>
                )}
              </div>
            ) : undefined
          }
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded((prev) => !prev)}
          onClose={handleClose}
        />
        {chatContent}
      </ChatPanelShell>

      {showNewChat && (
        <NewChat
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleNewChatComplete}
        />
      )}

      {showStorage && (
        <ChatFileStorage onClose={() => setShowStorage(false)} />
      )}

      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
};

export default ChatWindow;
