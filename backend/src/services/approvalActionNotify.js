import { logger } from "../log/logger.js";
import {
  sendAutoNotification,
  isBoardNotificationEnabled,
} from "./notifications.js";
import {
  collectStoredCirculatees,
  recipientsForFinalApprovalResult,
  approvalNotificationTitle,
} from "../utils/approvalLine.js";

/**
 * 단건·일괄 결재 후 요청/최종/중간 단계 알림.
 * 알림 실패는 결재 결과에 영향을 주지 않는다.
 */
export async function sendApprovalActionNotifications({
  academyId,
  board,
  form,
  row,
  fromUser,
  result,
  reason,
}) {
  if (!result?.ok || !row?._id) return;

  try {
    if (result.finished) {
      const resultNotifEnabled = await isBoardNotificationEnabled(
        academyId,
        board.school,
        board,
        "altFormApprovalResult"
      );
      if (!resultNotifEnabled) return;

      const toUserList = recipientsForFinalApprovalResult({
        respondent: row._respondent
          ? {
              user: row._respondent,
              userId: row._respondentId,
              userName: row._respondentName,
            }
          : null,
        circulatees: collectStoredCirculatees(form, row.data),
        excludeUserIds: [fromUser?.userId],
      });
      if (toUserList.length === 0) return;

      await sendAutoNotification({
        academyId,
        toUserList,
        notificationType: "altFormApprovalResult",
        category: "승인",
        title: approvalNotificationTitle(
          form,
          row.data,
          result.value.overallStatus === "approved" ? "approved" : "rejected"
        ),
        description: reason || "",
        relatedEntity: { type: "altSheetRow", id: row._id },
        fromUser,
      });
      return;
    }

    if (row._respondent) {
      const resultNotifEnabled = await isBoardNotificationEnabled(
        academyId,
        board.school,
        board,
        "altFormApprovalResult"
      );
      if (resultNotifEnabled) {
        const actedStep =
          result.value.steps?.[(result.value.currentStep || 1) - 1];
        const nextStep = result.value.steps?.[result.value.currentStep];
        const actedLabel = actedStep?.label || "이전 단계";
        const nextLabel = nextStep?.label || "다음";
        await sendAutoNotification({
          academyId,
          toUserList: [
            {
              user: row._respondent,
              userId: row._respondentId,
              userName: row._respondentName,
            },
          ],
          notificationType: "altFormApprovalResult",
          category: "승인",
          title: approvalNotificationTitle(
            form,
            row.data,
            "stepApproved",
            actedLabel
          ),
          description: `다음: 「${nextLabel}」승인 대기`,
          relatedEntity: { type: "altSheetRow", id: row._id },
          fromUser,
        });
      }
    }

    if (result.nextApprover?.user) {
      const reqNotifEnabled = await isBoardNotificationEnabled(
        academyId,
        board.school,
        board,
        "altFormApprovalRequest"
      );
      if (reqNotifEnabled) {
        const stepLabel =
          result.value.steps[result.value.currentStep]?.label || "다음";
        await sendAutoNotification({
          academyId,
          toUserList: [result.nextApprover],
          notificationType: "altFormApprovalRequest",
          category: "승인",
          title: approvalNotificationTitle(form, row.data, "request"),
          description: `「${stepLabel}」승인이 필요합니다.`,
          relatedEntity: { type: "altSheetRow", id: row._id },
          fromUser,
        });
      }
    }
  } catch (err) {
    logger.error(err?.message || "결재 알림 전송 실패");
  }
}
