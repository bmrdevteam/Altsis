import { Ref, useEffect, useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import bStyle from "../boards.module.scss";
import { TAltForm, TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import { MarkdownViewer, MarkdownWysiwygView } from "components/markdown";
import { NO_PRINT_CLASS } from "utils/printArea";
import { formatAiChatCell } from "./formAiChat";
import { formatReadableValue } from "./formFieldDisplay";
import FilePreviewModal from "./FilePreviewModal";
import FormFileAnswerList from "./FormFileAnswerList";
import { TFormFileRef } from "./formFilePreview";
import SheetApprovalDocSection from "./SheetApprovalDocSection";
import {
  approvalItemKey,
  buildApprovalListItem,
  countApprovalInbox,
  formatWaitingLabel,
  isSelectableApprovalItem,
  matchesApprovalInboxFilter,
  nextMyTurnItem,
  resolveApprovalPrintRows,
  shouldDefaultInboxToAll,
  sortApprovalItems,
  TApprovalInboxFilter,
  TApprovalListItem,
  TApprovalListSort,
} from "./sheetApprovalList";

type Props = {
  form: TAltForm;
  rows: TAltSheetRow[];
  fields: TAltFormField[];
  currentUserId?: string;
  currentUserOid?: string;
  printRootRef?: Ref<HTMLDivElement>;
  printTitle?: string;
  openRowId?: string | null;
  onOpenHandled?: () => void;
  onDecide: (
    rowId: string,
    fieldId: string,
    status: "approved" | "rejected",
    reason: string
  ) => Promise<boolean>;
  onBulkDecide: (
    items: { rowId: string; fieldId: string }[],
    status: "approved" | "rejected",
    reason: string
  ) => Promise<{
    succeeded: { rowId: string; row: TAltSheetRow }[];
    failed: { rowId: string; message: string }[];
  }>;
  onPrintableRowsChange?: (next: {
    rows: TAltSheetRow[];
    fromSelection: boolean;
  }) => void;
};

const INBOX_CHIPS: {
  key: TApprovalInboxFilter;
  label: string;
  icon: string;
  tone: string;
}[] = [
  { key: "mine", label: "내 결재 대기", icon: "list_check", tone: "Approval" },
  { key: "pending", label: "진행 중", icon: "time", tone: "Pending" },
  { key: "approved", label: "최종 승인", icon: "user_check", tone: "Submitted" },
  { key: "rejected", label: "반려", icon: "error", tone: "Closed" },
  { key: "mineSubmitted", label: "내가 올린 건", icon: "profile", tone: "Optional" },
];

const CHIP_TONE_CLASS: Record<string, string> = {
  All: bStyle.filterChipToneAll,
  Approval: bStyle.filterChipToneApproval,
  Pending: bStyle.filterChipTonePending,
  Submitted: bStyle.filterChipToneSubmitted,
  Closed: bStyle.filterChipToneClosed,
  Optional: bStyle.filterChipToneOptional,
};

const SORT_OPTIONS: { value: TApprovalListSort; label: string }[] = [
  { value: "submittedDesc", label: "최근 제출순" },
  { value: "waitingDesc", label: "오래 대기순" },
  { value: "stepAsc", label: "단계순" },
];

const EMPTY_COPY: Record<TApprovalInboxFilter, string> = {
  mine: "내 결재 대기가 없습니다.",
  pending: "진행 중인 결재가 없습니다.",
  approved: "최종 승인된 문서가 없습니다.",
  rejected: "반려된 문서가 없습니다.",
  mineSubmitted: "내가 올린 문서가 없습니다.",
  all: "표시할 문서가 없습니다.",
};

const formatSubmittedAt = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (status: TApprovalListItem["status"]) => {
  if (status === "approved") return "최종 승인";
  if (status === "rejected") return "반려";
  if (status === "pending") return "진행 중";
  return "—";
};

const statusBadgeClass = (status: TApprovalListItem["status"]) => {
  if (status === "approved") return style.badgeApproved;
  if (status === "rejected") return style.badgeRejected;
  return style.badgePending;
};

const SheetApprovalView = ({
  form,
  rows,
  fields,
  currentUserId,
  currentUserOid,
  printRootRef,
  printTitle,
  openRowId,
  onOpenHandled,
  onDecide,
  onBulkDecide,
  onPrintableRowsChange,
}: Props) => {
  const [inboxFilter, setInboxFilter] =
    useState<TApprovalInboxFilter>("mine");
  const [listSort, setListSort] =
    useState<TApprovalListSort>("submittedDesc");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState("");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [popupReason, setPopupReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState<TFormFileRef | null>(null);
  const didAutoInbox = useRef(false);

  const items = useMemo(
    () =>
      rows
        .map((row) =>
          buildApprovalListItem(row, fields, currentUserId, currentUserOid)
        )
        .filter((item): item is TApprovalListItem => !!item),
    [rows, fields, currentUserId, currentUserOid]
  );

  const counts = useMemo(() => countApprovalInbox(items), [items]);

  useEffect(() => {
    if (didAutoInbox.current) return;
    if (items.length === 0) return;
    didAutoInbox.current = true;
    if (shouldDefaultInboxToAll(counts)) {
      setInboxFilter("all");
    }
  }, [items.length, counts]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) =>
      matchesApprovalInboxFilter(item, inboxFilter)
    );
    return sortApprovalItems(filtered, listSort);
  }, [items, inboxFilter, listSort]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [inboxFilter, listSort]);

  useEffect(() => {
    if (!openRowId) return;
    const match = items.find((item) => item.rowId === String(openRowId));
    if (!match) return;
    setActiveRowId(match.rowId);
    setPopupReason("");
    onOpenHandled?.();
  }, [openRowId, items, onOpenHandled]);

  const selectedItems = visibleItems.filter((item) =>
    selectedKeys.has(approvalItemKey(item))
  );
  const selectedApprovableItems = selectedItems.filter(
    isSelectableApprovalItem
  );

  useEffect(() => {
    onPrintableRowsChange?.(
      resolveApprovalPrintRows(visibleItems, selectedKeys)
    );
  }, [visibleItems, selectedKeys, onPrintableRowsChange]);

  const allVisibleChecked =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedKeys.has(approvalItemKey(item)));

  const activeItem =
    items.find((item) => item.rowId === activeRowId) ||
    visibleItems.find((item) => item.rowId === activeRowId) ||
    null;
  const activeIndex = activeItem
    ? visibleItems.findIndex((item) => item.rowId === activeItem.rowId)
    : -1;

  const openItem = (item: TApprovalListItem) => {
    setActiveRowId(item.rowId);
    setPopupReason("");
    setPreviewFile(null);
  };

  const toggleSelect = (item: TApprovalListItem) => {
    const key = approvalItemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleChecked) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(visibleItems.map(approvalItemKey)));
  };

  const handleSingleDecide = async (status: "approved" | "rejected") => {
    if (busy || !activeItem || !activeItem.isMyTurn) return;
    if (status === "rejected" && !popupReason.trim()) {
      window.alert("반려 사유를 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const ok = await onDecide(
        activeItem.rowId,
        activeItem.fieldId,
        status,
        popupReason.trim()
      );
      if (!ok) return;
      const next = nextMyTurnItem(visibleItems, activeItem.rowId);
      if (next) openItem(next);
      else setActiveRowId(null);
    } finally {
      setBusy(false);
    }
  };

  const handleBulk = async (status: "approved" | "rejected") => {
    if (busy || selectedApprovableItems.length === 0) return;
    if (status === "rejected" && !bulkReason.trim()) {
      window.alert("반려 사유를 입력하세요.");
      return;
    }
    const actionLabel = status === "approved" ? "승인" : "반려";
    if (
      !window.confirm(
        `${selectedApprovableItems.length}건을 ${actionLabel}할까요?`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { succeeded, failed } = await onBulkDecide(
        selectedApprovableItems.map((item) => ({
          rowId: item.rowId,
          fieldId: item.fieldId,
        })),
        status,
        bulkReason.trim()
      );
      if (succeeded.length === 0 && failed.length === 0) return;
      setSelectedKeys(new Set());
      setBulkReason("");
      if (failed.length === 0) {
        window.alert(`${succeeded.length}건을 ${actionLabel}했습니다.`);
        return;
      }
      window.alert(
        `${succeeded.length}건 성공, ${failed.length}건 실패${
          failed[0]?.message ? `\n${failed[0].message}` : ""
        }`
      );
    } finally {
      setBusy(false);
    }
  };

  const renderFieldValue = (field: TAltFormField) => {
    if (!activeItem) return null;
    const val = activeItem.row.data?.[field._id];

    if (field.type === "file") {
      const fileItems = Array.isArray(val) ? val : [];
      return (
        <FormFileAnswerList items={fileItems} onPreview={setPreviewFile} />
      );
    }
    if (field.type === "link" && val && typeof val === "object" && val.url) {
      const href = String(val.url).startsWith("http")
        ? val.url
        : `https://${val.url}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={style.uploadedFileLink}
        >
          {val.title || val.ogTitle || val.url}
        </a>
      );
    }
    if (field.type === "docResponse" && val) {
      return (
        <div className={style.contentFieldBody}>
          <MarkdownWysiwygView content={formatReadableValue(val)} />
        </div>
      );
    }
    if (field.type === "aiChat") {
      return formatAiChatCell(val) || (
        <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
          —
        </span>
      );
    }
    if (field.type === "content") {
      const md = field.content || val;
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
    const display = formatReadableValue(val);
    if (!display) {
      return (
        <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
          —
        </span>
      );
    }
    if (field.type === "textarea") {
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {display}
        </div>
      );
    }
    return <>{display}</>;
  };

  const emptyMessage = EMPTY_COPY[inboxFilter];
  const isReadonlyPopup = !!activeItem && !activeItem.isMyTurn;

  return (
    <>
      <div ref={printRootRef} className={style.sheetApprovalView}>
        {printTitle ? (
          <div className={style.printTitle}>{printTitle}</div>
        ) : null}

        <div
          className={`${style.sheetApprovalToolbar} ${style.noPrint} ${NO_PRINT_CLASS}`}
        >
          <div
            className={bStyle.filterChipRow}
            role="radiogroup"
            aria-label="결재 상태"
          >
            <button
              type="button"
              className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.All} ${
                inboxFilter === "all" ? bStyle.filterChipActive : ""
              }`}
              aria-pressed={inboxFilter === "all"}
              onClick={() => setInboxFilter("all")}
            >
              <span className={bStyle.filterChipIcon} aria-hidden>
                <Svg type="list" width="12px" height="12px" />
              </span>
              전체 {counts.all}
            </button>
            {INBOX_CHIPS.map((chip) => {
              const count = counts[chip.key];
              if (chip.key !== "mine" && count <= 0) return null;
              return (
                <button
                  key={chip.key}
                  type="button"
                  className={`${bStyle.filterChip} ${CHIP_TONE_CLASS[chip.tone]} ${
                    inboxFilter === chip.key ? bStyle.filterChipActive : ""
                  }`}
                  aria-pressed={inboxFilter === chip.key}
                  onClick={() => setInboxFilter(chip.key)}
                >
                  <span className={bStyle.filterChipIcon} aria-hidden>
                    <Svg type={chip.icon} width="12px" height="12px" />
                  </span>
                  {chip.label} {count}
                </button>
              );
            })}
          </div>
          <label className={style.sheetSortLabel} htmlFor="approval-list-sort">
            정렬
            <select
              id="approval-list-sort"
              className={style.sheetSortSelect}
              value={listSort}
              onChange={(e) =>
                setListSort(e.target.value as TApprovalListSort)
              }
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedItems.length > 0 && (
          <div
            className={`${style.sheetApprovalBulkBar} ${style.noPrint} ${NO_PRINT_CLASS}`}
            role="region"
            aria-label="일괄 결재"
          >
            <span className={style.sheetApprovalBulkCount}>
              {selectedItems.length}건 선택
              {selectedApprovableItems.length > 0 &&
              selectedApprovableItems.length !== selectedItems.length
                ? ` · 승인 가능 ${selectedApprovableItems.length}건`
                : ""}
            </span>
            {selectedApprovableItems.length > 0 && (
              <>
                <input
                  className={style.approvalReasonInput}
                  placeholder="의견 (반려 시 필수)"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  disabled={busy}
                  aria-label="일괄 결재 의견"
                />
                <Button
                  type="ghost"
                  disabled={busy}
                  onClick={() => handleBulk("rejected")}
                >
                  일괄 반려
                </Button>
                <Button disabled={busy} onClick={() => handleBulk("approved")}>
                  일괄 승인
                </Button>
              </>
            )}
          </div>
        )}

        {visibleItems.length === 0 ? (
          <div className={style.sheetEmpty}>
            <p className={style.sheetApprovalEmptyCopy}>{emptyMessage}</p>
            {inboxFilter === "mine" && counts.all > 0 && (
              <Button type="ghost" onClick={() => setInboxFilter("all")}>
                전체 보기
              </Button>
            )}
          </div>
        ) : (
          <div className={style.sheetTableWrap}>
            <table className={style.sheetTable} aria-label="결재 목록">
              <thead>
                <tr>
                  <th className={`${style.sheetApprovalCheckCol} ${style.noPrint} ${NO_PRINT_CLASS}`}>
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      disabled={visibleItems.length === 0}
                      onChange={toggleSelectAll}
                      aria-label="목록 전체 선택"
                    />
                  </th>
                  <th>상태</th>
                  <th>문서 제목</th>
                  <th>기안자</th>
                  <th>현재 단계</th>
                  <th>대기</th>
                  <th>제출일시</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const key = approvalItemKey(item);
                  const checked = selectedKeys.has(key);
                  return (
                    <tr
                      key={key}
                      className={`${style.sheetApprovalRow} ${
                        item.isMyTurn ? style.sheetApprovalRowMine : ""
                      }`}
                      title="결재 화면 열기"
                      onClick={() => openItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openItem(item);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td
                        className={`${style.sheetApprovalCheckCol} ${style.noPrint} ${NO_PRINT_CLASS}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleSelect(item)}
                          aria-label={`${item.title} 선택`}
                        />
                      </td>
                      <td>
                        <span
                          className={`${style.approvalBadge} ${statusBadgeClass(
                            item.status
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className={style.sheetApprovalTitleCell}>
                        {item.title}
                      </td>
                      <td>
                        {item.respondentName || "—"}
                        {item.respondentId ? ` (${item.respondentId})` : ""}
                      </td>
                      <td>
                        {item.stepLabel || "—"}
                        {item.currentApproverName
                          ? ` · ${item.currentApproverName}`
                          : ""}
                      </td>
                      <td
                        className={
                          item.status === "pending" && item.waitingDays >= 3
                            ? style.sheetApprovalWaitingWarn
                            : undefined
                        }
                      >
                        {item.status === "pending"
                          ? formatWaitingLabel(item.waitingDays)
                          : "—"}
                      </td>
                      <td>{formatSubmittedAt(item.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeItem && (
        <Popup
          title={`${form.title || "결재"} · ${
            isReadonlyPopup
              ? "승인 진행"
              : activeItem.stepLabel || "승인"
          }`}
          setState={(v: boolean) => {
            if (!v && !busy) setActiveRowId(null);
          }}
          closeBtn={!busy}
          contentScroll
          style={{
            maxWidth: "min(960px, 96vw)",
            width: "100%",
          }}
          footer={
            <div className={style.sheetApprovalPopupFooter}>
              <div className={style.sheetApprovalPopupNav}>
                <Button
                  type="ghost"
                  disabled={busy || activeIndex <= 0}
                  onClick={() => {
                    const prev = visibleItems[activeIndex - 1];
                    if (prev) openItem(prev);
                  }}
                >
                  이전
                </Button>
                <Button
                  type="ghost"
                  disabled={
                    busy ||
                    activeIndex < 0 ||
                    activeIndex >= visibleItems.length - 1
                  }
                  onClick={() => {
                    const next = visibleItems[activeIndex + 1];
                    if (next) openItem(next);
                  }}
                >
                  다음
                </Button>
              </div>
              <div className={style.sheetApprovalPopupActions}>
                <Button
                  type="ghost"
                  disabled={busy}
                  onClick={() => setActiveRowId(null)}
                >
                  닫기
                </Button>
              </div>
            </div>
          }
        >
          <div className={style.approvalPopupBody}>
            <div className={style.rendererBody}>
              <div className={style.readonlyBanner}>
                <div className={style.readonlyBannerText}>
                  <strong>
                    {activeItem.respondentName || "제출자"}
                    {activeItem.respondentId
                      ? ` (${activeItem.respondentId})`
                      : ""}
                  </strong>
                  <span>제출일: {formatSubmittedAt(activeItem.submittedAt)}</span>
                </div>
              </div>

              {fields
                .filter((f) => f.type !== "approval")
                .map((field) => (
                  <div key={field._id} className={style.questionItem}>
                    {!!field.label?.trim() && (
                      <div className={style.questionLabel}>
                        <span className={style.questionLabelText}>
                          {field.label}
                        </span>
                      </div>
                    )}
                    <div className={style.docViewValue}>
                      {renderFieldValue(field)}
                    </div>
                  </div>
                ))}

              <SheetApprovalDocSection
                field={activeItem.field}
                row={activeItem.row}
                currentUserId={currentUserId}
                reason={popupReason}
                onReasonChange={setPopupReason}
                onApprove={() => handleSingleDecide("approved")}
                onReject={() => handleSingleDecide("rejected")}
              />
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

export default SheetApprovalView;
