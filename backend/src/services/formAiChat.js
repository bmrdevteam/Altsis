/**
 * 양식 aiChat 항목: 권한·세션·프롬프트·전송
 */
import { Academy } from "../models/Academy.js";
import {
  AIChatMessage,
  AIChatSession,
  AltSheetRow,
  Registration,
  School,
  Season,
} from "../models/index.js";
import { AI_ERRORS, FEATURE_PROFILES, truncateText } from "./aiPromptPolicy.js";
import { generateText, resolveModel, resolveProvider } from "./aiProvider.js";
import { maskSensitiveText } from "./aiSafety.js";
import { logAIUsage } from "./aiUsage.js";
import { assertAiUserQuota } from "./aiUsageQuota.js";
import { ALTER_SAFETY_ETHICS } from "./alterCorePrompt.js";
import { assertCtrlEnabled } from "./entitlement.js";
import {
  canRespondForm,
  canViewAllRows,
  isFormMember,
} from "./altForms.js";
import { checkDraftSaveLimit } from "./sheetRowDraft.js";
import { isDraftSheetRow, splitSheetRows } from "../utils/sheetRowQuery.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

export const FORM_AI_CHAT_TYPE = "aiChat";
export const FORM_AI_CHAT_FEATURE = "form-ai-chat";

const PREVIEW_CHARS = 100;
const HISTORY_LIMIT = 16;
const GUIDELINE_CHARS = 8000;
const LINK_LIST_LIMIT = 10;

export const isAiChatFieldType = (type) => String(type || "") === FORM_AI_CHAT_TYPE;

export const hasSchoolSkillConfig = (school) =>
  !!(
    school?.aiConfig?.skills &&
    typeof school.aiConfig.skills === "object" &&
    Object.keys(school.aiConfig.skills).length > 0
  );

export const resolveAiRolePermission = (school, season, role) => {
  const useSchoolPerm = hasSchoolSkillConfig(school);
  const schoolPerm = school?.aiConfig?.permission;
  const seasonPerm = season?.aiSettings?.permission;
  if (role === "teacher") {
    return useSchoolPerm ? !!schoolPerm?.teacher : !!seasonPerm?.teacher;
  }
  return useSchoolPerm ? !!schoolPerm?.student : !!seasonPerm?.student;
};

export const newAiChatFieldIds = (previousFields = [], nextFields = []) => {
  const prev = new Set(
    (previousFields || [])
      .filter((f) => isAiChatFieldType(f?.type))
      .map((f) => String(f._id || ""))
  );
  return (nextFields || [])
    .filter((f) => isAiChatFieldType(f?.type) && !prev.has(String(f._id || "")))
    .map((f) => String(f._id));
};

export const isAiChatSendLocked = (row, allowResubmit) => {
  if (!row) return false;
  if (isDraftSheetRow(row)) return false;
  return !allowResubmit;
};

export const isAiChatRequiredMet = (studentMessageCount) =>
  Number(studentMessageCount || 0) >= 1;

export const buildAiChatRowSummary = (session) => ({
  sessionId: String(session._id),
  messageCount: Number(session.messageCount || 0),
  studentMessageCount: Number(session.studentMessageCount || 0),
  lastMessagePreview: session.lastMessagePreview || "",
  lastMessageAt: session.lastMessageAt
    ? new Date(session.lastMessageAt).toISOString()
    : undefined,
});

export const parseAiChatSummary = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sessionId = String(value.sessionId || "").trim();
  if (!sessionId) return null;
  return {
    sessionId,
    messageCount: Number(value.messageCount || 0),
    studentMessageCount: Number(value.studentMessageCount || 0),
    lastMessagePreview: String(value.lastMessagePreview || ""),
    lastMessageAt: value.lastMessageAt || undefined,
  };
};

const throwHttp = (status, message, code) => {
  const err = new Error(message);
  err.status = status;
  err.code = code || message;
  throw err;
};

export const assertFormAiInfrastructure = async ({
  academyId,
  user,
  season,
  school,
  checkQuota = true,
}) => {
  const academy = await Academy.findOne({ academyId }, "+aiApiKey");
  if (!academy) throwHttp(404, __NOT_FOUND("academy"));
  if (!academy.aiEnabled) throwHttp(403, AI_ERRORS.NOT_ENABLED, AI_ERRORS.NOT_ENABLED);
  assertCtrlEnabled(academy);
  if (!academy.aiApiKey) {
    throwHttp(400, AI_ERRORS.API_KEY_NOT_SET, AI_ERRORS.API_KEY_NOT_SET);
  }
  if (!season?.aiSettings?.enabled) {
    throwHttp(403, AI_ERRORS.NOT_ENABLED_FOR_SEASON, AI_ERRORS.NOT_ENABLED_FOR_SEASON);
  }
  if (school && school.aiEnabled === false) {
    throwHttp(403, AI_ERRORS.NOT_ENABLED, AI_ERRORS.NOT_ENABLED);
  }
  if (checkQuota) {
    await assertAiUserQuota(academyId, user, academy);
  }
  return academy;
};

