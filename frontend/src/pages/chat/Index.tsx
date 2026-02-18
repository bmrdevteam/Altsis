import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Socket, io } from "socket.io-client";

import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import { TChatRoom } from "types/chat";
import ChatWindow from "layout/navbar/ChatWindow";

import style from "./chat.module.scss";

const ChatPage = () => {
  const { currentUser } = useAuth();
  const { ChatAPI } = useAPIv2();
  const location = useLocation();

  const [socket, setSocket] = useState<Socket>();
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<TChatRoom | null>(null);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  const initialRoomApplied = useRef(false);

  const loadRooms = async () => {
    if (!currentUser?._id) return;
    try {
      const { rooms } = await ChatAPI.RChatRooms();
      setRooms(rooms);
      setChatEnabled(true);

      // Auto-select room if navigated with roomId state
      const state = location.state as { roomId?: string } | null;
      if (state?.roomId && !initialRoomApplied.current) {
        const targetRoom = rooms.find((r) => r._id === state.roomId);
        if (targetRoom) {
          setSelectedRoom(targetRoom);
          initialRoomApplied.current = true;
        }
      }
    } catch (err: any) {
      if (err?.response?.data?.message === "CHAT_NOT_ENABLED") {
        setChatEnabled(false);
      }
    }
  };

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

  if (chatEnabled === false) {
    return (
      <div className={style.container}>
        <div className={style.disabled}>채팅이 활성화되지 않았습니다.</div>
      </div>
    );
  }

  if (chatEnabled === null) {
    return (
      <div className={style.container}>
        <div className={style.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={style.container}>
      <ChatWindow
        room={selectedRoom}
        rooms={rooms}
        socket={socket}
        embedded
        onClose={() => {
          setSelectedRoom(null);
        }}
        onRoomSelect={(room) => {
          setSelectedRoom(room);
        }}
        onRoomUpdated={(updatedRoom) => {
          setSelectedRoom(updatedRoom);
          loadRooms();
        }}
        onNewChatCreated={(room) => {
          setSelectedRoom(room);
          loadRooms();
        }}
        onRoomLeft={() => {
          setSelectedRoom(null);
          loadRooms();
        }}
      />
    </div>
  );
};

export default ChatPage;
