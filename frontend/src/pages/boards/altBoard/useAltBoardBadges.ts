import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import { TBoard } from "types/board";
import { TAltForm } from "types/altForm";

/**
 * 수업 탭 등 외부 Tab에 넘길 보드 뱃지(활동/문서/채팅)
 *
 * 주의: useAPIv2()는 매 렌더마다 새 함수 참조를 만들므로
 * useCallback/useEffect 의존성에 API 객체를 넣지 않는다.
 */
export const useAltBoardBadges = (
  board: TBoard | null,
  options?: { chatEnabled?: boolean; activeTab?: string }
) => {
  const { currentUser } = useAuth();
  const { AltFormAPI, BoardChatAPI, PostAPI, AltSheetRowAPI } = useAPIv2();
  const [forms, setForms] = useState<TAltForm[]>([]);
  const [docsUnreadCount, setDocsUnreadCount] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const activeTabRef = useRef(options?.activeTab || "");
  const boardId = board?._id;

  useEffect(() => {
    activeTabRef.current = options?.activeTab || "";
  }, [options?.activeTab]);

  const chatEnabled = options?.chatEnabled !== false;

  const refresh = useCallback(() => {
    if (!boardId) return;
    AltFormAPI.RAltForms({ query: { board: boardId } })
      .then(({ forms: loaded }) => setForms(loaded))
      .catch(() => setForms([]));
    PostAPI.RPostUnreadCount({ query: { board: boardId } })
      .then(({ count }) => setDocsUnreadCount(count))
      .catch(() => setDocsUnreadCount(0));
    AltSheetRowAPI.RAltSheetRowPendingApprovals({
      query: { board: boardId },
    })
      .then(({ count }) => setPendingApprovalCount(count))
      .catch(() => setPendingApprovalCount(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs are unstable
  }, [boardId]);

  useEffect(() => {
    if (!boardId) {
      setForms([]);
      setDocsUnreadCount(0);
      setPendingApprovalCount(0);
      setChatUnreadCount(0);
      return;
    }
    refresh();
  }, [boardId, refresh]);

  // 채팅 unread: 보드당 1회 + 소켓 (목록 sync는 서버에서 제거)
  useEffect(() => {
    if (!currentUser || !boardId || !chatEnabled) {
      setChatUnreadCount(0);
      return;
    }

    let cancelled = false;
    BoardChatAPI.RBoardChatRooms({ params: { boardId } })
      .then(({ rooms }) => {
        if (cancelled) return;
        const total = rooms.reduce(
          (sum, room) => sum + (room.unreadCount || 0),
          0
        );
        setChatUnreadCount(total);
      })
      .catch(() => {
        if (!cancelled) setChatUnreadCount(0);
      });

    const socket = io(
      process.env.REACT_APP_SERVER_URL || window.location.origin,
      { path: "/io/chat", withCredentials: true }
    );

    socket.on("connect", () => {
      socket.emit("join", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    });

    socket.on("new_message", (data: { boardId?: string }) => {
      if (data.boardId === boardId && activeTabRef.current !== "채팅") {
        setChatUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs are unstable
  }, [
    currentUser?.academyId,
    currentUser?.userId,
    boardId,
    chatEnabled,
  ]);

  const markChatRead = useCallback(() => {
    if (!boardId) return;
    setChatUnreadCount(0);
    BoardChatAPI.RBoardChatRooms({ params: { boardId } })
      .then(({ rooms }) =>
        Promise.all(
          rooms.map((room) =>
            BoardChatAPI.UBoardChatRead({
              params: { boardId, roomId: room._id },
            }).catch(() => {})
          )
        )
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs are unstable
  }, [boardId]);

  const activityBadgeCount = (() => {
    const now = new Date();
    const unsubmitted = forms.filter((f) => {
      if (f.isDraft) return false;
      if (f.settings?.requiredMode !== true) return false;
      if (f.settings?.directInputMode) return false;
      if (f.settings?.closeAt && new Date(f.settings.closeAt) < now) return false;
      if (f.settings?.openAt && new Date(f.settings.openAt) > now) return false;
      return !f.mySubmitted;
    }).length;
    return unsubmitted + pendingApprovalCount;
  })();

  const badges: Record<string, number> = {};
  if (activityBadgeCount > 0) badges["활동"] = activityBadgeCount;
  if (docsUnreadCount > 0) badges["문서"] = docsUnreadCount;
  if (chatEnabled && chatUnreadCount > 0) badges["채팅"] = chatUnreadCount;

  return { badges, refresh, markChatRead };
};

export default useAltBoardBadges;
