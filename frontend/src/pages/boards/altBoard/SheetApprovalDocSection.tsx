import style from "./altBoard.module.scss";
import Button from "components/button/Button";
import { TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import {
  isCurrentApprover,
  normalizeApprovalValue,
  TApprovalValueV2,
} from "utils/approvalLine";
import { NO_PRINT_CLASS } from "utils/printArea";
import ApprovalProgressBlock from "./ApprovalProgressBlock";

type Props = {
  field: TAltFormField;
  row: TAltSheetRow;
  currentUserId?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
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
        <ApprovalProgressBlock approvalData={approvalData} />
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

      <ApprovalProgressBlock
        approvalData={approvalData}
        currentStepIndex={approvalData.currentStep}
        legacyReason={hasLegacyReason ? approvalData.reason : undefined}
      />

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
