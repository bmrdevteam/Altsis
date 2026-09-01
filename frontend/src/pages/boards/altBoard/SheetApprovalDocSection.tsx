import style from "./altBoard.module.scss";
import Button from "components/button/Button";
import { TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import {
  formatCirculationNames,
  isCurrentApprover,
  normalizeApprovalValue,
  TApprovalStepRuntime,
  TApprovalValueV2,
} from "utils/approvalLine";
import { NO_PRINT_CLASS } from "utils/printArea";

type Props = {
  field: TAltFormField;
  row: TAltSheetRow;
  currentUserId?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
};

const STEP_STATUS_LABELS: Record<TApprovalStepRuntime["status"], string> = {
  waiting: "대기전",
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

const STEP_STATUS_CLASSES: Record<TApprovalStepRuntime["status"], string> = {
  waiting: style.badgeClosed,
  pending: style.badgePending,
  approved: style.badgeApproved,
  rejected: style.badgeRejected,
};

const overallLabel = (status: TApprovalValueV2["overallStatus"]) => {
  if (status === "approved") return "최종 승인";
  if (status === "rejected") return "반려";
  return "결재 진행 중";
};

const SheetApprovalDocSection = ({
  field,
  row,
  currentUserId,
  reason,
  onReasonChange,
  onApprove,
  onReject,
}: Props) => {
  const approvalData = normalizeApprovalValue(row.data[field._id], field);
  const circNames = formatCirculationNames(approvalData);
  const circulationLine = circNames ? (
    <div className={style.docViewValue}>회람: {circNames}</div>
  ) : null;

  if (!approvalData?.steps?.length) {
    const skippedApproved = approvalData?.overallStatus === "approved";
    return (
      <div className={style.docSection}>
        <div className={style.docSectionHeader}>
          <div className={style.docSectionTitle}>{field.label || "결재선"}</div>
          {skippedApproved && (
            <span className={`${style.approvalBadge} ${style.badgeApproved}`}>
              최종 승인
            </span>
          )}
        </div>
        <div className={style.docViewValue}>
          {skippedApproved ? "결재 생략" : "-"}
        </div>
        {circulationLine}
      </div>
    );
  }

  const status = approvalData.overallStatus || "pending";
  const statusClass =
    status === "approved"
      ? style.badgeApproved
      : status === "rejected"
        ? style.badgeRejected
        : style.badgePending;
  const isApprover = isCurrentApprover(
    row.data[field._id],
    currentUserId,
    field
  );
  const currentStepIndex = approvalData.currentStep;
  const hasLegacyReason =
    !approvalData.steps.some((s) => s.reason) && !!approvalData.reason;

  return (
    <div className={style.docSection}>
      <div className={style.docSectionHeader}>
        <div className={style.docSectionTitle}>{field.label || "결재선"}</div>
        <span className={`${style.approvalBadge} ${statusClass}`}>
          {overallLabel(status)}
        </span>
      </div>

      <div className={style.approvalProgressSection}>
        <div className={style.approvalProgressTitle}>결재 진행 상황</div>
        <ol className={style.approvalStepList}>
          {approvalData.steps.map((step, index) => {
            const isCurrent =
              index === currentStepIndex && step.status === "pending";
            const statusLabel = STEP_STATUS_LABELS[step.status];
            const stepStatusClass =
              STEP_STATUS_CLASSES[step.status] || style.badgeClosed;

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
                    className={`${style.approvalBadge} ${stepStatusClass} ${style.approvalStepStatus}`}
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
        {hasLegacyReason && (
          <div className={style.approvalStepReason}>
            의견: {approvalData.reason}
          </div>
        )}
      </div>

      {circulationLine}

      {isApprover && status === "pending" && (
        <div
          className={`${style.approvalReasonSection} ${style.noPrint} ${NO_PRINT_CLASS}`}
        >
          <label className={style.approvalReasonLabel} htmlFor={`approval-reason-${row._id}-${field._id}`}>
            의견 (선택)
          </label>
          <input
            id={`approval-reason-${row._id}-${field._id}`}
            className={style.approvalReasonInput}
            placeholder="승인·반려 사유"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
          <div className={style.docSectionActions}>
            <Button type="ghost" onClick={onReject}>
              반려
            </Button>
            <Button onClick={onApprove}>승인</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetApprovalDocSection;
