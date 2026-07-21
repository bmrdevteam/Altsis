import { useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm } from "types/altForm";
import { TBoard } from "types/board";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { objectDownloadAsJson } from "functions/functions";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import CombinationGenerator from "./CombinationGenerator";

type Props = {
  board: TBoard;
  forms: TAltForm[];
  isLoading: boolean;
  canManage: boolean;
  onFormClick: (form: TAltForm) => void;
  onRespondForm?: (formId: string) => void;
  onCreateForm: () => void;
  onRefresh: () => void;
  onCopyFormLink?: (formId: string) => void;
};

const AltFormList = ({
  board,
  forms,
  isLoading,
  canManage,
  onFormClick,
  onRespondForm,
  onCreateForm,
  onRefresh,
  onCopyFormLink,
}: Props) => {
  const { AltFormAPI } = useAPIv2();

  const [comboForm, setComboForm] = useState<TAltForm | null>(null);
  const [deleteForm, setDeleteForm] = useState<TAltForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  if (isLoading) return null;

  const getFormStatus = (form: TAltForm) => {
    const now = new Date();
    if (form.settings.closeAt && new Date(form.settings.closeAt) < now) {
      return { label: "마감", className: style.badgeClosed };
    }
    if (form.settings.openAt && new Date(form.settings.openAt) > now) {
      return { label: "예정", className: style.badgeClosed };
    }
    return { label: "진행중", className: style.badgeOpen };
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  // 내보내기
  const handleExport = async (formId: string) => {
    try {
      const { formData } = await AltFormAPI.ExportAltForm({
        params: { _id: formId },
      });
      objectDownloadAsJson(formData);
    } catch (err) {
      ALERT_ERROR(err);
    }
    setActionMenu(null);
  };

  // 가져오기
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const formData = JSON.parse(text);
      await AltFormAPI.ImportAltForm({
        data: { board: board._id, formData },
      });
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
    if (importRef.current) importRef.current.value = "";
  };

  // 복제
  const handleDuplicate = async (formId: string) => {
    try {
      await AltFormAPI.DuplicateAltForm({ params: { _id: formId } });
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
    setActionMenu(null);
  };

  // 삭제
  const handleDeleteConfirm = async () => {
    if (!deleteForm) return;
    setIsDeleting(true);
    try {
      await AltFormAPI.DAltForm({ params: { _id: deleteForm._id } });
      setDeleteForm(null);
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // 사전 등록 필드가 2개 이상인지 확인
  const hasPreRegFields = (form: TAltForm) =>
    form.fields.filter(
      (f) =>
        f.duplicateCheck?.enabled &&
        f.duplicateCheck.mode === "preRegistration"
    ).length >= 1;

  return (
    <div className={style.formList}>
      {canManage && (
        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
          <button
            type="button"
            className={style.formCardIconBtn}
            title="새 양식 만들기"
            onClick={onCreateForm}
          >
            <Svg type="plus" width="20px" height="20px" />
          </button>
          <button
            type="button"
            className={style.formCardIconBtn}
            title="JSON 가져오기"
            onClick={() => importRef.current?.click()}
          >
            <Svg type="upload" width="20px" height="20px" />
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImport}
          />
        </div>
      )}

      {forms.length === 0 && !canManage && (
        <div className={style.emptyState}>등록된 양식이 없습니다.</div>
      )}

      {forms.map((form) => {
        const status = getFormStatus(form);
        return (
          <div key={form._id} className={style.formCard}>
            <div
              className={style.formCardLeft}
              onClick={() => onFormClick(form)}
            >
              <div className={style.formCardTitle}>{form.title}</div>
              <div className={style.formCardMeta}>
                <span
                  className={`${style.formCardBadge} ${status.className}`}
                >
                  {status.label}
                </span>
                <span>
                  {form.fields.filter((f) => f.type !== "content").length}개
                  항목
                </span>
                <span>{formatDate(form.createdAt)}</span>
                {form.settings.closeAt && (
                  <span>마감: {formatDate(form.settings.closeAt)}</span>
                )}
                {form.settings.quizMode && (
                  <span
                    className={`${style.formCardBadge}`}
                    style={{
                      background: "var(--status-info-bg)",
                      color: "var(--status-info)",
                    }}
                  >
                    퀴즈
                  </span>
                )}
                {form.settings.directInputMode && (
                  <span
                    className={`${style.formCardBadge}`}
                    style={{
                      background: "var(--status-warning-bg)",
                      color: "var(--status-warning)",
                    }}
                  >
                    직접입력
                  </span>
                )}
              </div>
            </div>
            <div
              className={style.formCardRight}
              style={{ position: "relative" }}
            >
              {onCopyFormLink && (
                <button
                  type="button"
                  className={style.formCardIconBtn}
                  title="링크 복사"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyFormLink(form._id);
                  }}
                >
                  <Svg type="link" width="20px" height="20px" />
                </button>
              )}
              {canManage && onRespondForm && (
                <button
                  type="button"
                  className={style.formCardIconBtn}
                  title="응답하기"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRespondForm(form._id);
                  }}
                >
                  <Svg type="edit" width="20px" height="20px" />
                </button>
              )}
              {canManage && (
                <>
                  <button
                    type="button"
                    className={style.formCardIconBtn}
                    title="JSON 내보내기"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(form._id);
                    }}
                  >
                    <Svg type="download" width="20px" height="20px" />
                  </button>
                  <button
                    type="button"
                    className={style.formCardIconBtn}
                    title="복제"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(form._id);
                    }}
                  >
                    <Svg type="copy" width="20px" height="20px" />
                  </button>
                  <button
                    type="button"
                    className={`${style.formCardIconBtn} ${style.formCardIconBtnDanger}`}
                    title="삭제"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteForm(form);
                    }}
                  >
                    <Svg type="trash" width="20px" height="20px" />
                  </button>
                  {hasPreRegFields(form) && (
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        className={style.formCardIconBtn}
                        title="더보기"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenu(
                            actionMenu === form._id ? null : form._id
                          );
                        }}
                      >
                        <Svg type="verticalDots" width="20px" height="20px" />
                      </button>
                      {actionMenu === form._id && (
                        <div className={style.formActionMenu}>
                          <div
                            className={style.formActionItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              setComboForm(form);
                              setActionMenu(null);
                            }}
                          >
                            조합 생성
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* 조합 생성기 팝업 */}
      {comboForm && (
        <CombinationGenerator
          form={comboForm}
          onClose={() => setComboForm(null)}
          onGenerated={onRefresh}
        />
      )}

      {/* 삭제 확인 팝업 */}
      {deleteForm && (
        <Popup
          title="양식 삭제"
          setState={(v: boolean) => {
            if (!v && !isDeleting) setDeleteForm(null);
          }}
          closeBtn={!isDeleting}
          style={{ maxWidth: "420px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <Button
                type="ghost"
                onClick={() => setDeleteForm(null)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{ color: "var(--status-error)" }}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
            <strong>{deleteForm.title}</strong> 양식을 삭제하시겠습니까?
            <br />
            모든 응답 데이터도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.
          </div>
        </Popup>
      )}
    </div>
  );
};

export default AltFormList;
