/**
 * BoardFavoriteAPI namespace
 * @namespace APIs.BoardFavoriteAPI
 * @see TBoardFavorite in {@link Models.BoardFavorite}
 */
import { logger } from "../log/logger.js";
import { Board, BoardFavorite } from "../models/index.js";

import {
  FIELD_REQUIRED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.BoardFavoriteAPI
 * @function RBoardFavorites API
 * @description 사용자의 보드 즐겨찾기 목록 조회
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/board-favorites"} req.url
 * @param {Object} req.query
 * @param {string} req.query.school - school._id
 *
 * @param {Object} res
 * @param {Object[]} res.boardFavorites - 즐겨찾기 목록
 */
export const find = async (req, res) => {
  try {
    if (!req.query.school) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    const boardFavorites = await BoardFavorite(req.user.academyId)
      .find({
        user: req.user._id,
        school: req.query.school,
      })
      .sort({ order: 1, createdAt: 1 });

    return res.status(200).send({ boardFavorites });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardFavoriteAPI
 * @function CBoardFavorite API
 * @description 보드 즐겨찾기 추가
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/board-favorites"} req.url
 * @param {Object} req.body
 * @param {string} req.body.board - board._id
 * @param {string} req.body.school - school._id
 *
 * @param {Object} res
 * @param {Object} res.boardFavorite - 생성된 즐겨찾기
 */
export const create = async (req, res) => {
  try {
    for (let field of ["board", "school"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    // 보드 존재 확인
    const board = await Board(req.user.academyId).findById(req.body.board);
    if (!board || !board.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 중복 체크 - 이미 즐겨찾기된 경우 기존 항목 반환
    const existing = await BoardFavorite(req.user.academyId).findOne({
      user: req.user._id,
      board: req.body.board,
    });
    if (existing) {
      return res.status(200).send({ boardFavorite: existing });
    }

    const boardFavorite = await BoardFavorite(req.user.academyId).create({
      user: req.user._id,
      board: req.body.board,
      school: req.body.school,
    });

    return res.status(200).send({ boardFavorite });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardFavoriteAPI
 * @function DBoardFavorite API
 * @description 보드 즐겨찾기 삭제
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/board-favorites/:_id"} req.url
 *
 * @param {Object} res
 */
export const remove = async (req, res) => {
  try {
    const boardFavorite = await BoardFavorite(req.user.academyId).findById(
      req.params._id
    );
    if (!boardFavorite) {
      return res.status(404).send({ message: __NOT_FOUND("boardFavorite") });
    }

    // 본인의 즐겨찾기만 삭제 가능
    if (!boardFavorite.user.equals(req.user._id)) {
      return res.status(403).send({ message: "권한이 없습니다." });
    }

    await boardFavorite.deleteOne();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardFavoriteAPI
 * @function DBoardFavoriteByBoard API
 * @description 보드 ID로 즐겨찾기 삭제 (토글용)
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/board-favorites/board/:boardId"} req.url
 *
 * @param {Object} res
 */
export const removeByBoard = async (req, res) => {
  try {
    const result = await BoardFavorite(req.user.academyId).findOneAndDelete({
      user: req.user._id,
      board: req.params.boardId,
    });

    if (!result) {
      return res.status(404).send({ message: __NOT_FOUND("boardFavorite") });
    }

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
