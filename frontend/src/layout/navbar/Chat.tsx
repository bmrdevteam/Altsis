import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";

import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import useAPIv2 from "hooks/useAPIv2";
import { TChatRoom } from "types/chat";
import ChatWindow from "./ChatWindow";
import NewChat from "./NewChat";
import defaultProfilePic from "assets/img/default_profile.png";

const Chat = () => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [socket, setSocket] = useState<Socket>();
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatPopupActive, setChatPopupActive] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<TChatRoom | null>(null);
  const [chatWindowActive, setChatWindowActive] = useState(false);
  const [newChatActive, setNewChatActive] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);

  const chatDivRef = useRef<HTMLDivElement>(null);

  const loadRooms = async () => {
    if (!currentUser?._id) return;
    try {
      const { rooms } = await ChatAPI.RChatRooms();
      setRooms(rooms);
      setChatEnabled(true);

      // Calculate unread count
      let count = 0;
      rooms.forEach((room) => {
        const participant = room.participants.find(
          (p) => p.userId === currentUser.userId
        );
        if (
          participant &&
          room.lastMessage?.sentAt &&
          (!participant.lastReadAt ||
            new Date(room.lastMessage.sentAt) >
              new Date(participant.lastReadAt))
        ) {
          // Check if the last message is not from current user
          if (room.lastMessage.sender !== currentUser._id) {
            count++;
          }
        }
      });
      setUnreadCount(count);
    } catch (err: any) {
      // Chat may not be enabled
      if (err?.response?.data?.message === "CHAT_NOT_ENABLED") {
        setChatEnabled(false);
      }
    }
  };

  // Socket setup
  useEffect(() => {
    if (!currentUser?._id) return;

    const newSocket = io(`${process.env.REACT_APP_SERVER_URL}`, {
      path: "/io/chat",
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      newSocket.emit("join", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    });

    newSocket.on("new_message", () => {
      loadRooms();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (currentUser?._id) {
      loadRooms();
    }
  }, [currentUser?._id]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        chatDivRef.current &&
        !chatDivRef.current.contains(e.target as Node)
      ) {
        setChatPopupActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoomDisplayName = (room: TChatRoom) => {
    if (room.type === "group") return room.name || "그룹 채팅";
    const otherParticipant = room.participants.find(
      (p) => p.userId !== currentUser?.userId
    );
    return otherParticipant?.userName || "알 수 없음";
  };

  const getRoomDisplayImage = (room: TChatRoom) => {
    if (room.type === "group") return defaultProfilePic;
    const otherParticipant = room.participants.find(
      (p) => p.userId !== currentUser?.userId
    );
    return otherParticipant?.profile || defaultProfilePic;
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

  const handleRoomSelect = (room: TChatRoom) => {
    setSelectedRoom(room);
    setChatWindowActive(true);
    setChatPopupActive(false);
  };

  const handleNewChatCreated = (room: TChatRoom) => {
    setNewChatActive(false);
    setSelectedRoom(room);
    setChatWindowActive(true);
    loadRooms();
  };

  // Don't render if chat is not enabled or still checking
  if (chatEnabled === false || chatEnabled === null) {
    return null;
  }

  return (
    <div className={style.notification} ref={chatDivRef}>
      <div
        className={`${style.icon} ${unreadCount > 0 && style.active}`}
        onClick={() => setChatPopupActive((prev) => !prev)}
        data-count={unreadCount > 0 ? unreadCount : ""}
      >
        <Svg type="chat" width="20px" height="20px" />
      </div>

      {chatPopupActive && (
        <div className={style.contents}>
          <div className={style.title} style={{ display: "flex", gap: "4px" }}>
            <Svg type="chat" width="20px" height="20px" />
            채팅
          </div>
          <div className={style.item_box}>
            {rooms.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "var(--accent-3)",
                }}
              >
                채팅방이 없습니다
              </div>
            ) : (
              rooms.map((room) => {
                const participant = room.participants.find(
                  (p) => p.userId === currentUser?.userId
                );
                const hasUnread =
                  room.lastMessage?.sentAt &&
                  room.lastMessage.sender !== currentUser?._id &&
                  (!participant?.lastReadAt ||
                    new Date(room.lastMessage.sentAt) >
                      new Date(participant.lastReadAt));

                return (
                  <div
                    key={room._id}
                    className={style.item}
                    style={{
                      cursor: "pointer",
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                    onClick={() => handleRoomSelect(room)}
                  >
                    <img
                      src={getRoomDisplayImage(room)}
                      alt={getRoomDisplayName(room)}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: hasUnread ? "bold" : "normal",
                            fontSize: "14px",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getRoomDisplayName(room)}
                        {room.type === "group" && (
                          <span style={{
                            fontSize: "11px",
                            color: "var(--accent-3)",
                            fontWeight: "normal",
                            marginLeft: "4px"
                          }}>
                            ({room.participants.length})
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {hasUnread && (
                          <div
                            style={{
                              backgroundColor: "var(--color-r3)",
                              color: "#fff",
                              borderRadius: "10px",
                              padding: "2px 6px",
                              fontSize: "10px",
                              fontWeight: "600",
                              minWidth: "8px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            N
                          </div>
                        )}
                        <div
                          style={{ fontSize: "11px", color: "var(--accent-3)", whiteSpace: "nowrap" }}
                        >
                          {formatTime(room.lastMessage?.sentAt)}
                        </div>
                      </div>
                    </div>
                      {room.lastMessage && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--accent-3)",
                            marginTop: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {room.lastMessage.content}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className={style.button} style={{ display: "flex", gap: "4px" }}>
            <Button
              type="ghost"
              onClick={() => {
                setNewChatActive(true);
                setChatPopupActive(false);
              }}
              style={{ flexGrow: "1" }}
            >
              새 채팅
            </Button>
          </div>
        </div>
      )}

      {chatWindowActive && selectedRoom && (
        <ChatWindow
          room={selectedRoom}
          socket={socket}
          onClose={() => {
            setChatWindowActive(false);
            setSelectedRoom(null);
            loadRooms();
          }}
          onRoomUpdated={(updatedRoom) => {
            setSelectedRoom(updatedRoom);
            loadRooms();
          }}
        />
      )}

      {newChatActive && (
        <NewChat
          onClose={() => setNewChatActive(false)}
          onChatCreated={handleNewChatCreated}
        />
      )}
    </div>
  );
};

export default Chat;
