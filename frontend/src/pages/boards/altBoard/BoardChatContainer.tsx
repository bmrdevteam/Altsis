import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { TBoard, TAltBoardRole } from "types/board";
import { TAIChatSession } from "types/aiChat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import BoardChatTab from "./BoardChatTab";
import BoardChatMemberSidebar from "./BoardChatMemberSidebar";
import BoardDMPanel from "./BoardDMPanel";
import AIChatPanel from "./AIChatPanel";
import style from "./boardChatContainer.module.scss";

type Member = {
  user: string;
  userId: string;
  userName: string;
  profile?: string;
};

type Props = {
  board: TBoard;
  onNewMessage?: () => void;
};

const BoardChatContainer = ({ board, onNewMessage }: Props) => {
  const { currentUser } = useAuth();
  const { BoardAPI, ChatAPI, AIChatAPI } = useAPIv2();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [chatMode, setChatMode] = useState<"group" | "ai" | "dm">("group");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAISessionId, setSelectedAISessionId] = useState<
    string | undefined
  >();

  // DM state
  const [dmRoomId, setDmRoomId] = useState<string | null>(null);
  const [dmPartner, setDmPartner] = useState<Member | null>(null);

  // 현재 유저의 Alt Board 역할
  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (currentUser.auth === "admin") return "admin";
    if (board.creator === currentUser._id) return "admin";
    return (board.altBoardRole?.[currentUser._id] as TAltBoardRole) || null;
  })();

  const isTeacher = myRole === "admin" || myRole === "writer";

  // Socket connection
  useEffect(() => {
    if (!currentUser) return;

    const newSocket = io(
      process.env.REACT_APP_SERVER_URL || window.location.origin,
      { path: "/io/chat", withCredentials: true }
    );

    newSocket.on("connect", () => {
      newSocket.emit("join", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser?.academyId, currentUser?.userId]);

  // Load members
  useEffect(() => {
    if (!board._id) return;
    BoardAPI.RBoardMemberList({ params: { _id: board._id } })
      .then(({ users }) => setMembers(users))
      .catch(() => {});
  }, [board._id]);

  // Check AI enabled
  useEffect(() => {
    if (!board._id) return;
    AIChatAPI.RAIChatSettings({ params: { _id: board._id } })
      .then(({ enabled }) => setAiEnabled(enabled))
      .catch(() => setAiEnabled(false));
  }, [board._id]);

  // DM click handler — open inline
  const handleDMClick = async (member: Member) => {
    if (member.user === currentUser?._id) return;
    try {
      const { room } = await ChatAPI.CChatRoom({
        data: {
          type: "direct",
          participants: [
            {
              user: member.user,
              userId: member.userId,
              userName: member.userName,
            },
          ],
        },
      });
      setDmRoomId(room._id);
      setDmPartner(member);
      setChatMode("dm");
      setSelectedAISessionId(undefined);
    } catch {
      // error handled by useAPIv2
    }
  };

  // Chat mode handlers
  const handleSelectGroupChat = () => {
    setChatMode("group");
    setSelectedAISessionId(undefined);
    setDmRoomId(null);
    setDmPartner(null);
  };

  const handleSelectAIChat = () => {
    setChatMode("ai");
    setSelectedAISessionId(undefined);
    setDmRoomId(null);
    setDmPartner(null);
  };

  const handleDMBack = () => {
    setChatMode("group");
    setDmRoomId(null);
    setDmPartner(null);
  };

  // 교사: DM 상대 학생의 AI 대화 보기
  const handleViewStudentAI = async () => {
    if (!dmPartner || !isTeacher) return;
    try {
      const { sessions } = await AIChatAPI.RAIChatSessions({
        params: { _id: board._id },
      });
      const studentSession = sessions.find(
        (s: TAIChatSession) => s.student === dmPartner.user
      );
      if (studentSession) {
        setChatMode("ai");
        setSelectedAISessionId(studentSession._id);
        setDmRoomId(null);
        setDmPartner(null);
      } else {
        alert("해당 학생의 AI 대화가 아직 없습니다.");
      }
    } catch {
      // error handled by useAPIv2
    }
  };

  return (
    <div className={style.container}>
      <BoardChatMemberSidebar
        members={members}
        board={board}
        myRole={myRole}
        chatMode={chatMode}
        aiEnabled={aiEnabled}
        selectedAISessionId={selectedAISessionId}
        selectedDMUserId={dmPartner?.user}
        onSelectGroupChat={handleSelectGroupChat}
        onSelectAIChat={handleSelectAIChat}
        onDMClick={handleDMClick}
      />
      <div className={style.chat_area}>
        {chatMode === "dm" && dmRoomId && dmPartner ? (
          <BoardDMPanel
            roomId={dmRoomId}
            partnerName={dmPartner.userName}
            socket={socket}
            onBack={handleDMBack}
            onViewStudentAI={isTeacher && aiEnabled ? handleViewStudentAI : undefined}
          />
        ) : chatMode === "ai" ? (
          <AIChatPanel
            board={board}
            socket={socket}
            sessionId={selectedAISessionId}
            myRole={myRole}
          />
        ) : (
          <BoardChatTab
            board={board}
            socket={socket}
            onNewMessage={onNewMessage}
          />
        )}
      </div>
    </div>
  );
};

export default BoardChatContainer;
