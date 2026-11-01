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

function respondentOf(row) {
  if (!row?._respondent || !row?._respondentId) return null;
  return {
    user: row._respondent,
    userId: row._respondentId,
    userName: row._respondentName || "",
  };
}

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

/**
 * 승인 취소 후 제출자·회람·다음 승인자에게 알린다.
 * 알림 실패는 취소 결과에 영향을 주지 않는다.
 */
export async function sendApprovalCancelNotifications({
  academyId,
  board,
  form,
  row,
  fromUser,
  result,
}) {
  if (!result?.ok || !result.cancelled || !row?._id) return;

  try {
    const stepLabel = result.restoredStepLabel || "이전 단계";
    const exclude = [fromUser?.userId];
    const respondent = respondentOf(row);
    const description = `결재가 「${stepLabel}」단계로 돌아갔습니다.`;

    if (result.reopenedFinal) {
      const enabled = await isBoardNotificationEnabled(
        academyId,
        board.school,
        board,
        "altFormApprovalResult"
      );
      if (!enabled) return;
      const toUserList = recipientsForFinalApprovalResult({
        respondent,
        circulatees: collectStoredCirculatees(form, row.data),
        excludeUserIds: exclude,
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
          "approvalReopened"
        ),
        description,
        relatedEntity: { type: "altSheetRow", id: row._id },
        fromUser,
      });
      return;
    }

    const resultEnabled = await isBoardNotificationEnabled(
      academyId,
      board.school,
      board,
      "altFormApprovalResult"
    );
    const told = new Set();
    if (resultEnabled && respondent && respondent.userId !== fromUser?.userId) {
      told.add(String(respondent.userId));
      await sendAutoNotification({
        academyId,
        toUserList: [respondent],
        notificationType: "altFormApprovalResult",
        category: "승인",
        title: approvalNotificationTitle(
          form,
          row.data,
          "stepCancelled",
          stepLabel
        ),
        description,
        relatedEntity: { type: "altSheetRow", id: row._id },
        fromUser,
      });
    }

    const withdrawn = result.withdrawnApprover;
    if (
      !withdrawn?.user ||
      !withdrawn.userId ||
      withdrawn.userId === fromUser?.userId ||
      told.has(String(withdrawn.userId))
    ) {
      return;
    }
    const requestEnabled = await isBoardNotificationEnabled(
      academyId,
      board.school,
      board,
      "altFormApprovalRequest"
    );
    if (!requestEnabled) return;
    const nextLabel =
      result.value?.steps?.[result.value.currentStep + 1]?.label || "다음";
    await sendAutoNotification({
      academyId,
      toUserList: [withdrawn],
      notificationType: "altFormApprovalRequest",
      category: "승인",
      title: approvalNotificationTitle(form, row.data, "requestWithdrawn"),
      description: `「${nextLabel}」승인 요청이 철회되었습니다.`,
      relatedEntity: { type: "altSheetRow", id: row._id },
      fromUser,
    });
  } catch (err) {
    logger.error(err?.message || "승인 취소 알림 전송 실패");
  }
}
