import { useEffect, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import { MarkdownViewer } from "components/markdown";
import {
  normalizeApprovalValue,
  TApprovalStepRuntime,
  TApprovalValueV2,
} from "utils/approvalLine";
import { TApprovalLine } from "types/altForm";

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
  submittedAt?: string;
  approval?: any;
  rowData?: Record<string, any>;
  fields?: FieldMeta[];
};

type Props = {
  boardId: string;
  onCountChange?: (count: number) => void;
  /** 첫 조회(또는 board 변경 후 조회) 완료 — 레이아웃 밀림 방지용 */
  onSettled?: () => void;
  /** 알림 딥링크 등으로 특정 행을 바로 열기 */
  openRowId?: string | null;
  onOpenHandled?: () => void;
};

type UploadedFile = { originalName: string; key: string };

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

  if (field?.type === "rating") {
    return value ? `${"★".repeat(Number(value))}` : "-";
  }

  if (field?.type === "checkbox" || field?.type === "multiSelect") {
    if (Array.isArray(value)) return value.join(", ") || "-";
  }

  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "object") {
    if (value.userName) return String(value.userName);
    if (value.label) return String(value.label);
    return "-";
  }
  return String(value);
};

const parseFiles = (value: any): UploadedFile[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((f) => f && (f.key || f.originalName));
};

const APPROVAL_STEP_STATUS_LABELS: Record<
  TApprovalStepRuntime["status"],
  string
