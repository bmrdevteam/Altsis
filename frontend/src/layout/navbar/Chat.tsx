import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";

import { useAuth } from "contexts/authContext";
import Svg from "assets/svg/Svg";
import useAPIv2 from "hooks/useAPIv2";
import { TChatRoom } from "types/chat";
import ChatWindow from "./ChatWindow";
import audioURL from "assets/audio/notification-a.mp3";

const Chat = () => {
  const { currentUser, currentSchool } = useAuth();
  const { ChatAPI, NotificationAPI } = useAPIv2();

  const [socket, setSocket] = useState<Socket>();
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<TChatRoom | null>(null);
  const [chatWindowActive, setChatWindowActive] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);

  const chatDivRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef(new Audio(audioURL));
  const soundEnabledRef = useRef(true);
  const chatWindowActiveRef = useRef(false);

  // Keep refs in sync with state
  chatWindowActiveRef.current = chatWindowActive;

  // Load sound preference
  useEffect(() => {
    if (currentUser?._id) {
      NotificationAPI.RNotificationSettings()
        .then(({ settings }) => {
          soundEnabledRef.current = settings.soundEnabled ?? true;
        })
        .catch(() => {});
    }
  }, [currentUser?._id]);

  const loadRooms = async () => {
    if (!currentUser?._id) return;
    try {
      const { rooms } = await ChatAPI.RChatRooms();
      setRooms(rooms);
      setChatEnabled(true);

      // Calculate total unread count from backend-provided unreadCount
      const count = rooms.reduce(
        (sum, room) => sum + (room.unreadCount ?? 0),
        0
      );
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
      // Play sound when chat window is not active
      if (soundEnabledRef.current && !chatWindowActiveRef.current) {
        audioRef.current.play().catch(() => {
          // 자동 재생 정책에 의해 재생이 차단될 수 있음
        });
      }
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
  }, [currentUser?._id]);

  useEffect(() => {
    if (currentUser?._id) {
      loadRooms();
    }
  }, [currentUser?._id]);

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

  // Don't render if chat is not enabled at school or academy level
  if (
    currentSchool?.chatEnabled === false ||
    currentSchool?.academyFeatures?.chatEnabled === false
  ) {
    return null;
  }

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
