import { useState, useEffect } from "react";
import { TBoard, TAltBoardRole } from "types/board";
import { TAltForm } from "types/altForm";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
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

  const loadForms = () => {
    setIsLoading(true);
    AltFormAPI.RAltForms({ query: { board: board._id } })
      .then(({ forms }) => {
        setForms(forms);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadForms();
  }, [board._id]);

  // Form builder 열기
  const handleOpenBuilder = (formId?: string) => {
    setBuilderFormId(formId || "new");
    setRendererFormId(null);
  };

  // Form renderer 열기
  const handleOpenRenderer = (formId: string) => {
    setRendererFormId(formId);
    setBuilderFormId(null);
  };

  // 빌더/렌더러에서 목록으로 복귀
  const handleBackToList = () => {
    setBuilderFormId(null);
    setRendererFormId(null);
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
              onCreateForm={() => handleOpenBuilder()}
              onRefresh={loadForms}
            />
          </div>
        ),
        "기록": (
          <div style={{ paddingTop: 20 }}>
            <AltSheetView
              board={board}
              forms={forms}
              canManage={canManage}
            />
          </div>
        ),
      }}
      align="center"
    />
  );
};

export default AltBoardView;
