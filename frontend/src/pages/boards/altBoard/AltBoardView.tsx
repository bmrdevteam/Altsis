import { useState, useEffect } from "react";
import style from "./altBoard.module.scss";
import { TBoard, TAltBoardRole } from "types/board";
import { TAltForm } from "types/altForm";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import AltFormList from "./AltFormList";
import AltFormBuilder from "./AltFormBuilder";
import AltFormRenderer from "./AltFormRenderer";
import AltSheetView from "./AltSheetView";

type Tab = "forms" | "sheet" | "docs";

type Props = {
  board: TBoard;
};

const AltBoardView = ({ board }: Props) => {
  const { currentUser } = useAuth();
  const { AltFormAPI } = useAPIv2();

  const [activeTab, setActiveTab] = useState<Tab>("forms");
  const [forms, setForms] = useState<TAltForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 현재 유저의 Alt Board 역할
  const myRole: TAltBoardRole | null = (() => {
    if (!currentUser) return null;
    if (
      currentUser.auth === "admin" ||
      currentUser.auth === "manager"
    )
      return "admin";
    if (board.creator === currentUser._id) return "admin";
    return (board.altBoardRole?.[currentUser.userId] as TAltBoardRole) || null;
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "forms", label: "양식" },
    { key: "sheet", label: "시트" },
    { key: "docs", label: "문서" },
  ];

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className={style.tabContainer}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${style.tab} ${activeTab === t.key ? style.tabActive : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "forms" && (
        <AltFormList
          forms={forms}
          isLoading={isLoading}
          canManage={canManage}
          onFormClick={handleFormClick}
          onCreateForm={() => handleOpenBuilder()}
        />
      )}

      {activeTab === "sheet" && (
        <AltSheetView
          board={board}
          forms={forms}
          canManage={canManage}
        />
      )}

      {activeTab === "docs" && (
        <div className={style.emptyState}>
          문서 기능은 게시글 작성 시 병합 태그를 사용하여 이용할 수 있습니다.
        </div>
      )}
    </div>
  );
};

export default AltBoardView;
