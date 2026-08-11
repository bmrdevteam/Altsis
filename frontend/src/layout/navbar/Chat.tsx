import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";

import { useAuth } from "contexts/authContext";
import Svg from "assets/svg/Svg";
import useAPIv2 from "hooks/useAPIv2";
import { TChatRoom } from "types/chat";
import ChatWindow from "./ChatWindow";
import audioURL from "assets/audio/notification-a.mp3";
import { updateChatAppBadge } from "utils/appBadge";

const Chat = () => {
  const { currentUser, currentSchool, currentSeason } = useAuth();
  const { ChatAPI, NotificationAPI } = useAPIv2();
  const [searchParams, setSearchParams] = useSearchParams();

  const [socket, setSocket] = useState<Socket>();
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [boardRooms, setBoardRooms] = useState<TChatRoom[]>([]);
  const [archivedRooms, setArchivedRooms] = useState<TChatRoom[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<TChatRoom | null>(null);
  const [chatWindowActive, setChatWindowActive] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);

  const chatDivRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef(new Audio(audioURL));
  const soundEnabledRef = useRef(true);
  const chatWindowActiveRef = useRef(false);
  const chatRoomDeepLinkHandledRef = useRef<string | null>(null);

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
      const boardQuery: { season?: string; school?: string } = {};
      if (currentSeason?._id) boardQuery.season = currentSeason._id;
      if (currentSchool?._id) boardQuery.school = currentSchool._id;

      const [{ rooms }, { rooms: board }] = await Promise.all([
        ChatAPI.RChatRooms(),
        ChatAPI.RChatBoardRooms({ query: boardQuery }).catch(() => ({
          rooms: [] as TChatRoom[],
        })),
      ]);
      setRooms(rooms);
      setBoardRooms(board);
      setChatEnabled(true);

      const count =
        rooms.reduce((sum, room) => sum + (room.unreadCount ?? 0), 0) +
        board.reduce((sum, room) => sum + (room.unreadCount ?? 0), 0);
      setUnreadCount(count);
      updateChatAppBadge(count);

      const { rooms: archived } = await ChatAPI.RChatRooms({
        query: { archived: "true" },
      });
      setArchivedRooms(archived);
    } catch (err: any) {
      // Chat may not be enabled
      if (err?.response?.data?.message === "CHAT_NOT_ENABLED") {
        setChatEnabled(false);
        updateChatAppBadge(0);
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
      // 포그라운드에서만 재생 (백그라운드 play는 Chrome 빈 미디어 알림 유발)
      if (
        soundEnabledRef.current &&
        !chatWindowActiveRef.current &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
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
  }, [currentUser?._id, currentSeason?._id, currentSchool?._id]);

  // Web Push 클릭 → ?chatRoom= 딥링크
  useEffect(() => {
    const chatRoomId = searchParams.get("chatRoom");
    if (!chatRoomId || chatEnabled === false) return;
    if (chatRoomDeepLinkHandledRef.current === chatRoomId) return;
    if (rooms.length === 0 && archivedRooms.length === 0) return;

    const target =
      rooms.find((r) => r._id === chatRoomId) ||
      archivedRooms.find((r) => r._id === chatRoomId);

    chatRoomDeepLinkHandledRef.current = chatRoomId;
    const next = new URLSearchParams(searchParams);
    next.delete("chatRoom");
    setSearchParams(next, { replace: true });

    if (target) {
      setSelectedRoom(target);
      setChatWindowActive(true);
    }
  }, [searchParams, rooms, archivedRooms, chatEnabled]);

  const handleRoomSelect = (room: TChatRoom | null): void => {
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
          boardRooms={boardRooms}
          archivedRooms={archivedRooms}
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