export const assertNewAiChatFieldsAllowed = async ({
  academyId,
  user,
  board,
  previousFields = [],
  nextFields = [],
  requestedSeasonId,
}) => {
  const added = newAiChatFieldIds(previousFields, nextFields);
  if (added.length === 0) return;
  const season = await resolveSeasonForFormAi(
    academyId,
    board,
    user,
    requestedSeasonId
  );
  if (!season) {
    throwHttp(403, AI_ERRORS.NOT_ENABLED_FOR_SEASON, AI_ERRORS.NOT_ENABLED_FOR_SEASON);
  }
  const school = board?.school
    ? await School(academyId).findById(board.school)
    : null;
  await assertTeacherCanAddAiChatField({
    academyId,
    user,
    season,
    school,
  });
};

export const assertTeacherCanAddAiChatField = async ({
  academyId,
  user,
  season,
  school,
}) => {
  const academy = await assertFormAiInfrastructure({
    academyId,
    user,
    season,
    school,
    checkQuota: false,
  });
  if (!resolveAiRolePermission(school, season, "teacher")) {
    throwHttp(403, PERMISSION_DENIED);
  }
  return academy;
};

export const resolveSeasonForFormAi = async (
  academyId,
  board,
  user,
  requestedSeasonId
) => {
  if (requestedSeasonId) {
    const season = await Season(academyId).findById(requestedSeasonId);
    if (season) return season;
  }
  if (board?.season) {
    const season = await Season(academyId).findById(board.season);
    if (season) return season;
  }
  const schoolId = board?.school;
  const query = {
    user: user._id,
    isActivated: true,
  };
  if (schoolId) query.school = schoolId;
  const registration = await Registration(academyId)
    .findOne(query)
    .sort({ createdAt: -1 });
  if (!registration?.season) return null;
  return Season(academyId).findById(registration.season);
};

export const buildFormAiChatSystemPrompt = ({ form, field, board }) => {
  const formTitle = String(form?.title || "").trim() || "활동";
  const fieldLabel = String(field?.label || "").trim() || "AI 챗봇";
  const boardName = String(board?.name || board?.title || "").trim();
  const guidelines = truncateText(
    String(field?.content || "").trim(),
    GUIDELINE_CHARS
  );
  const links = (Array.isArray(field?.links) ? field.links : [])
    .slice(0, LINK_LIST_LIMIT)
    .map((l) => {
      const title = String(l?.title || l?.ogTitle || "").trim();
      const url = String(l?.url || "").trim();
      return url ? `- ${title || url}${title && url ? ` (${url})` : ""}` : "";
    })
    .filter(Boolean);
  const files = (Array.isArray(field?.attachments) ? field.attachments : [])
    .map((a) => String(a?.originalName || "").trim())
    .filter(Boolean)
    .map((name) => `- ${name}`);

  const materialLines = [...files, ...links];
  const materialsBlock =
    materialLines.length > 0
      ? `\n## 학습 자료\n${materialLines.join("\n")}`
      : "";
  const guidelineBlock = guidelines
    ? `\n## 교사 지침\n${guidelines}`
    : "";

  return `당신은 학교 활동 양식 안의 학습 도우미 "Alter"입니다.
이 대화는 교사와 양식 담당 교사가 열람할 수 있습니다.
활동: ${formTitle}${boardName ? ` (보드: ${boardName})` : ""}
항목: ${fieldLabel}

학생과 이 활동의 지침·자료 범위 안에서만 대화하세요.
강의계획서·평가·기록·문서 초안 등 다른 교사 업무 스킬로 화제를 돌리지 마세요.
답을 대신 제출하거나 다른 학생 정보를 추측하지 마세요.
한국어로 친절하고 이해하기 쉽게 답하세요.

${ALTER_SAFETY_ETHICS}${guidelineBlock}${materialsBlock}`.trim();
};

export const findAiChatField = (form, fieldId) =>
  (form?.fields || []).find(
    (f) => String(f._id) === String(fieldId) && isAiChatFieldType(f.type)
  ) || null;

const writeRowSummary = async (academyId, row, fieldId, session) => {
  if (!row?.data?.set) {
    const fresh = await AltSheetRow(academyId).findById(row._id);
    if (!fresh) return;
    fresh.data.set(fieldId, buildAiChatRowSummary(session));
    fresh.markModified("data");
    fresh._updatedAt = new Date();
    await fresh.save();
    return;
  }
  row.data.set(fieldId, buildAiChatRowSummary(session));
  row.markModified("data");
  row._updatedAt = new Date();
  await row.save();
};

