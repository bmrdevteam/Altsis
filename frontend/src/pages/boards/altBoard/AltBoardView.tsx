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

type Props = {
  board: TBoard;
  embedded?: boolean; // true when rendered inside another page (e.g. course tab)
};

const AltBoardView = ({ board, embedded }: Props) => {
  const { currentUser, currentSchool } = useAuth();
  const { AltFormAPI, BoardChatAPI } = useAPIv2();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefix = useAppPrefix();
  const navigate = useAppNavigate();

  const [forms, setForms] = useState<TAltForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCopiedMessage, setLinkCopiedMessage] = useState<string | null>(
    null
  );

  // 채팅 뱃지
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const activeTabRef = useRef<string>("");

  // 현재 유저의 Alt Board 역할
  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (currentUser.auth === "admin") return "admin";
    if (board.creator === currentUser._id) return "admin";
    const roles = board.altBoardRole;
    if (!roles) return null;
    return (
      (roles[currentUser._id] as TAltBoardRole | undefined) ||
      (roles[String(currentUser._id)] as TAltBoardRole | undefined) ||
      null
    );
  })();

  const canManage = myRole === "admin" || myRole === "writer";
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
    if (form.creator === currentUser._id) return true;
    return false;
  };

  // Form builder/renderer 상태
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [rendererFormId, setRendererFormId] = useState<string | null>(null);
  /** embedded일 때 URL 없이 작성/개별 보기 구분 */
  const [embeddedRendererMode, setEmbeddedRendererMode] = useState<
    "compose" | "review"
  >("compose");

  // URL search params (only used in standalone mode)
  const urlFormId = embedded ? null : searchParams.get("form");
  const urlSheetId = embedded ? null : searchParams.get("sheet");
  const urlMode = embedded ? null : searchParams.get("mode");
  const urlApprovalRowId = embedded ? null : searchParams.get("approval");

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

  useEffect(() => {
    loadForms();
  }, [board._id]);

  // 채팅 뱃지: 초기 unread count 로드 + 소켓 리스너
  useEffect(() => {
    if (!currentUser || !board._id || !isChatEnabled) return;

    // 초기 unread count
    BoardChatAPI.RBoardChatRoom({ params: { boardId: board._id } })
      .then(({ room }) => {
        if (room?.unreadCount) setChatUnreadCount(room.unreadCount);
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
  }, [currentUser?.academyId, currentUser?.userId, board._id, isChatEnabled]);

  const handleTabChange = useCallback((tabKey: string) => {
    activeTabRef.current = tabKey;
    if (tabKey === "채팅") {
      setChatUnreadCount(0);
      BoardChatAPI.UBoardChatRead({ params: { boardId: board._id } }).catch(() => {});
    }
  }, [board._id]);

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
  }, [isLoading, urlFormId, urlMode]);

  // 구 해시 #양식 → #활동 호환
  useEffect(() => {
    if (embedded) return;
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash === "양식") {
      navigate(`/boards/${board._id}${location.search}#활동`, {
        replace: true,
      });
    }
  }, [location.hash, location.search, embedded, board._id, navigate]);

  // 탭 전환 시 관련 없는 파라미터 정리 (standalone only)
  useEffect(() => {
    if (embedded) return;
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash && hash !== "기록" && searchParams.has("sheet")) {
      setSearchParams(
        (prev) => {
          prev.delete("sheet");
          return prev;
        },
        { replace: true }
      );
    }
  }, [location.hash, embedded]);

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

  // 기록 상세에서 기록 탭으로 복귀
  const handleBackToSheetList = () => {
    if (!embedded) {
      navigate(`/boards/${board._id}#기록`, { replace: true });
    }
  };

  // 기록 상세 열기
  const handleOpenSheet = (formId: string) => {
    if (!embedded) {
      navigate(`/boards/${board._id}?sheet=${formId}#기록`, { replace: true });
    }
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
    const url = `${window.location.origin}${prefix}/boards/${board._id}?sheet=${formId}#기록`;
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

  // 기록 상세 모드 (양식 관리와 같이 탭 밖 전체 화면)
  if (urlSheetId) {
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
          board={board}
          forms={forms}
          canManage={canManage}
          canDeleteAnyRow={canDeleteAnyRow}
          initialFormId={urlSheetId}
          onFormSelect={handleOpenSheet}
          onFormDeselect={handleBackToSheetList}
          onCopySheetLink={handleCopySheetLink}
        />
        {linkCopiedPopup}
      </>
    );
  }

  const tabItems: Record<string, React.ReactNode> = {
    "문서": <div style={{ paddingTop: 20 }}><AltDocsView board={board} /></div>,
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
          onOpenSheet={embedded ? undefined : handleOpenSheet}
          onCreateForm={() => handleOpenBuilder()}
          onRefresh={loadForms}
          onCopyFormLink={handleCopyFormLink}
          openApprovalRowId={urlApprovalRowId}
        />
      </div>
    ),
    "기록": (
      <div style={{ paddingTop: 20 }}>
        {!myRole ? (
          <div className={style.emptyState}>
            이 보드의 기록에 접근할 권한이 없습니다.
          </div>
        ) : (
          <AltSheetView
            board={board}
            forms={forms}
            canManage={canManage}
            canDeleteAnyRow={canDeleteAnyRow}
            initialFormId={undefined}
            onFormSelect={handleOpenSheet}
            onFormDeselect={handleBackToSheetList}
            onCopySheetLink={handleCopySheetLink}
          />
        )}
      </div>
    ),
  };

  if (isChatEnabled) {
    tabItems["채팅"] = (
      <div style={{ paddingTop: 20 }}>
        <BoardChatContainer board={board} onNewMessage={() => {
          if (activeTabRef.current !== "채팅") {
            setChatUnreadCount((prev) => prev + 1);
          }
        }} />
      </div>
    );
  }

  return (
    <>
      <Tab
        items={tabItems}
        align="center"
        dontUsePaths={embedded}
        defaultTab={undefined}
        badges={isChatEnabled ? { "채팅": chatUnreadCount } : undefined}
        onTabChange={handleTabChange}
      />
      {linkCopiedPopup}
    </>
  );
};

export default AltBoardView;
