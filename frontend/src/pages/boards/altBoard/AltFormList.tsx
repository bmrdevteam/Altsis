import { useMemo, useRef, useState } from "react";
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
  onRespondForm: (formId: string) => void;
  onCreateForm: () => void;
  onRefresh: () => void;
  onCopyFormLink?: (formId: string) => void;
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

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

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

  const submitForms = useMemo(() => {
    return forms
      .filter((f) => !f.settings.directInputMode)
      .slice()
      .sort((a, b) => submitSortRank(a) - submitSortRank(b));
  }, [forms]);

  const manageForms = useMemo(() => (canManage ? forms : []), [canManage, forms]);

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
    let open = 0;
    let scheduled = 0;
    let closed = 0;
    let responseSum = 0;
    for (const f of manageForms) {
      const period = getPeriodKind(f);
      if (period === "closed") closed += 1;
      else if (period === "scheduled") scheduled += 1;
      else open += 1;
      responseSum += f.responseCount ?? 0;
    }
    return {
      total: manageForms.length,
      open,
      scheduled,
      closed,
      responseSum,
    };
  }, [manageForms]);

  const [submitOpen, setSubmitOpen] = useState(true);
  const [manageOpen, setManageOpen] = useState(true);

  if (isLoading) return null;

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

  const renderSubmitCard = (form: TAltForm) => {
    const deadlineHint = getDeadlineHint(form);
    const period = getPeriodKind(form);

    return (
      <div
        key={`submit-${form._id}`}
        className={style.formCard}
        onClick={() => onRespondForm(form._id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRespondForm(form._id);
          }
        }}
      >
        <div className={style.formCardLeft}>
          <div className={style.formCardTitle}>{form.title}</div>
          <div className={style.formCardMeta}>
            {renderSubmitBadge(form)}
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
              period === "open" && (
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
        <div className={style.formCardRight}>
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
        </div>
      </div>
    );
  };

  const renderManageCard = (form: TAltForm) => {
    const period = getPeriodKind(form);
    const periodLabel =
      period === "closed" ? "마감" : period === "scheduled" ? "예정" : "진행중";
    const count = form.responseCount ?? 0;
    const countLabel = form.settings.allowMultipleResponses
      ? `응답 ${count}건`
      : `제출 ${count}명`;

    return (
      <div
        key={`manage-${form._id}`}
        className={style.formCard}
        onClick={() => onFormClick(form)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFormClick(form);
          }
        }}
      >
        <div className={style.formCardLeft}>
          <div className={style.formCardTitle}>{form.title}</div>
          <div className={style.formCardMeta}>
            <span
              className={`${style.formCardBadge} ${
                period === "open" ? style.badgeOpen : style.badgeClosed
              }`}
            >
              {periodLabel}
            </span>
            <span className={style.responseCount}>{countLabel}</span>
            <span>
              {form.fields.filter((f) => f.type !== "content").length}개 항목
            </span>
            <span>{formatDate(form.createdAt)}</span>
            {form.settings.closeAt && (
              <span>마감: {formatDate(form.settings.closeAt)}</span>
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
            {form.settings.directInputMode && (
              <span
                className={style.formCardBadge}
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
        <div className={style.formCardRight} style={{ position: "relative" }}>
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
          {!form.settings.directInputMode && (
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
                  setActionMenu(actionMenu === form._id ? null : form._id);
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
        </div>
      </div>
    );
  };

  return (
    <div className={style.formList}>
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

      <section className={style.formSectionPanel}>
        <button
          type="button"
          className={style.formSectionHeader}
          onClick={() => setSubmitOpen((v) => !v)}
          aria-expanded={submitOpen}
        >
          <div className={style.formSectionHeaderMain}>
            <Svg
              type={submitOpen ? "chevronDown" : "chevronRight"}
              width="18px"
              height="18px"
            />
            <h3 className={style.formSectionTitle}>제출할 양식</h3>
            <span className={style.formSectionCount}>
              {submitStats.total}
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
          </div>
        </button>
        {submitOpen && (
          <div className={style.formSectionBody}>
            {submitForms.length === 0 ? (
              <div className={style.emptyState}>제출할 양식이 없습니다.</div>
            ) : (
              <div className={style.formCardList}>
                {submitForms.map(renderSubmitCard)}
              </div>
            )}
          </div>
        )}
      </section>

      {canManage && (
        <section className={style.formSectionPanel}>
          <button
            type="button"
            className={style.formSectionHeader}
            onClick={() => setManageOpen((v) => !v)}
            aria-expanded={manageOpen}
          >
            <div className={style.formSectionHeaderMain}>
              <Svg
                type={manageOpen ? "chevronDown" : "chevronRight"}
                width="18px"
                height="18px"
              />
              <h3 className={style.formSectionTitle}>관리 양식</h3>
              <span className={style.formSectionCount}>
                {manageStats.total}
              </span>
            </div>
            <div className={style.formSectionStats}>
              <span>
                진행중 <strong>{manageStats.open}</strong>
              </span>
              {manageStats.scheduled > 0 && (
                <span>
                  예정 <strong>{manageStats.scheduled}</strong>
                </span>
              )}
              {manageStats.closed > 0 && (
                <span>
                  마감 <strong>{manageStats.closed}</strong>
                </span>
              )}
              <span>
                총 응답 <strong>{manageStats.responseSum}</strong>
              </span>
            </div>
          </button>
          {manageOpen && (
            <div className={style.formSectionBody}>
              {manageForms.length === 0 ? (
                <div className={style.emptyState}>등록된 양식이 없습니다.</div>
              ) : (
                <div className={style.formCardList}>
                  {manageForms.map(renderManageCard)}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {!canManage && forms.length === 0 && (
        <div className={style.emptyState}>등록된 양식이 없습니다.</div>
      )}

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
