import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { TBoard, TAltBoardRole, TMemberUser } from "types/board";
import { TChatRoom } from "types/chat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import { useAppNavigate } from "hooks/useAppNavigate";
import BoardChatTab from "./BoardChatTab";
import BoardChatMemberSidebar from "./BoardChatMemberSidebar";
import BoardDMPanel from "./BoardDMPanel";
import MemberInvitePicker from "./MemberInvitePicker";
import style from "./boardChatContainer.module.scss";

type Props = {
  board: TBoard;
  onNewMessage?: () => void;
};

const BoardChatContainer = ({ board, onNewMessage }: Props) => {
  const { currentUser, currentSeason } = useAuth();
  const { BoardAPI, BoardChatAPI } = useAPIv2();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useAppNavigate();
  const deepLinkHandledRef = useRef<string | null>(null);
  /** 채팅 탭 진입 직후 서버 unread가 사이드바에 다시 뜨지 않게 (첫 load만) */
  const suppressEnterUnreadRef = useRef(true);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [members, setMembers] = useState<TMemberUser[]>([]);
  const [rooms, setRooms] = useState<TChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"group" | "dm">("group");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // DM state
  const [dmRoomId, setDmRoomId] = useState<string | null>(null);
  const [dmPartner, setDmPartner] = useState<TMemberUser | null>(null);
  const [navOpen, setNavOpen] = useState(false);

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

  const canManageRooms =
    currentUser?.auth === "admin" ||
    currentUser?.auth === "manager" ||
    (board.creator != null &&
      String(board.creator) === String(currentUser?._id)) ||
    myRole === "admin" ||
    myRole === "writer";

  const clearLocalUnreads = useCallback(() => {
    setRooms((prev) => prev.map((r) => ({ ...r, unreadCount: 0 })));
  }, []);

  const loadRooms = useCallback(async () => {
    if (!board._id) return;
    try {
      const suppress = suppressEnterUnreadRef.current;
      const { rooms: loaded } = await BoardChatAPI.RBoardChatRooms({
        params: { boardId: board._id },
      });
      const next = suppress
        ? loaded.map((r) => ({ ...r, unreadCount: 0 }))
        : loaded;
      if (suppress) {
        suppressEnterUnreadRef.current = false;
      }
      setRooms(next);
      setSelectedRoomId((prev) => {
        if (prev && next.some((r) => r._id === prev)) return prev;
        const general = next.find((r) => r.isGeneral);
        return general?._id || next[0]?._id || null;
      });
    } catch {
      // error handled by useAPIv2
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs are unstable
  }, [board._id]);

  // Web Push / 상단바 → ?boardChatRoom= 딥링크
  // setSearchParams는 hash를 지움. 쿼리만 지울 때도 hash는 반드시 #채팅으로 유지.
  useEffect(() => {
    const targetRoomId = searchParams.get("boardChatRoom");
    if (!targetRoomId || rooms.length === 0) return;
    if (deepLinkHandledRef.current === targetRoomId) return;

    const exists = rooms.some((r) => r._id === targetRoomId);
    deepLinkHandledRef.current = targetRoomId;

    if (exists) {
      setSelectedRoomId(targetRoomId);
      setChatMode("group");
      setDmRoomId(null);
      setDmPartner(null);
    }

    const next = new URLSearchParams(searchParams);
    next.delete("boardChatRoom");
    const search = next.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : "",
        // 딥링크는 채팅 탭 전용 — 해시 유실 시 Tab이 계획서/활동으로 가는 것 방지
        hash: "채팅",
      },
      { replace: true }
    );
  }, [searchParams, rooms, navigate, location.pathname]);

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
    BoardAPI.RBoardMemberList({
      params: { _id: board._id },
      query: currentSeason?._id ? { season: currentSeason._id } : undefined,
    })
      .then(({ users }) => setMembers(users))
      .catch(() => {});
  }, [board._id, currentSeason?._id]);

  // 채팅 탭에 들어올 때마다 사이드바 stale unread 제거 후 목록 로드
  useEffect(() => {
    suppressEnterUnreadRef.current = true;
    clearLocalUnreads();
    loadRooms();
  }, [loadRooms, clearLocalUnreads]);

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

  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setChatMode("group");
    setDmRoomId(null);
    setDmPartner(null);
    setNavOpen(false);
    setRooms((prev) =>
      prev.map((r) => (r._id === roomId ? { ...r, unreadCount: 0 } : r))
    );
  };

  const handleDMClick = (member: TMemberUser) => {
    if (member.user === currentUser?._id) return;
    setDmRoomId(null);
    setDmPartner(member);
    setChatMode("dm");
    setNavOpen(false);
  };

  const handleDMBack = () => {
    setChatMode("group");
    setDmRoomId(null);
    setDmPartner(null);
  };

  const openCreateModal = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setSelectedMemberIds([]);
    setNavOpen(false);
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
      <div className={style.chat_area}>
        {chatMode === "dm" && dmPartner ? (
          <BoardDMPanel
            roomId={dmRoomId}
            partner={dmPartner}
            partnerName={dmPartner.userName}
            socket={socket}
            onBack={handleDMBack}
            onOpenNav={() => setNavOpen(true)}
            onRoomCreated={(roomId) => setDmRoomId(roomId)}
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
            onOpenNav={() => setNavOpen(true)}
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

      {navOpen && (
        <div
          className={style.nav_backdrop}
          onClick={closeNav}
          role="presentation"
        >
          <BoardChatMemberSidebar
            members={members}
            board={board}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            chatMode={chatMode}
            selectedDMUserId={dmPartner?.user}
            canManageRooms={canManageRooms}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={openCreateModal}
            onDMClick={handleDMClick}
            onClose={closeNav}
          />
        </div>
      )}

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
