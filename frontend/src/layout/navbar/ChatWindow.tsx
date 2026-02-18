import { useEffect, useRef, useState, DragEvent, ClipboardEvent } from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatMessage } from "types/chat";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import InviteUsers from "./InviteUsers";
import RoomSettings from "./RoomSettings";
import NewChat from "./NewChat";
import ChatMessageContent from "./ChatMessageContent";
import ImageLightbox from "./ImageLightbox";
import ChatFileStorage from "./ChatFileStorage";
import ChatRoomListItem from "./ChatRoomListItem";
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
  socket?: Socket;
  onClose: () => void;
  onRoomSelect: (room: TChatRoom) => void;
  onRoomUpdated?: (room: TChatRoom) => void;
  onNewChatCreated: (room: TChatRoom) => void;
  onRoomLeft: () => void;
  embedded?: boolean;
};

const ChatWindow = ({ room: initialRoom, rooms, socket, onClose, onRoomSelect, onRoomUpdated, onNewChatCreated, onRoomLeft, embedded }: Props) => {
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
  const [showStorage, setShowStorage] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedRooms, setArchivedRooms] = useState<TChatRoom[]>([]);

  // On mobile, force sidebar expanded
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && sidebarCollapsed) setSidebarCollapsed(false);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [sidebarCollapsed]);

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCreator = room?.creator === currentUser?._id;
  const canInvite = isCreator || room?.settings?.allowInvites !== false;
  const canChat = isCreator || room?.settings?.allowChat !== false;

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

  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 100; // ~5 lines
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
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
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
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

      console.log("[ChatUpload] Uploading:", previewFile.file.name, previewFile.file.size);
      const { attachment } = await ChatAPI.CChatFileUpload({
        params: { roomId: room._id },
        data: formData,
      });
      console.log("[ChatUpload] Result:", attachment);

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

  const loadArchivedRooms = async () => {
    try {
      const { rooms } = await ChatAPI.RChatRooms({
        query: { archived: "true" },
      });
      setArchivedRooms(rooms);
    } catch {
      // ignore
    }
  };

  const handleUnarchiveRoom = async (targetRoom: TChatRoom) => {
    try {
      await ChatAPI.UChatRoomArchive({
        params: { roomId: targetRoom._id },
      });
      setArchivedRooms((prev) => prev.filter((r) => r._id !== targetRoom._id));
      onRoomLeft(); // trigger parent reload
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

  const filteredRooms = sidebarSearch.trim()
    ? rooms.filter((r) => {
        const query = sidebarSearch.toLowerCase();
        const nameMatch = getRoomDisplayName(r).toLowerCase().includes(query);
        const participantMatch = r.participants.some(
          (p) =>
            p.userName.toLowerCase().includes(query) ||
            p.userId.toLowerCase().includes(query)
        );
        return nameMatch || participantMatch;
      })
    : rooms;

  // Chat list view
  const chatListContent = (
    <div className={style.chat_list_container}>
      <div className={style.chat_list_items}>
        {rooms.length === 0 ? (
          <div className={style.empty_state}>
            <Svg type="chatBubble" width="48px" height="48px" style={{ fill: "var(--accent-4, #ccc)" }} />
            <span className={style.empty_state_text}>채팅방이 없습니다</span>
            <Button type="ghost" onClick={() => setShowNewChat(true)}>
              새 채팅 시작하기
            </Button>
          </div>
        ) : (
          rooms.map((r) => (
            <ChatRoomListItem
              key={r._id}
              room={r}
              isActive={room?._id === r._id}
              currentUserId={currentUser?.userId ?? ""}
              currentUserObjId={currentUser?._id ?? ""}
              onClick={handleRoomClick}
            />
          ))
        )}
      </div>
      {rooms.length > 0 && (
        <div className={style.chat_list_footer}>
          <Button type="ghost" onClick={() => setShowNewChat(true)} style={{ width: "100%" }}>
            새 채팅
          </Button>
        </div>
      )}
    </div>
  );

  // Chat conversation view
  const chatConversationContent = room ? (
    <>
      {/* Chat Header with Menu */}
      <div className={style.room_header}>
        <div className={style.room_header_top}>
          {embedded && (
            <>
              <button
                className={style.mobile_back_btn}
                onClick={() => {
                  setRoom(null);
                  onRoomSelect(null as any);
                }}
                title="목록으로"
              >
                <Svg type="arrowLeft" width="16px" height="16px" style={{ fill: "var(--accent-2)" }} />
              </button>
              <span className={style.room_name_title}>{getRoomDisplayName()}</span>
            </>
          )}
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
                    <Svg type="userPlus" width="16px" height="16px" />
                    <span>사용자 초대</span>
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
                    <Svg type="settings" width="16px" height="16px" />
                    <span>채팅방 설정</span>
                  </div>
                )}
                <div
                  className={style.menu_item}
                  onClick={() => {
                    setShowMenu(false);
                    handlePinRoom();
                  }}
                >
                  <Svg type={room.isPinned ? "pinOff" : "pin"} width="16px" height="16px" />
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
                  <Svg type="archive" width="16px" height="16px" />
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
                  <span className={style.participant_id}>({participant.userId})</span>
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
          <div className={style.empty_state}>
            <Svg type="send" width="40px" height="40px" style={{ fill: "var(--accent-4, #ccc)" }} />
            <span className={style.empty_state_text}>아직 메시지가 없습니다</span>
            <span className={style.empty_state_sub}>첫 메시지를 보내보세요!</span>
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
                  <div className={style.sender}>
                    {msg.senderName}
                    <span className={style.sender_id}>({msg.senderId})</span>
                  </div>
                )}
                <div className={style.content}>
                  <ChatMessageContent
                    message={msg}
                    onImageClick={(url) => setLightboxImage(url)}
                    onFileDownload={handleFileDownload}
                  />
                </div>
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
              accept="image/*,.pdf,.hwp,.docx,.xlsx,.zip,.txt"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
            <button
              className={style.attach_button}
              onClick={() => fileInputRef.current?.click()}
              title="파일 첨부"
            >
              <Svg type="paperclip" width="20px" height="20px" />
            </button>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onKeyUp={handleTyping}
              onPaste={handlePaste}
              placeholder="메시지를 입력하세요..."
              rows={1}
            />
            <button
              className={`${style.send_button} ${newMessage.trim() ? style.active : ""}`}
              onClick={handleSend}
              disabled={isSending || !newMessage.trim()}
              title="전송"
            >
              <Svg type="send" width="20px" height="20px" />
            </button>
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
    <div className={`${style.chat_window} ${style.panel_mode}`}>
      {showChatList || !room ? chatListContent : chatConversationContent}
    </div>
  );

  // === Embedded (page) layout: sidebar + main area ===
  if (embedded) {
    return (
      <>
        <div className={`${style.embedded_layout} ${room ? style.room_selected : ""}`}>
          {/* Sidebar - Chat List */}
          <div className={`${style.sidebar} ${sidebarCollapsed ? style.collapsed : ""}`}>
            {sidebarCollapsed ? (
              <div className={style.sidebar_collapsed_content}>
                <button
                  className={style.sidebar_toggle}
                  onClick={() => setSidebarCollapsed(false)}
                  title="사이드바 펼치기"
                >
                  <Svg type="chevronRight" width="16px" height="16px" style={{ fill: "var(--accent-2)" }} />
                </button>
                <button
                  className={style.sidebar_toggle}
                  onClick={() => setShowNewChat(true)}
                  title="새 채팅"
                >
                  <Svg type="chat" width="16px" height="16px" style={{ fill: "var(--accent-2)" }} />
                </button>
              </div>
            ) : (
              <>
                <div className={style.sidebar_header}>
                  <button
                    className={style.sidebar_toggle}
                    onClick={() => setSidebarCollapsed(true)}
                    title="사이드바 접기"
                  >
                    <Svg type="arrowLeft" width="14px" height="14px" style={{ fill: "var(--accent-2)" }} />
                  </button>
                  <span className={style.sidebar_title}>채팅</span>
                  <button
                    className={style.new_chat_btn}
                    onClick={() => setShowNewChat(true)}
                  >
                    + 새 채팅
                  </button>
                </div>
                <div className={style.sidebar_search}>
                  <Svg type="search" width="14px" height="14px" style={{ fill: "var(--accent-3)" }} />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="채팅방 검색..."
                    className={style.sidebar_search_input}
                  />
                  {sidebarSearch && (
                    <button
                      className={style.sidebar_search_clear}
                      onClick={() => setSidebarSearch("")}
                    >
                      <Svg type="x" width="12px" height="12px" style={{ fill: "var(--accent-3)" }} />
                    </button>
                  )}
                </div>
                <div className={style.sidebar_list}>
                  {showArchived ? (
                    <>
                      <button
                        className={style.archive_back_btn}
                        onClick={() => setShowArchived(false)}
                      >
                        <Svg type="arrowLeft" width="14px" height="14px" style={{ fill: "var(--accent-2)" }} />
                        <span>보관함</span>
                      </button>
                      {archivedRooms.length === 0 ? (
                        <div className={style.empty_state}>
                          <span className={style.empty_state_text}>보관된 채팅이 없습니다</span>
                        </div>
                      ) : (
                        archivedRooms.map((r) => (
                          <div key={r._id} className={style.archived_room_item}>
                            <ChatRoomListItem
                              room={r}
                              isActive={false}
                              currentUserId={currentUser?.userId ?? ""}
                              currentUserObjId={currentUser?._id ?? ""}
                              onClick={handleRoomClick}
                            />
                            <button
                              className={style.unarchive_btn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnarchiveRoom(r);
                              }}
                              title="보관 해제"
                            >
                              <Svg type="unarchive" width="14px" height="14px" style={{ fill: "var(--accent-2)" }} />
                            </button>
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      {filteredRooms.length === 0 ? (
                        <div className={style.empty_state}>
                          {rooms.length === 0 ? (
                            <>
                              <Svg type="chatBubble" width="48px" height="48px" style={{ fill: "var(--accent-4, #ccc)" }} />
                              <span className={style.empty_state_text}>채팅방이 없습니다</span>
                              <Button type="ghost" onClick={() => setShowNewChat(true)}>
                                새 채팅 시작하기
                              </Button>
                            </>
                          ) : (
                            <span className={style.empty_state_text}>검색 결과가 없습니다</span>
                          )}
                        </div>
                      ) : (
                        filteredRooms.map((r) => (
                          <ChatRoomListItem
                            key={r._id}
                            room={r}
                            isActive={room?._id === r._id}
                            currentUserId={currentUser?.userId ?? ""}
                            currentUserObjId={currentUser?._id ?? ""}
                            onClick={handleRoomClick}
                          />
                        ))
                      )}
                    </>
                  )}
                </div>
                {!showArchived && (
                  <button
                    className={style.archive_toggle_btn}
                    onClick={() => {
                      setShowArchived(true);
                      loadArchivedRooms();
                    }}
                  >
                    <Svg type="archive" width="14px" height="14px" style={{ fill: "var(--accent-3)" }} />
                    <span>보관함</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Main Area - Conversation */}
          <div className={style.main_area}>
            {room ? (
              <div className={`${style.chat_window} ${style.chat_window_embedded}`}>
                {chatConversationContent}
              </div>
            ) : (
              <div className={style.empty_state}>
                <Svg type="chat" width="48px" height="48px" style={{ fill: "var(--accent-4, #ccc)" }} />
                <span className={style.empty_state_text}>채팅방을 선택해주세요</span>
                <span className={style.empty_state_sub}>왼쪽 목록에서 채팅방을 선택하거나 새 채팅을 시작하세요</span>
              </div>
            )}
          </div>
        </div>

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
  }

  // === Modal (navbar panel) layout ===
  return (
    <>
      <div className={`${style.chat_panel_container} ${embedded ? style.embedded : ""}`}>
        <div className={style.chat_panel_header}>
          <div className={style.chat_panel_title_area}>
            {!showChatList && room ? (
              <>
                <button
                  className={style.chat_panel_btn}
                  onClick={() => {
                    setShowChatList(true);
                    setRoom(null);
                  }}
                  title="목록으로"
                >
                  <Svg type="arrowLeft" width="16px" height="16px" style={{ fill: "var(--accent-1, #333)" }} />
                </button>
                <span className={style.chat_panel_title}>{getRoomDisplayName()}</span>
              </>
            ) : (
              <>
                <Svg type="chat" width="16px" height="16px" style={{ fill: "var(--accent-1, #333)" }} />
                <span className={style.chat_panel_title}>채팅</span>
              </>
            )}
          </div>
          <div className={style.chat_panel_actions}>
            <button className={style.chat_panel_btn} onClick={onClose} title="닫기">
              <Svg type="x" width="16px" height="16px" style={{ fill: "var(--accent-1, #333)" }} />
            </button>
          </div>
        </div>
        {chatContent}
      </div>

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
