import { useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm } from "types/altForm";
import { TBoard } from "types/board";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { objectDownloadAsJson } from "functions/functions";
import Button from "components/button/Button";
import AltSubmissionTracker from "./AltSubmissionTracker";
import CombinationGenerator from "./CombinationGenerator";

type Props = {
  board: TBoard;
  forms: TAltForm[];
  isLoading: boolean;
  canManage: boolean;
  onFormClick: (form: TAltForm) => void;
  onCreateForm: () => void;
  onRefresh: () => void;
};

const AltFormList = ({
  board,
  forms,
  isLoading,
  canManage,
  onFormClick,
  onCreateForm,
  onRefresh,
}: Props) => {
  const { AltFormAPI } = useAPIv2();

  const [trackerForm, setTrackerForm] = useState<TAltForm | null>(null);
  const [comboForm, setComboForm] = useState<TAltForm | null>(null);
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
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button
            type="ghost"
            onClick={onCreateForm}
            style={{ padding: "4px 10px", fontSize: "12px" }}
          >
            + 새 양식 만들기
          </Button>
          <Button
            type="ghost"
            onClick={() => importRef.current?.click()}
            style={{ padding: "4px 10px", fontSize: "12px" }}
          >
            JSON 가져오기
          </Button>
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
                <span>{form.fields.length}개 항목</span>
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
            {canManage && (
              <div
                className={style.formCardRight}
                style={{ position: "relative" }}
              >
                <Button
                  type="ghost"
                  onClick={() => setTrackerForm(form)}
                  style={{ padding: "4px 10px", fontSize: "12px" }}
                >
                  제출현황
                </Button>
                <div style={{ position: "relative" }}>
                  <Button
                    type="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setActionMenu(
                        actionMenu === form._id ? null : form._id
                      );
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "16px",
                      lineHeight: 1,
                    }}
                  >
                    ⋮
                  </Button>
                  {actionMenu === form._id && (
                    <div className={style.formActionMenu}>
                      <div
                        className={style.formActionItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(form._id);
                        }}
                      >
                        JSON 내보내기
                      </div>
                      <div
                        className={style.formActionItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(form._id);
                        }}
                      >
                        복제
                      </div>
                      {hasPreRegFields(form) && (
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 제출 현황 팝업 */}
      {trackerForm && (
        <AltSubmissionTracker
          form={trackerForm}
          onClose={() => setTrackerForm(null)}
        />
      )}

      {/* 조합 생성기 팝업 */}
      {comboForm && (
        <CombinationGenerator
          form={comboForm}
          onClose={() => setComboForm(null)}
          onGenerated={onRefresh}
        />
      )}
    </div>
  );
};

export default AltFormList;