> = {
  waiting: "대기 전",
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

const APPROVAL_STEP_STATUS_CLASSES: Record<
  TApprovalStepRuntime["status"],
  string
> = {
  waiting: style.badgeClosed,
  pending: style.badgePending,
  approved: style.badgeApproved,
  rejected: style.badgeRejected,
};

const renderApprovalProgress = (
  approvalData: TApprovalValueV2 | null,
  currentStepIndex: number
) => {
  if (!approvalData?.steps?.length) return null;

  return (
    <div className={style.approvalProgressSection}>
      <div className={style.approvalProgressTitle}>결재 진행 상황</div>
      <ol className={style.approvalStepList}>
        {approvalData.steps.map((step, index) => {
          const isCurrent =
            index === currentStepIndex && step.status === "pending";
          const statusLabel = APPROVAL_STEP_STATUS_LABELS[step.status];
          const statusClass =
            APPROVAL_STEP_STATUS_CLASSES[step.status] || style.badgeClosed;

          return (
            <li
              key={`${step.order}_${step.label}_${index}`}
              className={`${style.approvalStepItem} ${
                isCurrent ? style.approvalStepItemCurrent : ""
              }`}
            >
              <span className={style.approvalStepIndex}>{index + 1}</span>
              <div className={style.approvalStepBody}>
                <div className={style.approvalStepMain}>
                  <span className={style.approvalStepLabel}>{step.label}</span>
                  {step.approver && (
                    <span className={style.approvalStepApprover}>
                      {step.approver.userName}
                      {step.approver.userId
                        ? ` (${step.approver.userId})`
                        : ""}
                    </span>
                  )}
                </div>
                <span
                  className={`${style.approvalBadge} ${statusClass} ${style.approvalStepStatus}`}
                >
                  {step.status === "approved"
                    ? "✓ 승인"
                    : step.status === "rejected"
                      ? "반려"
                      : isCurrent
                        ? "진행 중"
                        : statusLabel}
                </span>
                {step.reason && (
                  <div className={style.approvalStepReason}>
                    의견: {step.reason}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const PendingApprovalsPanel = ({
  boardId,
  onCountChange,
  onSettled,
  openRowId,
  onOpenHandled,
}: Props) => {
  const { AltSheetRowAPI, FileAPI } = useAPIv2();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PendingItem | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const openedRef = useRef<string | null>(null);
  const settledOnceRef = useRef(false);
  const loadGenRef = useRef(0);

  const load = async (opts?: { announceSettled?: boolean }) => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      const { items: list, count } =
        await AltSheetRowAPI.RAltSheetRowPendingApprovals({
          query: { board: boardId },
        });
      if (gen !== loadGenRef.current) return;
      setItems(list);
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
    setActive(null);
    load({ announceSettled: true });
  }, [boardId]);

  useEffect(() => {
    if (!openRowId || items.length === 0) return;
    if (openedRef.current === openRowId) return;
    const match = items.find((i) => String(i.rowId) === String(openRowId));
    if (match) {
      openedRef.current = openRowId;
      setActive(match);
      setReason("");
      onOpenHandled?.();
    }
  }, [openRowId, items, onOpenHandled]);

  const handleAction = async (status: "approved" | "rejected") => {
    if (!active) return;
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

  const handleFileOpen = async (f: UploadedFile) => {
    if (!f.key) return;
    try {
      const { preSignedUrl } = await FileAPI.RSignedUrlDocument({
        query: { key: f.key, fileName: f.originalName || "file" },
      });
      window.open(preSignedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  if (loading && items.length === 0) return null;
  if (items.length === 0) return null;

  const visibleFields = (active?.fields || []).filter(
    (f) => f.type !== "approval"
  );

  const renderFieldValue = (f: FieldMeta) => {
    const val = active?.rowData?.[f._id];

    if (f.type === "file") {
      const files = parseFiles(val);
      if (files.length === 0) {
        return (
          <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
            —
          </span>
        );
      }
      return (
        <div className={style.fileUploadArea}>
          {files.map((file) => (
            <div
              key={file.key || file.originalName}
              className={style.uploadedFile}
            >
              <span
                className={`${style.uploadedFileName} ${style.uploadedFileLink}`}
                onClick={() => handleFileOpen(file)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFileOpen(file);
                  }
                }}
                title={`${file.originalName || file.key} 열기`}
              >
                {file.originalName || file.key}
              </span>
            </div>
          ))}
        </div>
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
          <MarkdownViewer content={String(val)} />
        </div>
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
          <MarkdownViewer content={String(md)} />
        </div>
      );
    }

    if (f.type === "textarea" && val) {
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {String(val)}
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

  return (
    <>
      <section className={style.formSectionPanel} style={{ marginBottom: 16 }}>
        <div className={style.formSectionHeaderStatic}>
          <div className={style.formSectionHeaderMain}>
            <h3 className={style.formSectionTitle}>승인 대기</h3>
            <span className={style.formSectionCount}>{items.length}</span>
          </div>
          <div className={style.formSectionStats}>
            <span>내가 처리할 결재</span>
          </div>
        </div>
        <div className={style.formSectionBody}>
          <div className={style.formCardList}>
            {items.map((item) => (
              <div
                key={`${item.rowId}_${item.fieldId}`}
                className={style.formCard}
                onClick={() => {
                  setActive(item);
                  setReason("");
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(item);
                    setReason("");
                  }
                }}
              >
                <div className={style.formCardLeft}>
                  <div className={style.formCardTitle}>{item.formTitle}</div>
                  <div className={style.formCardMeta}>
                    <span
                      className={`${style.formCardBadge} ${style.badgePending}`}
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
            ))}
          </div>
        </div>
      </section>

      {active && (
        <Popup
          title={`${active.formTitle} · ${active.stepLabel || "승인"}`}
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
              <Button
                type="ghost"
                disabled={busy}
                onClick={() => setActive(null)}
              >
                닫기
              </Button>
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
            </div>
          }
        >
          <div className={style.approvalPopupBody}>
            <div className={style.rendererBody}>
              <div className={style.rendererMeta}>
                <span
                  className={`${style.formCardBadge} ${style.badgePending}`}
                >
                  {active.stepLabel || active.fieldLabel || "승인"}
                </span>
              </div>

              <div className={style.readonlyBanner}>
                <div className={style.readonlyBannerText}>
                  <strong>
                    {active.respondentName || "제출자"}
                    {active.respondentId ? ` (${active.respondentId})` : ""}
                  </strong>
                  {activeSubmittedAt && (
                    <span>제출일: {activeSubmittedAt}</span>
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

                const showLabel = f.type !== "content" || Boolean(f.label?.trim());

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

              {renderApprovalProgress(
                activeApprovalData,
                activeApprovalData?.currentStep ?? 0
              )}

              <div className={style.approvalReasonSection}>
                <label className={style.approvalReasonLabel} htmlFor="approval-reason">
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
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default PendingApprovalsPanel;
