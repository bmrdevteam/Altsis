/**
 * AltFormFavoriteAPI namespace
 * @namespace APIs.AltFormFavoriteAPI
 * @see TAltFormFavorite in {@link Models.AltFormFavorite}
 */
import { logger } from "../log/logger.js";
import { AltForm, AltFormFavorite, Board } from "../models/index.js";
import { isFormMember } from "../services/altForms.js";
import { getUserRoleInSeason, isSeasonScopedBoard } from "../services/boards.js";

import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.AltFormFavoriteAPI
 * @function CAltFormFavorite API
 * @description 활동(양식) 즐겨찾기 추가
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/alt-form-favorites"} req.url
 * @param {Object} req.body
 * @param {string} req.body.form - altForm._id
 * @param {string} req.body.board - board._id
 * @param {string} req.body.school - school._id
 *
 * @param {Object} res
 * @param {Object} res.altFormFavorite - 생성된 즐겨찾기
 */
export const create = async (req, res) => {
  try {
    for (let field of ["form", "board", "school"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await AltForm(req.user.academyId).findById(req.body.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }
    if (String(form.board) !== String(req.body.board)) {
      return res.status(400).send({ message: FIELD_INVALID("board") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board || !board.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user,
      isSeasonScopedBoard(board) ? board.season : null
    );

    if (form.isDraft) {
      const isCreator = form.creator && form.creator.equals(req.user._id);
      if (!isCreator) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else if (!isFormMember(form, board, req.user, schoolRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const existing = await AltFormFavorite(req.user.academyId).findOne({
      user: req.user._id,
      form: req.body.form,
    });
    if (existing) {
      return res.status(200).send({ altFormFavorite: existing });
    }

    const altFormFavorite = await AltFormFavorite(req.user.academyId).create({
      user: req.user._id,
      form: req.body.form,
      board: req.body.board,
      school: req.body.school,
    });

    return res.status(200).send({ altFormFavorite });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormFavoriteAPI
 * @function DAltFormFavoriteByForm API
 * @description 양식 ID로 즐겨찾기 삭제 (토글용)
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/alt-form-favorites/form/:formId"} req.url
 *
 * @param {Object} res
 */
export const removeByForm = async (req, res) => {
  try {
    const result = await AltFormFavorite(req.user.academyId).findOneAndDelete({
      user: req.user._id,
      form: req.params.formId,
    });

    if (!result) {
      return res.status(404).send({ message: __NOT_FOUND("altFormFavorite") });
    }

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
