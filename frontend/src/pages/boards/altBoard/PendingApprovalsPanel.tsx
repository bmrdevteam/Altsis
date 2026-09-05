import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import style from "./altBoard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import { MarkdownViewer, MarkdownWysiwygView } from "components/markdown";
import { isCurrentApprover, normalizeApprovalValue } from "utils/approvalLine";
import { TApprovalLine } from "types/altForm";
import ApprovalProgressBlock from "./ApprovalProgressBlock";
import { fileAnswerLabel } from "./formDocLink";
import FilePreviewModal from "./FilePreviewModal";
import FormFileAnswerList from "./FormFileAnswerList";
import { TFormFileRef } from "./formFilePreview";
import { formatAiChatCell } from "./formAiChat";
import { formatReadableValue } from "./formFieldDisplay";
import { composeApprovalCardTitle } from "./sheetApprovalList";

type FieldMeta = {
  _id: string;
  label: string;
  type: string;
  content?: string;
  approvalLine?: TApprovalLine;
};

type PendingItem = {
  rowId: string;
  formId: string;
  formTitle: string;
  fieldId: string;
  fieldLabel: string;
  stepLabel?: string;
  respondentName?: string;
  respondentId?: string;
  currentApproverName?: string;
  currentApproverId?: string;
  currentStep?: number;
  totalSteps?: number;
  submittedAt?: string;
  approval?: any;
  rowData?: Record<string, any>;
  fields?: FieldMeta[];
};

type ActiveKind = "approve" | "outgoing";

type Props = {
  boardId: string;
  canDeleteAnyRow?: boolean;
  onCountChange?: (count: number) => void;
  /** 첫 조회(또는 board 변경 후 조회) 완료 — 레이아웃 밀림 방지용 */
  onSettled?: () => void;
  /** 알림 딥링크 등으로 특정 행을 바로 열기 */
  openRowId?: string | null;
  onOpenHandled?: () => void;
  /** 할 일·승인 카드 키워드 필터 (제목·응답자) */
  keyword?: string;
  /** 상태 칩 선택 시 할 일 UI만 숨김 (데이터·뱃지 로드는 유지) */
  hidden?: boolean;
  /** 키워드 적용 후 결재/승인진행 건수 (할 일 칩용) */
  onVisibleTodoCounts?: (counts: {
    approve: number;
    outgoing: number;
  }) => void;
  /** 할 일 섹션: 채점 대기 카드들 (승인 다음·미제출 앞) */
  gradeCards?: ReactNode;
  gradeCount?: number;
  /** 할 일 섹션 하단: 미제출 카드들 */
  unsubmittedCards?: ReactNode;
  unsubmittedCount?: number;
};

const pendingItemCardTitle = (item: PendingItem) =>
  composeApprovalCardTitle(item.formTitle, item.rowData, item.fields);

const pendingMatchesKeyword = (item: PendingItem, keyword: string) => {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  return (
    pendingItemCardTitle(item).toLowerCase().includes(kw) ||
    (item.respondentName || "").toLowerCase().includes(kw) ||
    (item.respondentId || "").toLowerCase().includes(kw) ||
    (item.stepLabel || "").toLowerCase().includes(kw) ||
    (item.fieldLabel || "").toLowerCase().includes(kw) ||
    (item.currentApproverName || "").toLowerCase().includes(kw) ||
    (item.currentApproverId || "").toLowerCase().includes(kw)
  );
};

const formatSubmittedAt = (iso?: string) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** 승인 대기 팝업용 — JSON이 아닌 읽기 쉬운 표시 */
const formatFieldDisplay = (value: any, field?: FieldMeta): string => {
  if (value === null || value === undefined || value === "") return "-";

  if (field?.type === "userSelect" && typeof value === "object") {
    return value.userName
      ? `${value.userName}${value.userId ? `(${value.userId})` : ""}`
      : "-";
  }

  if (field?.type === "date" && typeof value === "string") {
    const d = new Date(value + "T00:00:00");
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      });
    }
  }

  if (field?.type === "multiDate" && Array.isArray(value)) {
    const thisYear = new Date().getFullYear();
    return (
      value
        .map((v: string) => {
          const d = new Date(v + "T00:00:00");
          if (!isNaN(d.getTime())) {
            const opts: Intl.DateTimeFormatOptions = {
              month: "2-digit",
              day: "2-digit",
              weekday: "short",
            };
            if (d.getFullYear() !== thisYear) opts.year = "numeric";
            return d.toLocaleDateString("ko-KR", opts);
          }
          return v;
        })
        .join(", ") || "-"
    );
  }

  if (field?.type === "link" && typeof value === "object" && value?.url) {
    return value.title || value.ogTitle || value.url;
  }

  if (field?.type === "file" && Array.isArray(value)) {
    return (
      value.map((item) => fileAnswerLabel(item)).filter(Boolean).join(", ") ||
      "-"
    );
  }

  if (field?.type === "rating") {
    return value ? `${"★".repeat(Number(value))}` : "-";
  }

  if (field?.type === "circulation") {
    return formatReadableValue(value) || "-";
  }

  if (field?.type === "checkbox" || field?.type === "multiSelect") {
    if (Array.isArray(value)) {
      return formatReadableValue(value) || "-";
    }
  }

  if (Array.isArray(value)) return formatReadableValue(value) || "-";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "object") {
    return formatReadableValue(value) || "-";
  }
  return String(value);
};

