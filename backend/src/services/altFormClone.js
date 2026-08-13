import crypto from "crypto";
import { AltForm, AltSheet } from "../models/index.js";

/**
 * Alt Form 구조만 다른 보드로 복제 (응답/기록 행 없음). 빈 AltSheet 생성.
 * @param {string} academyId
 * @param {Object} original - AltForm document/lean
 * @param {Object} targetBoard - Board document
 * @param {Object} user - req.user
 * @param {{ keepTitle?: boolean, forceDraft?: boolean }} [options]
 * @returns {Promise<{ form: Object, sheet: Object }>}
 */
export const cloneAltFormToBoard = async (
  academyId,
  original,
  targetBoard,
  user,
  options = {}
) => {
  const keepTitle = options.keepTitle === true;
  const forceDraft = options.forceDraft === true;
  const clonedFields = (original.fields || []).map((f) => ({
    _id: crypto.randomUUID(),
    label: f.label,
    type: f.type,
    permission: f.permission,
    visibleToRespondent: f.visibleToRespondent,
    required: f.required,
    options: f.options ? [...f.options] : undefined,
    validation: f.validation,
    content: f.content,
    order: f.order,
    displayCondition: f.displayCondition,
    correctAnswer: f.correctAnswer,
    points: f.points,
    gradingMethod: f.gradingMethod,
    rubricId: f.rubricId,
    rubricIds: f.rubricIds ? [...f.rubricIds] : undefined,
    duplicateCheck: f.duplicateCheck,
    approvalLine: f.approvalLine,
    attachments: Array.isArray(f.attachments)
      ? f.attachments.map((a) => ({
          originalName: a.originalName,
          key: a.key,
          mimeType: a.mimeType || "",
          size: a.size,
        }))
      : undefined,
    links: Array.isArray(f.links)
      ? f.links.map((l) => ({
          title: l.title || "",
          url: l.url,
          ogTitle: l.ogTitle || "",
          ogDescription: l.ogDescription || "",
          ogImage: l.ogImage || "",
        }))
      : undefined,
  }));

  const clonedRubrics = (original.rubrics || []).map((r) => ({
    id: r.id || crypto.randomUUID(),
    title: r.title,
    levels: (r.levels || []).map((l) => ({
      id: l.id || crypto.randomUUID(),
      label: l.label,
      description: l.description || "",
      points: l.points,
    })),
  }));

  const form = await AltForm(academyId).create({
    board: targetBoard._id,
    school: targetBoard.school,
    creator: user._id,
    creatorId: user.userId,
    creatorName: user.userName,
    title: keepTitle ? original.title : `${original.title} (복사)`,
    description: original.description,
    fields: clonedFields,
    rubrics: clonedRubrics,
    isDraft: forceDraft ? true : !!original.isDraft,
    settings: {
      allowResubmit: original.settings?.allowResubmit,
      allowMultipleResponses: original.settings?.allowMultipleResponses,
      requiredResponseCount: original.settings?.requiredResponseCount,
      requiredMode: original.settings?.requiredMode === true,
      quizMode: original.settings?.quizMode,
      quizSettings: original.settings?.quizSettings,
      assessmentMode: original.settings?.assessmentMode,
      assessmentSettings: original.settings?.assessmentSettings,
      directInputMode: original.settings?.directInputMode,
      shareResponses: original.settings?.shareResponses,
      showOwnerFields: original.settings?.showOwnerFields,
      showOwnResponse: original.settings?.showOwnResponse,
      openAt: original.settings?.openAt,
      closeAt: original.settings?.closeAt,
      weekdaySchedule: original.settings?.weekdaySchedule,
    },
  });

  const sheet = await AltSheet(academyId).create({
    form: form._id,
    board: form.board,
    school: form.school,
    name: form.title,
  });

  form.sheet = sheet._id;
  await form.save();

  return { form, sheet };
};
