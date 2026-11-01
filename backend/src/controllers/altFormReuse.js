/**
 * 자신의 양식·공유된 양식 검색과, 현재 보드로 구조만 복사.
 */
import { logger } from "../log/logger.js";
import { AltForm, Board } from "../models/index.js";
import { canManageForm } from "../services/altForms.js";
import { cloneAltFormToBoard } from "../services/altFormClone.js";
import {
  canReuseAltFormSource,
  listReusableAltForms,
} from "../services/altFormReuse.js";
import { assertNewAiChatFieldsAllowed } from "../services/formAiChat.js";
import { getUserRoleInSeason, isSeasonScopedBoard } from "../services/boards.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

const sameSchool = (a, b) => String(a?.school || "") === String(b?.school || "");

/**
 * @memberof APIs.AltFormAPI
 * @function RReusableAltForms API
 * @description 현재 보드에 복사할 수 있는 자신의 양식·공유된 양식
 */
export const listReusable = async (req, res) => {
  try {
    if (!req.query.board) {
      return res.status(400).send({ message: FIELD_REQUIRED("board") });
    }

    const board = await Board(req.user.academyId).findById(req.query.board);
    if (!board || !board.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }
    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const result = await listReusableAltForms({
      academyId: req.user.academyId,
      user: req.user,
      targetBoard: board,
      query: req.query.q || "",
      excludeId: req.query.exclude || "",
    });
    return res.status(200).send(result);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function CReuseAltForm API
 * @description 양식 구조만 대상 보드에 비공개 초안으로 복사 (응답 행 없음)
 */
export const reuse = async (req, res) => {
  try {
    if (!req.body?.board) {
      return res.status(400).send({ message: FIELD_REQUIRED("board") });
    }

    const original = await AltForm(req.user.academyId).findById(req.params._id);
    if (!original || !original.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const sourceBoard = await Board(req.user.academyId).findById(original.board);
    if (!sourceBoard || !sourceBoard.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const sourceRole = await getUserRoleInSeason(
      req.user.academyId,
      sourceBoard.schoolId,
      req.user,
      isSeasonScopedBoard(sourceBoard) ? sourceBoard.season : null
    );
    if (!canReuseAltFormSource(original, sourceBoard, req.user, sourceRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const targetBoard = await Board(req.user.academyId).findById(req.body.board);
    if (!targetBoard || !targetBoard.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }
    if (!sameSchool(sourceBoard, targetBoard)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
    if (!canManageForm(targetBoard, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    try {
      await assertNewAiChatFieldsAllowed({
        academyId: req.user.academyId,
        user: req.user,
        board: targetBoard,
        previousFields: [],
        nextFields: original.fields,
        requestedSeasonId: req.body.season,
      });
    } catch (e) {
      if (e.status) {
        return res.status(e.status).send({ message: e.message });
      }
      throw e;
    }

    const { form, sheet } = await cloneAltFormToBoard(
      req.user.academyId,
      original,
      targetBoard,
      req.user,
      { keepTitle: false, forceDraft: true }
    );
    return res.status(200).send({ form, sheet });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
