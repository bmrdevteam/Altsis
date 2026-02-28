import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { TBoard, TAltBoardRole } from "types/board";
import { TAltForm } from "types/altForm";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAppPrefix } from "hooks/useAppPrefix";
import { copyClipBoard } from "functions/functions";
import Tab from "components/tab/Tab";
import AltFormList from "./AltFormList";
import AltFormBuilder from "./AltFormBuilder";
import AltFormRenderer from "./AltFormRenderer";
import AltSheetView from "./AltSheetView";
import AltDocsView from "./AltDocsView";
import BoardChatContainer from "./BoardChatContainer";

type Props = {
  board: TBoard;
  embedded?: boolean; // true when rendered inside another page (e.g. course tab)
};

const AltBoardView = ({ board, embedded }: Props) => {
  const { currentUser } = useAuth();
  const { AltFormAPI, BoardChatAPI } = useAPIv2();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefix = useAppPrefix();

  const [forms, setForms] = useState<TAltForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 채팅 뱃지
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const activeTabRef = useRef<string>("");

  // 현재 유저의 Alt Board 역할
  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (currentUser.auth === "admin") return "admin";
    if (board.creator === currentUser._id) return "admin";
    return (board.altBoardRole?.[currentUser._id] as TAltBoardRole) || null;
  })();

  const canManage = myRole === "admin" || myRole === "writer";

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

  // URL search params (only used in standalone mode)
  const urlFormId = embedded ? null : searchParams.get("form");
  const urlSheetId = embedded ? null : searchParams.get("sheet");
  const urlMode = embedded ? null : searchParams.get("mode");

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
    if (!currentUser || !board._id) return;

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
  }, [currentUser?.academyId, currentUser?.userId, board._id]);

  const handleTabChange = useCallback((tabKey: string) => {
    activeTabRef.current = tabKey;
    if (tabKey === "채팅") {
      setChatUnreadCount(0);
      BoardChatAPI.UBoardChatRead({ params: { boardId: board._id } }).catch(() => {});
    }
  }, [board._id]);

  // URL → State 동기화: ?form=<id>&mode=<respond|edit> 처리
  useEffect(() => {
    if (isLoading || !urlFormId) return;

    if (urlFormId === "new" && canManage) {
      setBuilderFormId("new");
      setRendererFormId(null);
      return;
    }

    const targetForm = forms.find((f) => f._id === urlFormId);
    if (targetForm) {
      if (urlMode === "respond") {
        // 명시적 응답 모드
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
    if (!embedded) setSearchParams({ form: id, mode: "edit" }, { replace: true });
  };

  // Form renderer 열기
  const handleOpenRenderer = (formId: string) => {
    setRendererFormId(formId);
    setBuilderFormId(null);
    if (!embedded) setSearchParams({ form: formId, mode: "respond" }, { replace: true });
  };

  // 빌더/렌더러에서 목록으로 복귀
  const handleBackToList = () => {
    setBuilderFormId(null);
    setRendererFormId(null);
    if (!embedded) setSearchParams({}, { replace: true });
    loadForms();
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
    copyClipBoard(url).then(() => {
      alert("양식 링크가 복사되었습니다.");
    });
  };

  const handleCopySheetLink = (formId: string) => {
    const url = `${window.location.origin}${prefix}/boards/${board._id}?sheet=${formId}#기록`;
    copyClipBoard(url).then(() => {
      alert("기록 링크가 복사되었습니다.");
    });
  };

  // 빌더 모드
  if (builderFormId) {
    return (
      <AltFormBuilder
        board={board}
        formId={builderFormId === "new" ? undefined : builderFormId}
        onBack={handleBackToList}
      />
    );
  }

  // 렌더러 모드
  if (rendererFormId) {
    return (
      <AltFormRenderer
        board={board}
        formId={rendererFormId}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <Tab
      items={{
        "문서": <div style={{ paddingTop: 20 }}><AltDocsView board={board} /></div>,
        "양식": (
          <div style={{ paddingTop: 20 }}>
            <AltFormList
              board={board}
              forms={forms}
              isLoading={isLoading}
              canManage={canManage}
              onFormClick={handleFormClick}
              onRespondForm={canManage ? handleOpenRenderer : undefined}
              onCreateForm={() => handleOpenBuilder()}
              onRefresh={loadForms}
              onCopyFormLink={handleCopyFormLink}
            />
          </div>
        ),
        "기록": (
          <div style={{ paddingTop: 20 }}>
            <AltSheetView
              board={board}
              forms={forms}
              canManage={canManage}
              initialFormId={urlSheetId || undefined}
              onFormSelect={(formId) => {
                if (!embedded) setSearchParams({ sheet: formId }, { replace: true });
              }}
              onFormDeselect={() => {
                if (!embedded) {
                  setSearchParams(
                    (prev) => {
                      prev.delete("sheet");
                      return prev;
                    },
                    { replace: true }
                  );
                }
              }}
              onCopySheetLink={handleCopySheetLink}
            />
          </div>
        ),
        "채팅": <div style={{ paddingTop: 20 }}><BoardChatContainer board={board} onNewMessage={() => {
          if (activeTabRef.current !== "채팅") {
            setChatUnreadCount((prev) => prev + 1);
          }
        }} /></div>,
      }}
      align="center"
      dontUsePaths={embedded}
      defaultTab={urlSheetId ? "기록" : undefined}
      badges={{ "채팅": chatUnreadCount }}
      onTabChange={handleTabChange}
    />
  );
};

export default AltBoardView;
