import { useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm } from "types/altForm";
import { TAltBoardRole, TBoard } from "types/board";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { objectDownloadAsJson } from "functions/functions";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import CombinationGenerator from "./CombinationGenerator";
import PendingApprovalsPanel from "./PendingApprovalsPanel";

type Props = {
  board: TBoard;
  forms: TAltForm[];
  isLoading: boolean;
  /** null이면 Alt Board 멤버가 아님 — 목록·통계 비표시 */
  myRole: TAltBoardRole | null;
  canManage: boolean;
  /** 양식 빌더 열기 가능 여부 */
  canModifyForm: (form: TAltForm) => boolean;
  onFormClick: (form: TAltForm) => void;
  onRespondForm: (formId: string) => void;
  onViewMyResponses?: (formId: string) => void;
  onOpenSheet?: (formId: string) => void;
  onCreateForm: () => void;
  onRefresh: () => void;
  onCopyFormLink?: (formId: string) => void;
  /** 알림 딥링크: 승인 대기 행 자동 열기 */
  openApprovalRowId?: string | null;
};

type PeriodKind = "open" | "scheduled" | "closed";

const getPeriodKind = (form: TAltForm): PeriodKind => {
  const now = new Date();
  if (form.settings.closeAt && new Date(form.settings.closeAt) < now) {
    return "closed";
  }
  if (form.settings.openAt && new Date(form.settings.openAt) > now) {
    return "scheduled";
  }
  return "open";
};

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** 마감일 기준 D-day / 오늘 마감 문구 */
const getDeadlineHint = (form: TAltForm): string | null => {
  if (!form.settings.closeAt) return null;
  const close = new Date(form.settings.closeAt);
  const now = new Date();
  if (close < now) return null;

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfClose = new Date(
    close.getFullYear(),
    close.getMonth(),
    close.getDate()
  );
  const diffDays = Math.round(
    (startOfClose.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays === 0) return "오늘 마감";
  if (diffDays > 0 && diffDays <= 7) return `D-${diffDays}`;
  return null;
};

const submitSortRank = (form: TAltForm): number => {
  const period = getPeriodKind(form);
  const submitted = !!form.mySubmitted;
  if (!submitted && period === "open") return 0;
  if (period === "scheduled") return 1;
  if (submitted && period !== "closed") return 2;
  return 3; // closed
};

const AltFormList = ({
  board,
  forms,
  isLoading,
  myRole,
  canManage,
  canModifyForm,
  onFormClick,
  onRespondForm,
  onViewMyResponses,
  onOpenSheet,
  onCreateForm,
  onRefresh,
  onCopyFormLink,
  openApprovalRowId,
}: Props) => {
  const { AltFormAPI } = useAPIv2();

  const [comboForm, setComboForm] = useState<TAltForm | null>(null);
  const [deleteForm, setDeleteForm] = useState<TAltForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /** 제출형 활동 (통계·정렬용) */
  const submitForms = useMemo(() => {
    if (!myRole) return [];
    return forms.filter((f) => !f.settings.directInputMode);
  }, [forms, myRole]);

  /** 단일 활동 목록: 멤버는 제출형만, 관리자는 전체(직접입력 포함) */
  const activityForms = useMemo(() => {
    if (!myRole) return [];
    const list = (canManage ? forms : submitForms).slice();
    return list.sort((a, b) => {
      const aDirect = a.settings.directInputMode ? 1 : 0;
      const bDirect = b.settings.directInputMode ? 1 : 0;
      if (aDirect !== bDirect) return aDirect - bDirect;
      return submitSortRank(a) - submitSortRank(b);
    });
  }, [forms, myRole, canManage, submitForms]);

  const submitStats = useMemo(() => {
    let pending = 0;
    let done = 0;
    let scheduled = 0;
    let closed = 0;
    for (const f of submitForms) {
      const period = getPeriodKind(f);
      if (period === "closed") closed += 1;
      else if (period === "scheduled") scheduled += 1;
      else if (f.mySubmitted) done += 1;
      else pending += 1;
    }
    return {
      total: submitForms.length,
      pending,
      done,
      scheduled,
      closed,
    };
  }, [submitForms]);

  const manageStats = useMemo(() => {
    if (!canManage) return null;
    let responseSum = 0;
    for (const f of forms) {
      responseSum += f.responseCount ?? 0;
    }
    return {
      total: forms.length,
      responseSum,
    };
  }, [canManage, forms]);

  if (isLoading) return null;

  if (!myRole) {
    return (
      <div className={style.emptyState}>
        이 보드의 활동에 접근할 권한이 없습니다.
      </div>
    );
  }

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

  const handleDuplicate = async (formId: string) => {
    try {
      await AltFormAPI.DuplicateAltForm({ params: { _id: formId } });
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
    setActionMenu(null);
  };

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

  const hasPreRegFields = (form: TAltForm) =>
    form.fields.filter(
      (f) =>
        f.duplicateCheck?.enabled &&
        f.duplicateCheck.mode === "preRegistration"
    ).length >= 1;

  const renderSubmitBadge = (form: TAltForm) => {
    if (form.isDraft) {
      return (
        <span className={`${style.formCardBadge} ${style.badgePending}`}>
          비공개
        </span>
      );
    }
    if (form.settings.directInputMode) {
      return (
        <span
          className={style.formCardBadge}
          style={{
            background: "var(--status-warning-bg)",
            color: "var(--status-warning)",
          }}
        >
          직접입력
        </span>
      );
    }
    const period = getPeriodKind(form);
    if (period === "closed") {
      return (
        <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
          마감
        </span>
      );
    }
    if (period === "scheduled") {
      return (
        <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
          예정
        </span>
      );
    }
    if (form.mySubmitted) {
      return (
        <span className={`${style.formCardBadge} ${style.badgeSubmitted}`}>
          제출완료
        </span>
      );
    }
    return (
      <span className={`${style.formCardBadge} ${style.badgePending}`}>
        미제출
      </span>
    );
  };

  const handleCardActivate = (form: TAltForm) => {
    if (form.isDraft) {
      if (canModifyForm(form)) onFormClick(form);
      return;
    }
    if (form.settings.directInputMode) {
      if (onOpenSheet) onOpenSheet(form._id);
      else if (canModifyForm(form)) onFormClick(form);
      return;
    }
    onRespondForm(form._id);
  };

  const renderActivityCard = (form: TAltForm) => {
    const deadlineHint = getDeadlineHint(form);
    const period = getPeriodKind(form);
    const isDirect = !!form.settings.directInputMode;
    const canEditForm = canModifyForm(form);
    const showRespond = !isDirect && !form.isDraft;
    const showMyResponses =
      !isDirect &&
      !!form.mySubmitted &&
      form.settings.showOwnResponse !== false &&
      !!onViewMyResponses;
    const showSheet = !!onOpenSheet;
    const showManageMenu = canManage;

    const count = form.responseCount ?? 0;
    const countLabel = form.settings.allowMultipleResponses
      ? `응답 ${count}건`
      : `제출 ${count}명`;

    return (
      <div
        key={form._id}
        className={`${style.formCard} ${
          actionMenu === form._id ? style.formCardMenuOpen : ""
        }`}
        onClick={() => handleCardActivate(form)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardActivate(form);
          }
        }}
      >
        <div className={style.formCardLeft}>
          <div className={style.formCardTitle}>{form.title}</div>
          <div className={style.formCardMeta}>
            {renderSubmitBadge(form)}
            {canManage && !isDirect && (
              <span className={style.responseCount}>{countLabel}</span>
            )}
            {form.settings.openAt && period === "scheduled" && (
              <span>시작: {formatDateTime(form.settings.openAt)}</span>
            )}
            {form.settings.closeAt && (
              <span
                className={
                  deadlineHint === "오늘 마감" ? style.deadlineUrgent : undefined
                }
              >
                마감: {formatDateTime(form.settings.closeAt)}
                {deadlineHint ? ` · ${deadlineHint}` : ""}
              </span>
            )}
            {form.mySubmitted &&
              form.settings.allowMultipleResponses &&
              period === "open" &&
              !isDirect && (
                <span className={style.formCardHint}>추가 제출 가능</span>
              )}
            {form.settings.quizMode && (
              <span
                className={style.formCardBadge}
                style={{
                  background: "var(--status-info-bg)",
                  color: "var(--status-info)",
                }}
              >
                퀴즈
              </span>
            )}
          </div>
        </div>
        <div className={style.formCardRight} style={{ position: "relative" }}>
          {showMyResponses && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="내 응답 보기"
              onClick={(e) => {
                e.stopPropagation();
                onViewMyResponses!(form._id);
              }}
            >
              <Svg type="article" width="20px" height="20px" />
            </button>
          )}
          {showRespond && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="작성"
              onClick={(e) => {
                e.stopPropagation();
                onRespondForm(form._id);
              }}
            >
              <Svg type="edit" width="20px" height="20px" />
            </button>
          )}
          {canEditForm && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="양식"
              onClick={(e) => {
                e.stopPropagation();
                onFormClick(form);
              }}
            >
              <Svg type="editNote" width="20px" height="20px" />
            </button>
          )}
          {showSheet && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="기록"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSheet!(form._id);
              }}
            >
              <Svg type="table" width="20px" height="20px" />
            </button>
          )}
          {showManageMenu && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="더보기"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenu(actionMenu === form._id ? null : form._id);
                }}
              >
                <Svg type="verticalDots" width="20px" height="20px" />
              </button>
              {actionMenu === form._id && (
                <div className={style.formActionMenu}>
                  {onCopyFormLink && (
                    <div
                      className={style.formActionItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyFormLink(form._id);
                        setActionMenu(null);
                      }}
                    >
                      <Svg type="link" width="16px" height="16px" />
                      링크 복사
                    </div>
                  )}
                  <div
                    className={style.formActionItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(form._id);
                    }}
                  >
                    <Svg type="download" width="16px" height="16px" />
                    JSON 내보내기
                  </div>
                  <div
                    className={style.formActionItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(form._id);
                    }}
                  >
                    <Svg type="copy" width="16px" height="16px" />
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
                      <Svg type="grid" width="16px" height="16px" />
                      조합 생성
                    </div>
                  )}
                  {form.isDraft ? (
                    <>
                      <div
                        className={style.formActionItem}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setActionMenu(null);
                          try {
                            await AltFormAPI.UAltForm({
                              params: { _id: form._id },
                              data: { isDraft: false },
                            });
                            onRefresh();
                          } catch (err) {
                            ALERT_ERROR(err);
                          }
                        }}
                      >
                        <Svg type="unarchive" width="16px" height="16px" />
                        공개
                      </div>
                      <div
                        className={`${style.formActionItem} ${style.formActionItemDanger}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteForm(form);
                          setActionMenu(null);
                        }}
                      >
                        <Svg type="trash" width="16px" height="16px" />
                        삭제
                      </div>
                    </>
                  ) : (
                    <div
                      className={style.formActionItem}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setActionMenu(null);
                        try {
                          await AltFormAPI.UAltForm({
                            params: { _id: form._id },
                            data: { isDraft: true },
                          });
                          onRefresh();
                        } catch (err) {
                          ALERT_ERROR(err);
                        }
                      }}
                    >
                      <Svg type="archive" width="16px" height="16px" />
                      비공개로
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={style.formList}>
      <PendingApprovalsPanel
        boardId={board._id}
        openRowId={openApprovalRowId}
        onOpenHandled={() => {
          // URL에서 approval 파라미터만 제거 (탭·해시 유지)
          if (typeof window === "undefined") return;
          const url = new URL(window.location.href);
          if (!url.searchParams.has("approval")) return;
          url.searchParams.delete("approval");
          window.history.replaceState(
            null,
            "",
            url.pathname + url.search + url.hash
          );
        }}
      />
      <section className={style.formSectionPanel}>
        <div className={style.formSectionHeaderStatic}>
          <div className={style.formSectionHeaderMain}>
            <h3 className={style.formSectionTitle}>활동</h3>
            <span className={style.formSectionCount}>
              {activityForms.length}
            </span>
          </div>
          <div className={style.formSectionStats}>
            <span>
              미제출 <strong>{submitStats.pending}</strong>
            </span>
            <span>
              제출완료 <strong>{submitStats.done}</strong>
            </span>
            {submitStats.scheduled > 0 && (
              <span>
                예정 <strong>{submitStats.scheduled}</strong>
              </span>
            )}
            {submitStats.closed > 0 && (
              <span>
                마감 <strong>{submitStats.closed}</strong>
              </span>
            )}
            {manageStats && (
              <span>
                총 응답 <strong>{manageStats.responseSum}</strong>
              </span>
            )}
          </div>
          {canManage && (
            <div className={style.formListToolbar}>
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
        </div>
        <div className={style.formSectionBody}>
          {activityForms.length === 0 ? (
            <div className={style.emptyState}>활동이 없습니다.</div>
          ) : (
            <div className={style.formCardList}>
              {activityForms.map(renderActivityCard)}
            </div>
          )}
        </div>
      </section>

      {comboForm && (
        <CombinationGenerator
          form={comboForm}
          onClose={() => setComboForm(null)}
          onGenerated={onRefresh}
        />
      )}

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
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--status-error-bg)",
                color: "var(--status-error)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              경고: 삭제하면 복구할 수 없습니다.
            </div>
            <strong>{deleteForm.title}</strong> 양식을 정말 삭제하시겠습니까?
            <br />
            <span style={{ color: "var(--text-color-2)", fontSize: 13 }}>
              연결된 응답·기록 데이터도 함께 삭제됩니다. 이 작업은 되돌릴 수
              없습니다.
            </span>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default AltFormList;
