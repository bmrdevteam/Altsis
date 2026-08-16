/**
 * 양식 aiChat 항목 API
 */
import { logger } from "../log/logger.js";
import { AltForm, Board, School } from "../models/index.js";
import { getUserRoleInSeason, isSeasonScopedBoard } from "../services/boards.js";
import {
  deleteFormAiChatSession,
  listFormAiChatMessages,
  listFormAiChatSessions,
  resolveSeasonForFormAi,
  sendFormAiChatMessage,
} from "../services/formAiChat.js";
import { FIELD_REQUIRED, __NOT_FOUND } from "../messages/index.js";

const schoolRoleOf = (academyId, board, user) =>
  getUserRoleInSeason(
    academyId,
    board.schoolId,
    user,
    isSeasonScopedBoard(board) ? board.season : null
  );

const loadFormBoard = async (academyId, formId) => {
  const form = await AltForm(academyId).findById(formId);
  if (!form || !form.isActive) return { error: { status: 404, message: __NOT_FOUND("form") } };
  const board = await Board(academyId).findById(form.board);
  if (!board) return { error: { status: 404, message: __NOT_FOUND("board") } };
  return { form, board };
};

const loadSchool = async (academyId, board) => {
  if (!board?.school) return null;
  return School(academyId).findById(board.school);
};

const sendServiceError = (res, err) => {
  if (err.status) {
    return res.status(err.status).send({ message: err.message });
  }
  logger.error(err.message);
  return res.status(500).send({ message: "서버 오류가 발생했습니다." });
};

/**
 * @memberof APIs.AltFormAPI
 * @function CFormAiChatMessage
 * @route POST /alt-forms/:_id/ai-chat/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const { form, board, error } = await loadFormBoard(
      req.user.academyId,
      req.params._id
    );
    if (error) return res.status(error.status).send({ message: error.message });

    const { fieldId, rowId, content, season: seasonId } = req.body || {};
    if (!fieldId) {
      return res.status(400).send({ message: FIELD_REQUIRED("fieldId") });
    }
    if (!content) {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }

    const schoolRole = await schoolRoleOf(req.user.academyId, board, req.user);
    const season = await resolveSeasonForFormAi(
      req.user.academyId,
      board,
      req.user,
      seasonId
    );
    const school = await loadSchool(req.user.academyId, board);

    const result = await sendFormAiChatMessage({
      academyId: req.user.academyId,
      user: req.user,
      form,
      board,
      fieldId,
      rowId,
      content,
      season,
      school,
      schoolRole,
    });

    return res.status(200).send({
      messages: result.messages,
      session: result.session,
      summary: result.summary,
      row: result.row,
    });
  } catch (err) {
    return sendServiceError(res, err);
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function RFormAiChatSessions
 * @route GET /alt-forms/:_id/ai-chat/sessions
 */
export const listSessions = async (req, res) => {
  try {
    const { form, board, error } = await loadFormBoard(
      req.user.academyId,
      req.params._id
    );
    if (error) return res.status(error.status).send({ message: error.message });

    const schoolRole = await schoolRoleOf(req.user.academyId, board, req.user);
    const sessions = await listFormAiChatSessions({
      academyId: req.user.academyId,
      form,
      board,
      user: req.user,
      schoolRole,
      fieldId: req.query.fieldId,
      rowId: req.query.row,
    });
    return res.status(200).send({ sessions });
  } catch (err) {
    return sendServiceError(res, err);
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function RFormAiChatMessages
 * @route GET /alt-forms/:_id/ai-chat/sessions/:sessionId/messages
 */
export const listMessages = async (req, res) => {
  try {
    const { form, board, error } = await loadFormBoard(
      req.user.academyId,
      req.params._id
    );
    if (error) return res.status(error.status).send({ message: error.message });

    const schoolRole = await schoolRoleOf(req.user.academyId, board, req.user);
    const { session, messages } = await listFormAiChatMessages({
      academyId: req.user.academyId,
      form,
      board,
      user: req.user,
      schoolRole,
      sessionId: req.params.sessionId,
      limit: req.query.limit,
    });
    return res.status(200).send({ session, messages });
  } catch (err) {
    return sendServiceError(res, err);
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function DFormAiChatSession
 * @route DELETE /alt-forms/:_id/ai-chat/sessions/:sessionId
 */
export const removeSession = async (req, res) => {
  try {
    const { form, board, error } = await loadFormBoard(
      req.user.academyId,
      req.params._id
    );
    if (error) return res.status(error.status).send({ message: error.message });

    const schoolRole = await schoolRoleOf(req.user.academyId, board, req.user);
    await deleteFormAiChatSession({
      academyId: req.user.academyId,
      form,
      board,
      user: req.user,
      schoolRole,
      sessionId: req.params.sessionId,
    });
    return res.status(200).send();
  } catch (err) {
    return sendServiceError(res, err);
  }
};
