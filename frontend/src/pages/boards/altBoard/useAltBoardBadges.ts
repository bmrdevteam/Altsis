import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import { TBoard } from "types/board";
import { TAltForm } from "types/altForm";

/**
 * 수업 탭 등 외부 Tab에 넘길 보드 뱃지(활동/문서/채팅)
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

  useEffect(() => {
    activeTabRef.current = options?.activeTab || "";
  }, [options?.activeTab]);

  const chatEnabled = options?.chatEnabled !== false;

  const refresh = useCallback(() => {
    if (!board?._id) return;
    AltFormAPI.RAltForms({ query: { board: board._id } })
      .then(({ forms: loaded }) => setForms(loaded))
      .catch(() => setForms([]));
    PostAPI.RPostUnreadCount({ query: { board: board._id } })
      .then(({ count }) => setDocsUnreadCount(count))
      .catch(() => setDocsUnreadCount(0));
    AltSheetRowAPI.RAltSheetRowPendingApprovals({
      query: { board: board._id },
    })
      .then(({ count }) => setPendingApprovalCount(count))
      .catch(() => setPendingApprovalCount(0));
  }, [board?._id, AltFormAPI, PostAPI, AltSheetRowAPI]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!currentUser || !board?._id || !chatEnabled) return;

    BoardChatAPI.RBoardChatRooms({ params: { boardId: board._id } })
      .then(({ rooms }) => {
        const total = rooms.reduce(
          (sum, room) => sum + (room.unreadCount || 0),
          0
        );
        if (total) setChatUnreadCount(total);
      })
      .catch(() => {});

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
      if (data.boardId === board._id && activeTabRef.current !== "채팅") {
        setChatUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [
    currentUser?.academyId,
    currentUser?.userId,
    board?._id,
    chatEnabled,
    BoardChatAPI,
  ]);

  const markChatRead = useCallback(() => {
    if (!board?._id) return;
    setChatUnreadCount(0);
    BoardChatAPI.RBoardChatRooms({ params: { boardId: board._id } })
      .then(({ rooms }) =>
        Promise.all(
          rooms.map((room) =>
            BoardChatAPI.UBoardChatRead({
              params: { boardId: board._id, roomId: room._id },
            }).catch(() => {})
          )
        )
      )
      .catch(() => {});
  }, [board?._id, BoardChatAPI]);

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