export const ensureFormAiChatDraftRow = async ({
  academyId,
  form,
  user,
  rowId,
}) => {
  if (rowId) {
    const existing = await AltSheetRow(academyId).findById(rowId);
    if (!existing || !existing.isActive) {
      throwHttp(404, __NOT_FOUND("row"));
    }
    if (String(existing.form) !== String(form._id)) {
      throwHttp(400, "양식이 일치하지 않습니다.");
    }
    const respondentId = existing._respondent?._id || existing._respondent;
    if (!respondentId || String(respondentId) !== String(user._id)) {
      throwHttp(403, PERMISSION_DENIED);
    }
    return existing;
  }

  const myRows = await AltSheetRow(academyId)
    .find({
      form: form._id,
      _respondent: user._id,
      isActive: true,
    })
    .lean();
  const { draftRows, submittedRows } = splitSheetRows(myRows);
  const limitCheck = checkDraftSaveLimit(form, submittedRows, draftRows, {});
  if (!limitCheck.allowed) {
    throwHttp(409, limitCheck.message);
  }
  if (limitCheck.existingDraft) {
    const existing = await AltSheetRow(academyId).findById(
      limitCheck.existingDraft._id
    );
    if (existing) return existing;
  }

  return AltSheetRow(academyId).create({
    sheet: form.sheet,
    form: form._id,
    board: form.board,
    _respondent: user._id,
    _respondentId: user.userId,
    _respondentName: user.userName,
    data: {},
    isDraft: true,
    _updatedAt: new Date(),
  });
};

export const getOrCreateFormAiChatSession = async ({
  academyId,
  board,
  form,
  fieldId,
  row,
  user,
}) => {
  let session = await AIChatSession(academyId).findOne({
    form: form._id,
    fieldId: String(fieldId),
    row: row._id,
  });
  if (session) return session;
  return AIChatSession(academyId).create({
    board: board._id,
    form: form._id,
    fieldId: String(fieldId),
    row: row._id,
    student: user._id,
    studentId: user.userId,
    studentName: user.userName,
  });
};

export const countStudentMessages = async (academyId, sessionId) =>
  AIChatMessage(academyId).countDocuments({
    session: sessionId,
    senderType: "student",
    isDeleted: false,
  });

export const findFormAiChatSessionForSubmit = async ({
  academyId,
  form,
  field,
  row,
  user,
}) => {
  const rowId = row?._id || row;
  if (rowId) {
    const byRow = await AIChatSession(academyId).findOne({
      form: form._id,
      fieldId: String(field._id),
      row: rowId,
    });
    if (byRow) return byRow;
  }
  if (user?._id && !rowId) {
    return AIChatSession(academyId)
      .findOne({
        form: form._id,
        fieldId: String(field._id),
        student: user._id,
      })
      .sort({ lastMessageAt: -1 });
  }
  return null;
};

export const assertAiChatRequiredOnSubmit = async ({
  academyId,
  form,
  row,
  field,
  visible,
  user,
}) => {
  if (!isAiChatFieldType(field?.type) || !field.required || !visible) {
    return null;
  }
  const session = await findFormAiChatSessionForSubmit({
    academyId,
    form,
    field,
    row,
    user,
  });
  if (!session) {
    return `필수 항목을 입력해주세요: ${field.label}`;
  }
  const studentCount = await countStudentMessages(academyId, session._id);
  if (!isAiChatRequiredMet(studentCount)) {
    return `AI 챗봇과 한 번 이상 대화해 주세요: ${field.label}`;
  }
  return null;
};

const callFormAi = async (academyId, academy, user, systemInstruction, messages) => {
  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const profile = FEATURE_PROFILES.formAiChat || FEATURE_PROFILES.chat;

  try {
    const { text, tokenUsage } = await generateText({
      provider,
      apiKey: academy.aiApiKey,
      model: modelName,
      systemInstruction,
      messages,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });
    const safeText = maskSensitiveText(text || "").text;
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: !!safeText.trim(),
      errorCode: safeText.trim() ? undefined : AI_ERRORS.EMPTY_RESPONSE,
      tokenUsage,
    });
    if (!safeText.trim()) {
      throwHttp(500, AI_ERRORS.EMPTY_RESPONSE, AI_ERRORS.EMPTY_RESPONSE);
    }
    return { text: safeText, tokenUsage };
  } catch (err) {
    if (
      err.message !== AI_ERRORS.EMPTY_RESPONSE &&
      err.code !== AI_ERRORS.EMPTY_RESPONSE
    ) {
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode:
          err.status === 404
            ? AI_ERRORS.MODEL_NOT_FOUND
            : err.status === 401 || err.status === 403
              ? AI_ERRORS.INVALID_API_KEY
              : err.code || AI_ERRORS.GENERATION_FAILED,
      });
    }
    throw err;
  }
};

