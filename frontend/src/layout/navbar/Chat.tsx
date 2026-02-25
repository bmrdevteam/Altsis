import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";

import { useAuth } from "contexts/authContext";
import Svg from "assets/svg/Svg";
import useAPIv2 from "hooks/useAPIv2";
import { TChatRoom } from "types/chat";
import ChatWindow from "./ChatWindow";

const Chat = () => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [socket, setSocket] = useState<Socket>();
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<TChatRoom | null>(null);
  const [chatWindowActive, setChatWindowActive] = useState(false);
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

  // Check if chat is enabled first
  useEffect(() => {
    if (currentUser?._id) {
      loadRooms();
    }
  }, [currentUser?._id]);

  // Socket setup - only connect after confirming chat is enabled
  useEffect(() => {
    if (!currentUser?._id || !chatEnabled) return;

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

    newSocket.on("participants_added", () => {
      loadRooms();
    });

    newSocket.on("participant_removed", () => {
      loadRooms();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentUser?._id, chatEnabled]);

  const handleRoomSelect = (room: TChatRoom) => {
    setSelectedRoom(room);
  };

  const handleNewChatCreated = (room: TChatRoom) => {
    setSelectedRoom(room);
    loadRooms();
  };

  const handleChatIconClick = () => {
    setChatWindowActive((prev) => !prev);
  };

  // Don't render if chat is not enabled or still checking
  if (chatEnabled === false || chatEnabled === null) {
    return null;
  }

  return (
    <div className={style.notification} ref={chatDivRef}>
      <div
        className={`${style.icon} ${unreadCount > 0 && style.active}`}
        onClick={handleChatIconClick}
        data-count={unreadCount > 0 ? unreadCount : ""}
      >
        <Svg type="chat" width="20px" height="20px" />
      </div>

      {chatWindowActive && (
        <ChatWindow
          room={selectedRoom}
          rooms={rooms}
          socket={socket}
          onClose={() => {
            setChatWindowActive(false);
            loadRooms();
          }}
          onRoomSelect={handleRoomSelect}
          onRoomUpdated={(updatedRoom) => {
            setSelectedRoom(updatedRoom);
            loadRooms();
          }}
          onNewChatCreated={handleNewChatCreated}
          onRoomLeft={() => {
            setSelectedRoom(null);
            loadRooms();
          }}
        />
      )}
    </div>
  );
};

export default Chat;
