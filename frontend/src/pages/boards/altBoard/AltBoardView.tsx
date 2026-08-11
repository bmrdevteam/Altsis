import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { TBoard, TAltBoardRole } from "types/board";
import { TAltForm } from "types/altForm";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAppPrefix } from "hooks/useAppPrefix";
import { useAppNavigate } from "hooks/useAppNavigate";
import { copyClipBoard } from "functions/functions";
import Tab from "components/tab/Tab";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import AltFormList from "./AltFormList";
import AltFormBuilder from "./AltFormBuilder";
import AltFormRenderer from "./AltFormRenderer";
import AltSheetView from "./AltSheetView";
import AltDocsView from "./AltDocsView";
import BoardChatContainer from "./BoardChatContainer";
import style from "./altBoard.module.scss";

export type TAltBoardSurface = "활동" | "문서" | "채팅";

type Props = {
  board: TBoard;
  embedded?: boolean; // true when rendered inside another page (e.g. course tab)
  /** 수업 탭 평탄화: 지정 시 내부 Tab 없이 해당 표면만 렌더 */
  surface?: TAltBoardSurface;
};

const AltBoardView = ({ board, embedded, surface }: Props) => {
  const { currentUser, currentSchool } = useAuth();
  const { AltFormAPI, BoardChatAPI, PostAPI, AltSheetRowAPI } = useAPIv2();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefix = useAppPrefix();
  const navigate = useAppNavigate();

  const [forms, setForms] = useState<TAltForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCopiedMessage, setLinkCopiedMessage] = useState<string | null>(
    null
  );

  // 탭 뱃지
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [docsUnreadCount, setDocsUnreadCount] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [gradeTodoCount, setGradeTodoCount] = useState(0);
  const activeTabRef = useRef<string>("");

  // 현재 유저의 Alt Board 역할
  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (currentUser.auth === "admin") return "admin";
    // ObjectId/string 혼용 대비 — 생성자는 항상 admin
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

  const canManage =
    myRole === "admin" ||
    myRole === "writer" ||
    currentUser?.auth === "manager";
  const canDeleteAnyRow = myRole === "admin" || currentUser?.auth === "manager";

  // 채팅 활성화 여부 (학교 + 아카데미 + 보드 수준 모두 확인)
  const isChatEnabled =
    currentSchool?.chatEnabled !== false &&
    currentSchool?.academyFeatures?.chatEnabled !== false &&
    board.chatEnabled !== false;

  // 특정 양식의 수정/삭제 가능 여부 (작성자 본인, 보드 admin, 시스템 manager)
  const canModifyForm = (form: TAltForm) => {
    if (!currentUser) return false;
    if (myRole === "admin") return true;
    if (currentUser.auth === "manager") return true;
    if (
      form.creator != null &&
      String(form.creator) === String(currentUser._id)
    ) {
      return true;
    }
    return false;
  };

  // Form builder/renderer 상태
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [rendererFormId, setRendererFormId] = useState<string | null>(null);
  /** embedded일 때 URL 없이 작성/개별 보기 구분 */
  const [embeddedRendererMode, setEmbeddedRendererMode] = useState<
    "compose" | "review"
  >("compose");
  /** embedded일 때 URL 없이 시트(응답 기록) 열기 */
  const [embeddedSheetFormId, setEmbeddedSheetFormId] = useState<string | null>(
    null
  );

  // URL search params (only used in standalone mode)
  const urlFormId = embedded ? null : searchParams.get("form");
  const urlSheetId = embedded ? null : searchParams.get("sheet");
  const urlMode = embedded ? null : searchParams.get("mode");
  const urlApprovalRowId = embedded ? null : searchParams.get("approval");
  const activeSheetFormId = embedded ? embeddedSheetFormId : urlSheetId;

  const loadForms = () => {
    setIsLoading(true);
    AltFormAPI.RAltForms({ query: { board: board._id } })
      .then(({ forms }) => {
        setForms(forms);
        setIsLoading(false);
      })
      .catch(() => {
        setForms([]);
        setIsLoading(false);
      });
  };

  const loadDocsUnread = useCallback(() => {
    PostAPI.RPostUnreadCount({ query: { board: board._id } })
      .then(({ count }) => setDocsUnreadCount(count))
      .catch(() => setDocsUnreadCount(0));
  }, [board._id]);

  const loadPendingApprovals = useCallback(() => {
    AltSheetRowAPI.RAltSheetRowPendingApprovals({
      query: { board: board._id },
    })
      .then(({ count }) => setPendingApprovalCount(count))
      .catch(() => setPendingApprovalCount(0));
  }, [board._id]);

  // surface 모드: 해당 탭에 필요한 데이터만 1회 로드 (중복 RAltForms 방지)
  useEffect(() => {
    if (surface) {
      activeTabRef.current = surface;
      if (surface === "활동") {
        loadForms();
        loadPendingApprovals();
      } else if (surface === "문서") {
        loadDocsUnread();
      } else if (surface === "채팅") {
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
      }
      return;
    }
    loadForms();
    loadDocsUnread();
    loadPendingApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per board/surface
  }, [board._id, surface]);

  // 활동 뱃지: 필수·미제출 + 승인/승인진행 + 채점 대기 (할 일 칩과 동일 구성)
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
    return unsubmitted + pendingApprovalCount + gradeTodoCount;
  })();

  // 채팅 뱃지: 초기 unread count 로드 + 소켓 리스너
  useEffect(() => {
    if (!currentUser || !board._id || !isChatEnabled) return;
    // 수업 탭에서 뱃지는 useAltBoardBadges가 담당 → surface 모드에선 소켓 생략
    if (surface) return;

    // 초기 unread count (전체 + 주제방 합산)
    BoardChatAPI.RBoardChatRooms({ params: { boardId: board._id } })
      .then(({ rooms }) => {
        const total = rooms.reduce(
          (sum, room) => sum + (room.unreadCount || 0),
          0
        );
        if (total) setChatUnreadCount(total);
      })
      .catch(() => {});

    // 소켓 연결
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
    board._id,
    isChatEnabled,
    surface,
  ]);

  const handleTabChange = useCallback((tabKey: string) => {
    activeTabRef.current = tabKey;
    if (tabKey === "채팅") {
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
    }
    if (tabKey === "문서") {
      loadDocsUnread();
    }
    if (tabKey === "활동") {
      loadForms();
      loadPendingApprovals();
    }
  }, [board._id, loadDocsUnread, loadPendingApprovals]);

  // URL → State 동기화: ?form=<id>&mode=<respond|responses|edit> 처리
  useEffect(() => {
    if (isLoading || !urlFormId) return;

    if (urlFormId === "new" && canManage) {
      setBuilderFormId("new");
      setRendererFormId(null);
      return;
    }

    const targetForm = forms.find((f) => f._id === urlFormId);
    if (targetForm) {
      if (urlMode === "respond" || urlMode === "responses") {
        // 응답 작성 / 내 응답 개별 보기
        setRendererFormId(urlFormId);
        setBuilderFormId(null);
      } else if (canModifyForm(targetForm)) {
        setBuilderFormId(urlFormId);
        setRendererFormId(null);
      } else {
        setRendererFormId(urlFormId);
        setBuilderFormId(null);
      }
    } else if (
      // 방금 저장한 비공개 양식 등은 목록에 아직 없을 수 있음 → 이미 빌더에 열린 경우만 유지
      (urlMode === "edit" || !urlMode) &&
      canManage &&
      builderFormId === urlFormId
    ) {
      setBuilderFormId(urlFormId);
      setRendererFormId(null);
    } else {
      // 잘못된 formId — 파라미터 제거
      setSearchParams(
        (prev) => {
          prev.delete("form");
          prev.delete("mode");
          return prev;
        },
        { replace: true }
      );
    }
  }, [isLoading, urlFormId, urlMode, forms, canManage, builderFormId]);

  // 구 해시 #양식·#기록 → #활동 호환 (?sheet= 등 search 유지)
  useEffect(() => {
    if (embedded) return;
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash === "양식" || hash === "기록") {
      navigate(`/boards/${board._id}${location.search}#활동`, {
        replace: true,
      });
    }
  }, [location.hash, location.search, embedded, board._id, navigate]);

  // 탭 전환 시 관련 없는 파라미터 정리 (standalone only)
  // 시트는 #활동에서만 유지 — #기록 리다이렉트 이후에 동작
  useEffect(() => {
    if (embedded) return;
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash === "기록") return; // 호환 redirect 대기
    if (hash && hash !== "활동" && searchParams.has("sheet")) {
      setSearchParams(
        (prev) => {
          prev.delete("sheet");
          return prev;
        },
        { replace: true }
      );
    }
  }, [location.hash, embedded, searchParams, setSearchParams]);

  // Form builder 열기
  const handleOpenBuilder = (formId?: string) => {
    const id = formId || "new";
    setBuilderFormId(id);
    setRendererFormId(null);
    if (!embedded) {
      navigate(`/boards/${board._id}?form=${id}&mode=edit`, { replace: true });
    }
  };

  // Form renderer 열기 (작성)
  const handleOpenRenderer = (formId: string) => {
    setRendererFormId(formId);
    setBuilderFormId(null);
    setEmbeddedRendererMode("compose");
    if (!embedded) {
      navigate(`/boards/${board._id}?form=${formId}&mode=respond`, {
        replace: true,
      });
    }
  };

  // 내 응답 개별 보기
  const handleOpenMyResponses = (formId: string) => {
    setRendererFormId(formId);
    setBuilderFormId(null);
    setEmbeddedRendererMode("review");
    if (!embedded) {
      navigate(`/boards/${board._id}?form=${formId}&mode=responses`, {
        replace: true,
      });
    }
  };

  const handleRendererViewModeChange = (mode: "compose" | "review") => {
    setEmbeddedRendererMode(mode);
    if (embedded || !rendererFormId) return;
    navigate(
      `/boards/${board._id}?form=${rendererFormId}&mode=${
        mode === "review" ? "responses" : "respond"
      }`,
      { replace: true }
    );
  };

  // 빌더/렌더러에서 활동 탭으로 복귀
  const handleBackToList = () => {
    setBuilderFormId(null);
    setRendererFormId(null);
    if (!embedded) {
      navigate(`/boards/${board._id}#활동`, { replace: true });
    }
    loadForms();
  };

  // 시트 상세에서 활동 탭으로 복귀
  const handleBackToSheetList = () => {
    setEmbeddedSheetFormId(null);
    if (!embedded) {
      navigate(`/boards/${board._id}#활동`, { replace: true });
    }
  };

  // 시트(응답 기록) 열기 — 활동에서 진입
  const handleOpenSheet = (formId: string) => {
    if (embedded) {
      setEmbeddedSheetFormId(formId);
      setBuilderFormId(null);
      setRendererFormId(null);
      return;
    }
    navigate(`/boards/${board._id}?sheet=${formId}#활동`, { replace: true });
  };

  // Form 클릭 핸들러
  const handleFormClick = (form: TAltForm) => {
    if (canModifyForm(form)) {
      handleOpenBuilder(form._id);
    } else {
      handleOpenRenderer(form._id);
    }
  };

  // 링크 복사 핸들러
  const handleCopyFormLink = (formId: string) => {
    const url = `${window.location.origin}${prefix}/boards/${board._id}?form=${formId}`;
    copyClipBoard(url).then((result) => {
      setLinkCopiedMessage(
        typeof result === "string"
          ? "양식 링크가 복사되었습니다."
          : "링크 복사에 실패했습니다."
      );
    });
  };

  const handleCopySheetLink = (formId: string) => {
    const url = `${window.location.origin}${prefix}/boards/${board._id}?sheet=${formId}#활동`;
    copyClipBoard(url).then((result) => {
      setLinkCopiedMessage(
        typeof result === "string"
          ? "기록 링크가 복사되었습니다."
          : "링크 복사에 실패했습니다."
      );
    });
  };

  const linkCopiedPopup = linkCopiedMessage ? (
    <Popup
      title="알림"
      setState={(v: boolean) => {
        if (!v) setLinkCopiedMessage(null);
      }}
      closeBtn
      style={{ maxWidth: "360px", width: "100%" }}
      footer={
        <Button type="ghost" onClick={() => setLinkCopiedMessage(null)}>
          확인
        </Button>
      }
    >
      <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
        {linkCopiedMessage}
      </div>
    </Popup>
  ) : null;

  // 빌더 모드
  if (builderFormId) {
    return (
      <>
        <AltFormBuilder
          board={board}
          formId={builderFormId === "new" ? undefined : builderFormId}
          onBack={handleBackToList}
          onRespondForm={handleOpenRenderer}
          onCopyFormLink={handleCopyFormLink}
          onFormCreated={(id) => {
            setBuilderFormId(id);
            loadForms();
            if (!embedded) {
              navigate(`/boards/${board._id}?form=${id}&mode=edit`, {
                replace: true,
              });
            }
          }}
        />
        {linkCopiedPopup}
      </>
    );
  }

  // 렌더러 모드
  if (rendererFormId) {
    const rendererMode = embedded
      ? embeddedRendererMode
      : urlMode === "responses"
        ? "review"
        : "compose";
    return (
      <AltFormRenderer
        key={`${rendererFormId}-${rendererMode}`}
        board={board}
        formId={rendererFormId}
        onBack={handleBackToList}
        initialViewMode={rendererMode}
        onViewModeChange={handleRendererViewModeChange}
      />
    );
  }

  // 시트 상세 모드 (양식 관리와 같이 탭 밖 전체 화면)
  if (activeSheetFormId) {
    if (!myRole) {
      return (
        <div className={style.emptyState}>
          이 보드의 기록에 접근할 권한이 없습니다.
        </div>
      );
    }
    return (
      <>
        <AltSheetView
          forms={forms}
          canManage={canManage}
          canDeleteAnyRow={canDeleteAnyRow}
          initialFormId={activeSheetFormId}
          onFormSelect={handleOpenSheet}
          onFormDeselect={handleBackToSheetList}
          onCopySheetLink={handleCopySheetLink}
          boardName={board.name}
        />
        {linkCopiedPopup}
      </>
    );
  }

  const tabItems: Record<string, React.ReactNode> = {
    "활동": (
      <div style={{ paddingTop: 20 }}>
        <AltFormList
          board={board}
          forms={forms}
          isLoading={isLoading}
          myRole={myRole}
          canManage={canManage}
          canModifyForm={canModifyForm}
          onFormClick={handleFormClick}
          onRespondForm={handleOpenRenderer}
          onViewMyResponses={handleOpenMyResponses}
          onOpenSheet={handleOpenSheet}
          onCreateForm={() => handleOpenBuilder()}
          onRefresh={() => {
            loadForms();
            loadPendingApprovals();
          }}
          onCopyFormLink={handleCopyFormLink}
          openApprovalRowId={urlApprovalRowId}
          onPendingApprovalCountChange={setPendingApprovalCount}
          onGradeTodoCountChange={setGradeTodoCount}
        />
      </div>
    ),
    "문서": (
      <div style={{ paddingTop: 20 }}>
        <AltDocsView board={board} onPostsChanged={loadDocsUnread} />
      </div>
    ),
  };

  if (isChatEnabled) {
    tabItems["채팅"] = (
      <div
        style={{
          paddingTop: 20,
          height: "calc(100dvh - 200px)",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BoardChatContainer board={board} onNewMessage={() => {
          if (activeTabRef.current !== "채팅") {
            setChatUnreadCount((prev) => prev + 1);
          }
        }} />
      </div>
    );
  }

  // 수업 평탄화: 단일 표면만 렌더
  if (surface) {
    if (surface === "채팅" && !isChatEnabled) {
      return (
        <div className={style.emptyState}>채팅이 비활성화되어 있습니다.</div>
      );
    }
    return (
      <>
        {tabItems[surface] ?? (
          <div className={style.emptyState}>표시할 내용이 없습니다.</div>
        )}
        {linkCopiedPopup}
      </>
    );
  }

  const tabBadges: Record<string, number> = {};
  if (activityBadgeCount > 0) tabBadges["활동"] = activityBadgeCount;
  if (docsUnreadCount > 0) tabBadges["문서"] = docsUnreadCount;
  if (isChatEnabled && chatUnreadCount > 0) tabBadges["채팅"] = chatUnreadCount;

  return (
    <>
      <Tab
        items={tabItems}
        align="center"
        dontUsePaths={embedded}
        defaultTab="활동"
        badges={tabBadges}
        onTabChange={handleTabChange}
      />
      {linkCopiedPopup}
    </>
  );
};

export default AltBoardView;
