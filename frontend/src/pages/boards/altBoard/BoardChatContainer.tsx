import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { TBoard, TAltBoardRole } from "types/board";
import { TChatRoom } from "types/chat";
import { TAIChatSession } from "types/aiChat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import BoardChatTab from "./BoardChatTab";
import BoardChatMemberSidebar from "./BoardChatMemberSidebar";
import BoardDMPanel from "./BoardDMPanel";
import AIChatPanel from "./AIChatPanel";
import MemberInvitePicker from "./MemberInvitePicker";
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
  const { BoardAPI, BoardChatAPI, AIChatAPI } = useAPIv2();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"group" | "ai" | "dm">("group");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAISessionId, setSelectedAISessionId] = useState<
    string | undefined
  >();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // DM state
  const [dmRoomId, setDmRoomId] = useState<string | null>(null);
  const [dmPartner, setDmPartner] = useState<Member | null>(null);

  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (currentUser.auth === "admin") return "admin";
    if (
      board.creator != null &&
      String(board.creator) === String(currentUser._id)
    ) {
      return "admin";
    }
    const roles = board.altBoardRole;
    if (!roles) return null;
    return (
      (roles[currentUser._id] as TAltBoardRole | undefined) ||
      (roles[String(currentUser._id)] as TAltBoardRole | undefined) ||
      null
    );
  })();

  const isTeacher = myRole === "admin" || myRole === "writer";
  const canManageRooms =
    currentUser?.auth === "admin" ||
    currentUser?.auth === "manager" ||
    (board.creator != null &&
      String(board.creator) === String(currentUser?._id)) ||
    myRole === "admin" ||
    myRole === "writer";

  const loadRooms = useCallback(async () => {
    if (!board._id) return;
    try {
      const { rooms: loaded } = await BoardChatAPI.RBoardChatRooms({
        params: { boardId: board._id },
      });
      setRooms(loaded);
      setSelectedRoomId((prev) => {
        if (prev && loaded.some((r) => r._id === prev)) return prev;
        const general = loaded.find((r) => r.isGeneral);
        return general?._id || loaded[0]?._id || null;
      });
    } catch {
      // error handled by useAPIv2
    }
  }, [board._id]);

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

  useEffect(() => {
    if (!board._id) return;
    BoardAPI.RBoardMemberList({ params: { _id: board._id } })
      .then(({ users }) => setMembers(users))
      .catch(() => {});
  }, [board._id]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!board._id) return;
    AIChatAPI.RAIChatSettings({ params: { _id: board._id } })
      .then(({ enabled }) => setAiEnabled(enabled))
      .catch(() => setAiEnabled(false));
  }, [board._id]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (data: { boardId?: string; room?: string }) => {
      if (data.boardId !== board._id) return;
      if (chatMode === "group" && data.room === selectedRoomId) return;
      loadRooms();
    };
    socket.on("new_message", handleNewMessage);
    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, board._id, chatMode, selectedRoomId, loadRooms]);

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setChatMode("group");
    setSelectedAISessionId(undefined);
    setDmRoomId(null);
    setDmPartner(null);
    setRooms((prev) =>
      prev.map((r) => (r._id === roomId ? { ...r, unreadCount: 0 } : r))
    );
  };

  const handleDMClick = (member: Member) => {
    if (member.user === currentUser?._id) return;
    setDmRoomId(null);
    setDmPartner(member);
    setChatMode("dm");
    setSelectedAISessionId(undefined);
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

  const openCreateModal = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setSelectedMemberIds([]);
    setShowCreateModal(true);
  };

  const handleCreateRoom = async () => {
    const name = newRoomName.trim();
    if (!name || isCreatingRoom) return;
    setIsCreatingRoom(true);
    try {
      const { room } = await BoardChatAPI.CBoardChatRoom({
        params: { boardId: board._id },
        data: {
          name,
          description: newRoomDescription.trim() || undefined,
          memberIds: selectedMemberIds,
        },
      });
      setRooms((prev) => {
        const without = prev.filter((r) => r._id !== room._id);
        return [...without, room].sort((a, b) => {
          if (a.isGeneral && !b.isGeneral) return -1;
          if (!a.isGeneral && b.isGeneral) return 1;
          return (a.name || "").localeCompare(b.name || "", "ko");
        });
      });
      setSelectedRoomId(room._id);
      setChatMode("group");
      setShowCreateModal(false);
      setNewRoomName("");
      setNewRoomDescription("");
      setSelectedMemberIds([]);
    } catch {
      // error handled by useAPIv2
    }
    setIsCreatingRoom(false);
  };

  const handleRoomUpdated = (room: TChatRoom) => {
    setRooms((prev) => prev.map((r) => (r._id === room._id ? room : r)));
  };

  const selectedRoom = rooms.find((r) => r._id === selectedRoomId) || null;
  const inviteCandidates = members.filter(
    (m) => m.user !== currentUser?._id
  );

  return (
    <div className={style.container}>
      <BoardChatMemberSidebar
        members={members}
        board={board}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        chatMode={chatMode}
        aiEnabled={aiEnabled}
        selectedAISessionId={selectedAISessionId}
        selectedDMUserId={dmPartner?.user}
        canManageRooms={canManageRooms}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={openCreateModal}
        onSelectAIChat={handleSelectAIChat}
        onDMClick={handleDMClick}
      />
      <div className={style.chat_area}>
        {chatMode === "dm" && dmPartner ? (
          <BoardDMPanel
            roomId={dmRoomId}
            partner={dmPartner}
            partnerName={dmPartner.userName}
            socket={socket}
            onBack={handleDMBack}
            onRoomCreated={(roomId) => setDmRoomId(roomId)}
            onViewStudentAI={
              isTeacher && aiEnabled ? handleViewStudentAI : undefined
            }
          />
        ) : chatMode === "ai" ? (
          <AIChatPanel
            board={board}
            socket={socket}
            sessionId={selectedAISessionId}
            myRole={myRole}
          />
        ) : selectedRoomId && selectedRoom ? (
          <BoardChatTab
            board={board}
            roomId={selectedRoomId}
            roomName={
              selectedRoom.isGeneral
                ? "전체 채팅"
                : selectedRoom.name || "팀방"
            }
            isGeneral={!!selectedRoom.isGeneral}
            room={selectedRoom}
            boardMembers={members}
            canManageMembers={canManageRooms}
            socket={socket}
            onNewMessage={onNewMessage}
            onRoomUpdated={handleRoomUpdated}
            onRoomRead={() =>
              setRooms((prev) =>
                prev.map((r) =>
                  r._id === selectedRoomId ? { ...r, unreadCount: 0 } : r
                )
              )
            }
            onLeftRoom={() => {
              const leavingId = selectedRoomId;
              setRooms((prev) => {
                const next = prev.filter((r) => r._id !== leavingId);
                const general = next.find((r) => r.isGeneral);
                setSelectedRoomId(general?._id || null);
                return next;
              });
            }}
          />
        ) : (
          <div className={style.chat_placeholder}>채팅방을 불러오는 중...</div>
        )}
      </div>

      {showCreateModal && (
        <div
          className={style.modal_backdrop}
          onClick={() => !isCreatingRoom && setShowCreateModal(false)}
        >
          <div
            className={style.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="create-team-room-title"
          >
            <h3 id="create-team-room-title" className={style.modal_title}>
              팀방 만들기
            </h3>
            <p className={style.modal_hint}>
              초대된 멤버만 볼 수 있는 비공개 팀방입니다.
            </p>
            <label className={style.modal_label}>
              이름
              <input
                className={style.modal_input}
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="예: 기획팀"
                autoFocus
                maxLength={40}
              />
            </label>
            <label className={style.modal_label}>
              설명 (선택)
              <input
                className={style.modal_input}
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="이 방의 목적"
                maxLength={120}
              />
            </label>
            <div className={style.modal_label}>
              초대할 멤버
              <MemberInvitePicker
                members={inviteCandidates}
                selectedIds={selectedMemberIds}
                onChange={setSelectedMemberIds}
                emptyText="초대할 다른 멤버가 없습니다. (나만 있는 방으로 만들어집니다)"
              />
            </div>
            <div className={style.modal_actions}>
              <button
                type="button"
                className={style.modal_btn_secondary}
                disabled={isCreatingRoom}
                onClick={() => setShowCreateModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={style.modal_btn_primary}
                disabled={!newRoomName.trim() || isCreatingRoom}
                onClick={handleCreateRoom}
              >
                {isCreatingRoom ? "만드는 중..." : "만들기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardChatContainer;