export const sendFormAiChatMessage = async ({
  academyId,
  user,
  form,
  board,
  fieldId,
  rowId,
  content,
  season,
  school,
  schoolRole,
}) => {
  const raw = String(content || "").trim();
  if (!raw) throwHttp(400, FIELD_REQUIRED("content"));

  const field = findAiChatField(form, fieldId);
  if (!field) throwHttp(404, __NOT_FOUND("field"));

  const respondCheck = canRespondForm(form, board, user, new Date(), schoolRole);
  if (!respondCheck.allowed) {
    throwHttp(403, respondCheck.message || PERMISSION_DENIED);
  }

  const academy = await assertFormAiInfrastructure({
    academyId,
    user,
    season,
    school,
    checkQuota: true,
  });

  const row = await ensureFormAiChatDraftRow({
    academyId,
    form,
    user,
    rowId,
  });

  if (isAiChatSendLocked(row, !!form.settings?.allowResubmit)) {
    throwHttp(403, "제출된 응답에서는 대화를 이어갈 수 없습니다.");
  }

  const session = await getOrCreateFormAiChatSession({
    academyId,
    board,
    form,
    fieldId: field._id,
    row,
    user,
  });

  const safeUserText = maskSensitiveText(raw).text;
  const userMsg = await AIChatMessage(academyId).create({
    session: session._id,
    board: board._id,
    senderType: "student",
    sender: user._id,
    senderId: user.userId,
    senderName: user.userName,
    content: safeUserText,
    skill: FORM_AI_CHAT_FEATURE,
  });

  const recent = await AIChatMessage(academyId)
    .find({ session: session._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  recent.reverse();
  const chatMessages = recent.map((msg) => ({
    role: msg.senderType === "ai" ? "assistant" : "user",
    content: maskSensitiveText(msg.content || "").text,
  }));

  const systemInstruction = buildFormAiChatSystemPrompt({ form, field, board });
  const { text, tokenUsage } = await callFormAi(
    academyId,
    academy,
    user,
    systemInstruction,
    chatMessages
  );

  const aiMsg = await AIChatMessage(academyId).create({
    session: session._id,
    board: board._id,
    senderType: "ai",
    sender: null,
    senderId: null,
    senderName: "Alter",
    content: text,
    skill: FORM_AI_CHAT_FEATURE,
    tokenUsage,
  });

  session.lastMessageAt = new Date();
  session.lastMessagePreview = text.substring(0, PREVIEW_CHARS);
  session.messageCount = (session.messageCount || 0) + 2;
  session.studentMessageCount = (session.studentMessageCount || 0) + 1;
  await session.save();
  await writeRowSummary(academyId, row, String(field._id), session);

  return {
    row,
    session,
    messages: [userMsg, aiMsg],
    summary: buildAiChatRowSummary(session),
  };
};

export const listFormAiChatSessions = async ({
  academyId,
  form,
  board,
  user,
  schoolRole,
  fieldId,
  rowId,
}) => {
  const canViewAll = canViewAllRows(form, board, user, schoolRole);
  if (!canViewAll && !isFormMember(form, board, user, schoolRole)) {
    throwHttp(403, PERMISSION_DENIED);
  }

  const query = { form: form._id };
  if (fieldId) query.fieldId = String(fieldId);
  if (rowId) query.row = rowId;
  if (!canViewAll) query.student = user._id;

  return AIChatSession(academyId).find(query).sort({ lastMessageAt: -1 }).lean();
};

export const listFormAiChatMessages = async ({
  academyId,
  form,
  board,
  user,
  schoolRole,
  sessionId,
  limit = 200,
}) => {
  const canViewAll = canViewAllRows(form, board, user, schoolRole);
  if (!canViewAll && !isFormMember(form, board, user, schoolRole)) {
    throwHttp(403, PERMISSION_DENIED);
  }

  const session = await AIChatSession(academyId).findById(sessionId);
  if (!session || String(session.form) !== String(form._id)) {
    throwHttp(404, __NOT_FOUND("session"));
  }
  if (!canViewAll && String(session.student) !== String(user._id)) {
    throwHttp(403, PERMISSION_DENIED);
  }

  const cap = Math.min(500, Math.max(1, Number(limit) || 200));
  const messages = await AIChatMessage(academyId)
    .find({ session: sessionId, isDeleted: false })
    .sort({ createdAt: 1 })
    .limit(cap)
    .lean();
  return { session, messages };
};
