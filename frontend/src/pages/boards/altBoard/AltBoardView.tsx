import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
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

type Props = {
  board: TBoard;
};

const AltBoardView = ({ board }: Props) => {
  const { currentUser } = useAuth();
  const { AltFormAPI } = useAPIv2();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefix = useAppPrefix();

  const [forms, setForms] = useState<TAltForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 현재 유저의 Alt Board 역할
  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (currentUser.auth === "admin") return "admin";
    if (board.creator === currentUser._id) return "admin";
    return (board.altBoardRole?.[currentUser._id] as TAltBoardRole) || null;
  })();

  const canManage = myRole === "admin" || myRole === "writer";

  // Form builder/renderer 상태
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [rendererFormId, setRendererFormId] = useState<string | null>(null);

  // URL search params
  const urlFormId = searchParams.get("form");
  const urlSheetId = searchParams.get("sheet");
  const urlMode = searchParams.get("mode"); // "respond" | "edit" | null

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

  // URL → State 동기화: ?form=<id>&mode=<respond|edit> 처리
  useEffect(() => {
    if (isLoading || !urlFormId) return;

    if (urlFormId === "new" && canManage) {
      setBuilderFormId("new");
      setRendererFormId(null);
      return;
    }

    const formExists = forms.some((f) => f._id === urlFormId);
    if (formExists) {
      if (urlMode === "respond") {
        // 명시적 응답 모드
        setRendererFormId(urlFormId);
        setBuilderFormId(null);
      } else if (canManage) {
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

  // 탭 전환 시 관련 없는 파라미터 정리
  useEffect(() => {
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
  }, [location.hash]);

  // Form builder 열기
  const handleOpenBuilder = (formId?: string) => {
    const id = formId || "new";
    setBuilderFormId(id);
    setRendererFormId(null);
    setSearchParams({ form: id, mode: "edit" }, { replace: true });
  };

  // Form renderer 열기
  const handleOpenRenderer = (formId: string) => {
    setRendererFormId(formId);
    setBuilderFormId(null);
    setSearchParams({ form: formId, mode: "respond" }, { replace: true });
  };

  // 빌더/렌더러에서 목록으로 복귀
  const handleBackToList = () => {
    setBuilderFormId(null);
    setRendererFormId(null);
    setSearchParams({}, { replace: true });
    loadForms();
  };

  // Form 클릭 핸들러
  const handleFormClick = (form: TAltForm) => {
    if (canManage) {
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
                setSearchParams({ sheet: formId }, { replace: true });
              }}
              onFormDeselect={() => {
                setSearchParams(
                  (prev) => {
                    prev.delete("sheet");
                    return prev;
                  },
                  { replace: true }
                );
              }}
              onCopySheetLink={handleCopySheetLink}
            />
          </div>
        ),
      }}
      align="center"
      defaultTab={urlSheetId ? "기록" : undefined}
    />
  );
};

export default AltBoardView;
