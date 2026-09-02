import style from "./altBoard.module.scss";
import {
  formatApproverLabel,
  TApprovalStepRuntime,
  TApprovalValueV2,
} from "utils/approvalLine";
import { CirculationUserChips } from "./ApprovalCirculationPicker";

const STEP_STATUS_LABELS: Record<TApprovalStepRuntime["status"], string> = {
  waiting: "대기 전",
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

type Props = {
  approvalData: TApprovalValueV2 | null;
  currentStepIndex?: number;
  legacyReason?: string;
};

const ApprovalProgressBlock = ({
  approvalData,
  currentStepIndex,
  legacyReason,
}: Props) => {
  const steps = approvalData?.steps || [];
  const circUsers = approvalData?.circulation || [];
  if (!steps.length && !circUsers.length && !legacyReason) return null;

  const stepIndex =
    typeof currentStepIndex === "number"
      ? currentStepIndex
      : approvalData?.currentStep ?? 0;

  return (
    <div className={style.approvalProgressSection}>
      <div className={style.approvalProgressTitle}>결재 진행 상황</div>
      {steps.length > 0 && (
        <ol className={style.approvalStepList}>
          {steps.map((step, index) => {
            const isCurrent =
              index === stepIndex && step.status === "pending";
            const statusLabel = STEP_STATUS_LABELS[step.status];
            const statusClass =
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
                        {formatApproverLabel(step.approver)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`${style.approvalBadge} ${statusClass} ${style.approvalStepStatus}`}
                  >
                    {step.status === "approved"
                      ? "승인"
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
      )}
      {legacyReason && (
        <div className={style.approvalStepReason}>의견: {legacyReason}</div>
      )}
      {circUsers.length > 0 && (
        <div className={style.approvalCirculationLine}>
          <span className={style.approvalCirculationLabel}>회람</span>
          <CirculationUserChips users={circUsers} />
        </div>
      )}
    </div>
  );
};

export default ApprovalProgressBlock;