const PendingApprovalsPanel = ({
  boardId,
  canDeleteAnyRow = false,
  onCountChange,
  onSettled,
  openRowId,
  onOpenHandled,
  keyword = "",
  hidden = false,
  onVisibleTodoCounts,
  gradeCards,
  gradeCount = 0,
  unsubmittedCards,
  unsubmittedCount = 0,
}: Props) => {
  const { AltSheetRowAPI } = useAPIv2();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [outgoing, setOutgoing] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PendingItem | null>(null);
  const [activeKind, setActiveKind] = useState<ActiveKind>("approve");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState<TFormFileRef | null>(null);
  const openedRef = useRef<string | null>(null);
  const settledOnceRef = useRef(false);
  const loadGenRef = useRef(0);

  const openItem = (item: PendingItem, kind: ActiveKind) => {
    setActive(item);
    setActiveKind(kind);
    setReason("");
    setPreviewFile(null);
  };

  const load = async (opts?: { announceSettled?: boolean }) => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      const { items: list, outgoing: outList, count } =
        await AltSheetRowAPI.RAltSheetRowPendingApprovals({
          query: { board: boardId },
        });
      if (gen !== loadGenRef.current) return;
      setItems(list);
      setOutgoing(outList);
      onCountChange?.(count);
    } catch (err) {
      if (gen !== loadGenRef.current) return;
      ALERT_ERROR(err);
    } finally {
      if (gen !== loadGenRef.current) return;
      setLoading(false);
      if (opts?.announceSettled !== false && !settledOnceRef.current) {
        settledOnceRef.current = true;
        onSettled?.();
      }
    }
  };

  useEffect(() => {
    settledOnceRef.current = false;
    setItems([]);
    setOutgoing([]);
    setActive(null);
    load({ announceSettled: true });
  }, [boardId]);

  useEffect(() => {
    if (!openRowId) return;
    if (openedRef.current === openRowId) return;
    if (loading) return;
    const approveMatch = items.find(
      (i) => String(i.rowId) === String(openRowId)
    );
    if (approveMatch) {
      openedRef.current = openRowId;
      openItem(approveMatch, "approve");
      onOpenHandled?.();
      return;
    }
    const outgoingMatch = outgoing.find(
      (i) => String(i.rowId) === String(openRowId)
    );
    if (outgoingMatch) {
      openedRef.current = openRowId;
      openItem(outgoingMatch, "outgoing");
      onOpenHandled?.();
    }
  }, [openRowId, items, outgoing, loading, onOpenHandled]);

  const handleAction = async (status: "approved" | "rejected") => {
    if (!active || activeKind !== "approve") return;
    setBusy(true);
    try {
      await AltSheetRowAPI.UAltSheetRow({
        params: { _id: active.rowId },
        data: {
          data: {
            [active.fieldId]: { status, reason },
          },
        },
      });
      setActive(null);
      setReason("");
      await load();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setBusy(false);
    }
  };

  const visibleItems = useMemo(
    () => items.filter((item) => pendingMatchesKeyword(item, keyword)),
    [items, keyword]
  );
  const visibleOutgoing = useMemo(
    () => outgoing.filter((item) => pendingMatchesKeyword(item, keyword)),
    [outgoing, keyword]
  );

  useEffect(() => {
    onVisibleTodoCounts?.({
      approve: visibleItems.length,
      outgoing: visibleOutgoing.length,
    });
  }, [visibleItems.length, visibleOutgoing.length, onVisibleTodoCounts]);

  if (
    loading &&
    items.length === 0 &&
    outgoing.length === 0 &&
    gradeCount === 0 &&
    unsubmittedCount === 0
  ) {
    return null;
  }

  if (hidden) {
    return null;
  }

  const todoCount =
    visibleItems.length +
    visibleOutgoing.length +
    gradeCount +
    unsubmittedCount;
  const showTodoSection = todoCount > 0;
  const isReadonly = activeKind === "outgoing";

  const visibleFields = (active?.fields || []).filter(
    (f) => f.type !== "approval"
  );

  const renderFieldValue = (f: FieldMeta) => {
    const val = active?.rowData?.[f._id];

    if (f.type === "file") {
      const items = Array.isArray(val) ? val : [];
      return (
        <FormFileAnswerList items={items} onPreview={setPreviewFile} />
      );
    }

    if (f.type === "link" && val && typeof val === "object" && val.url) {
      return (
        <a
          href={val.url.startsWith("http") ? val.url : `https://${val.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className={style.uploadedFileLink}
        >
          {val.title || val.ogTitle || val.url}
        </a>
      );
    }

    if (f.type === "docResponse" && val) {
      return (
        <div className={style.contentFieldBody}>
          <MarkdownWysiwygView content={formatReadableValue(val)} />
        </div>
      );
    }

    if (f.type === "aiChat") {
      const label = formatAiChatCell(val);
      return label || (
        <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
          —
        </span>
      );
    }

    if (f.type === "content") {
      const md = f.content || val;
      if (!md) {
        return (
          <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
            —
          </span>
        );
      }
      return (
        <div className={style.contentFieldBody}>
          <MarkdownViewer content={String(md)} allowHtmlApp />
        </div>
      );
    }

    if (f.type === "textarea" && val) {
      const text = formatReadableValue(val) || (typeof val === "string" ? val : "");
      if (!text) {
        return (
          <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
            —
          </span>
        );
      }
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {text}
        </div>
      );
    }

    const display = formatFieldDisplay(val, f);
    if (display === "-") {
      return (
        <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
          —
        </span>
      );
    }

    return <>{display}</>;
  };

  const activeSubmittedAt = formatSubmittedAt(active?.submittedAt);

  const activeApprovalField = active
    ? active.fields?.find((f) => f._id === active.fieldId)
    : undefined;
  const activeApprovalData = active
    ? normalizeApprovalValue(
        active.approval ?? active.rowData?.[active.fieldId],
        activeApprovalField
      )
    : null;

  const isActiveCurrentApprover = isCurrentApprover(
    activeApprovalData,
    currentUser?.userId,
    activeApprovalField
  );
  const canEditActive =
    !!active && (canDeleteAnyRow || isActiveCurrentApprover);

  const handleEdit = () => {
    if (!active) return;
    const rowId = active.rowId;
    const formId = active.formId;
    setActive(null);
    navigate(`/boards/${boardId}?sheet=${formId}&row=${rowId}#활동`);
  };

  return (
    <>
      {showTodoSection && (
        <section className={style.formSectionPanel} style={{ marginBottom: 16 }}>
          <div className={style.formSectionHeaderStatic}>
            <div className={style.formSectionHeaderMain}>
              <h3 className={style.formSectionTitle}>할 일</h3>
              <span className={style.formSectionCount}>{todoCount}</span>
            </div>
          </div>
          <div className={style.formSectionBody}>
            <div className={style.formCardList}>
              {visibleItems.map((item) => (
                <div
                  key={`approve_${item.rowId}_${item.fieldId}`}
                  className={style.formCard}
                  title="결재 검토하기"
                  onClick={() => openItem(item, "approve")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openItem(item, "approve");
                    }
                  }}
                >
                  <div className={style.formCardMain}>
                    <div
                      className={`${style.formCardLeadIcon} ${style.formCardLeadIconWarning}`}
                      aria-hidden
                    >
                      <Svg type="list_check" width="20px" height="20px" />
                    </div>
                    <div className={style.formCardLeft}>
                      <div className={style.formCardTitle}>
                        {pendingItemCardTitle(item)}
                      </div>
                      <div className={style.formCardMeta}>
                        <span
                          className={`${style.formCardBadge} ${style.badgeApproval}`}
                        >
                          {item.stepLabel || item.fieldLabel}
                        </span>
                        {item.respondentName && (
                          <span>
                            {item.respondentName}
                            {item.respondentId ? `(${item.respondentId})` : ""}
                          </span>
                        )}
                        {item.submittedAt && (
                          <span>
                            {new Date(item.submittedAt).toLocaleString("ko-KR", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {visibleOutgoing.map((item) => {
                const stepNum =
                  typeof item.currentStep === "number"
                    ? item.currentStep + 1
                    : null;
                const total = item.totalSteps || 0;
                return (
                  <div
                    key={`outgoing_${item.rowId}_${item.fieldId}`}
                    className={style.formCard}
                    title="승인 진행 확인"
                    onClick={() => openItem(item, "outgoing")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openItem(item, "outgoing");
                      }
                    }}
                  >
                  <div className={style.formCardMain}>
                    <div
                      className={`${style.formCardLeadIcon} ${style.formCardLeadIconInfo}`}
                      aria-hidden
                    >
                      <Svg type="list_check" width="20px" height="20px" />
                    </div>
                    <div className={style.formCardLeft}>
                      <div className={style.formCardTitle}>
                        {pendingItemCardTitle(item)}
                      </div>
                      <div className={style.formCardMeta}>
                        <span
                          className={`${style.formCardBadge} ${style.badgeOptional}`}
                        >
                          승인 진행
                          {stepNum != null && total > 0
                            ? ` ${stepNum}/${total}`
                            : ""}
                        </span>
                        {item.stepLabel && (
                          <span
                            className={`${style.formCardBadge} ${style.badgeApproval}`}
                          >
                            {item.stepLabel} 대기
                          </span>
                        )}
                        {item.currentApproverName && (
                          <span>
                            {item.currentApproverName}
                            {item.currentApproverId
                              ? `(${item.currentApproverId})`
                              : ""}
                          </span>
                        )}
                        {item.submittedAt && (
                          <span>
                            {new Date(item.submittedAt).toLocaleString(
                              "ko-KR",
                              {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
              {gradeCards}
              {unsubmittedCards}
            </div>
          </div>
        </section>
      )}

      {active && (
        <Popup
          title={`${pendingItemCardTitle(active)} · ${
            isReadonly
              ? "승인 진행"
              : active.stepLabel || "승인"
          }`}
          setState={(v: boolean) => {
            if (!v && !busy) setActive(null);
          }}
          closeBtn={!busy}
          contentScroll
          style={{
            maxWidth: "min(960px, 96vw)",
            width: "100%",
          }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                width: "100%",
              }}
            >
              {canEditActive && (
                <Button type="ghost" disabled={busy} onClick={handleEdit}>
                  수정
                </Button>
              )}
              <Button
                type="ghost"
                disabled={busy}
                onClick={() => setActive(null)}
              >
                닫기
              </Button>
              {!isReadonly && (
                <>
                  <Button
                    type="ghost"
                    disabled={busy}
                    style={{ color: "var(--status-error)" }}
                    onClick={() => handleAction("rejected")}
                  >
                    반려
                  </Button>
                  <Button
                    type="ghost"
                    disabled={busy}
                    style={{ color: "var(--status-success)" }}
                    onClick={() => handleAction("approved")}
                  >
                    승인
                  </Button>
                </>
              )}
            </div>
          }
        >
          <div className={style.approvalPopupBody}>
            <div className={style.rendererBody}>
              <div className={style.rendererMeta}>
                <span
                  className={`${style.formCardBadge} ${
                    isReadonly ? style.badgeOptional : style.badgeApproval
                  }`}
                >
                  {isReadonly
                    ? "승인 진행"
                    : active.stepLabel || active.fieldLabel || "승인"}
                </span>
                {isReadonly && active.stepLabel && (
                  <span
                    className={`${style.formCardBadge} ${style.badgeApproval}`}
                  >
                    {active.stepLabel} 대기
                  </span>
                )}
              </div>

              <div className={style.readonlyBanner}>
                <div className={style.readonlyBannerText}>
                  {isReadonly ? (
                    <>
                      <strong>내가 제출한 응답의 승인 진행 상황입니다.</strong>
                      {active.currentApproverName && (
                        <span>
                          현재 승인자: {active.currentApproverName}
                          {active.currentApproverId
                            ? ` (${active.currentApproverId})`
                            : ""}
                        </span>
                      )}
                      {activeSubmittedAt && (
                        <span>제출일: {activeSubmittedAt}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>
                        {active.respondentName || "제출자"}
                        {active.respondentId
                          ? ` (${active.respondentId})`
                          : ""}
                      </strong>
                      {activeSubmittedAt && (
                        <span>제출일: {activeSubmittedAt}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {visibleFields.map((f) => {
                const val = active.rowData?.[f._id];
                const empty =
                  f.type === "content"
                    ? !f.content && !val
                    : val == null ||
                      val === "" ||
                      (Array.isArray(val) && val.length === 0);
                if (empty && f.type === "content" && !f.content) return null;

                const showLabel =
                  f.type !== "content" || Boolean(f.label?.trim());

                return (
                  <div key={f._id} className={style.questionItem}>
                    {showLabel && (
                      <div className={style.questionLabel}>
                        <span className={style.questionLabelText}>
                          {f.label}
                        </span>
                      </div>
                    )}
                    <div className={style.docViewValue}>
                      {renderFieldValue(f)}
                    </div>
                  </div>
                );
              })}

              <ApprovalProgressBlock
                approvalData={activeApprovalData}
                currentStepIndex={activeApprovalData?.currentStep ?? 0}
              />

              {!isReadonly && (
                <div className={style.approvalReasonSection}>
                  <label
                    className={style.approvalReasonLabel}
                    htmlFor="approval-reason"
                  >
                    의견
                  </label>
                  <input
                    id="approval-reason"
                    className={style.approvalReasonInput}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={busy}
                    placeholder="의견을 입력하세요"
                  />
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
};

export default PendingApprovalsPanel;
