/**
 * CommentAPI namespace
 * @namespace APIs.CommentAPI
 * @see TComment in {@link Models.Comment}
 */
import { logger } from "../log/logger.js";
import { Board, Post, Comment } from "../models/index.js";
import {
  hasBoardPermission,
  getUserRoleInSeason,
} from "../services/boards.js";

import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.CommentAPI
 * @function CComment API
 * @description 댓글 생성 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/comments"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.post - post._id
 * @param {string} req.body.content - 댓글 내용
 * @param {string?} req.body.parentComment - 부모 댓글 _id (대댓글인 경우)
 *
 * @param {Object} res
 * @param {Object} res.comment - 생성된 댓글
 */
export const create = async (req, res) => {
  try {
    for (let field of ["post", "content"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const post = await Post(req.user.academyId).findById(req.body.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 댓글 권한 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!hasBoardPermission(board, "comment", req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 부모 댓글 확인 (대댓글인 경우)
    if (req.body.parentComment) {
      const parentComment = await Comment(req.user.academyId).findById(
        req.body.parentComment
      );
      if (!parentComment || !parentComment.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("parentComment") });
      }
      // 부모 댓글이 같은 게시글에 속해야 함
      if (!parentComment.post.equals(post._id)) {
        return res.status(400).send({ message: "Parent comment is not in the same post" });
      }
    }

    const comment = await Comment(req.user.academyId).create({
      post: post._id,
      author: req.user._id,
      authorId: req.user.userId,
      authorName: req.user.userName,
      authorProfile: req.user.profile,
      content: req.body.content,
      parentComment: req.body.parentComment || null,
    });

    return res.status(200).send({ comment });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.CommentAPI
 * @function RComments API
 * @description 게시글의 댓글 목록 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/comments"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.post - post._id
 *
 * @param {Object} res
 * @param {Object[]} res.comments - 댓글 목록
 */
export const find = async (req, res) => {
  try {
    if (!("post" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("post") });
    }

    const post = await Post(req.user.academyId).findById(req.query.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 읽기 권한 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!hasBoardPermission(board, "read", req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 댓글 목록 조회 (오래된 순)
    const comments = await Comment(req.user.academyId)
      .find({ post: post._id, isActive: true })
      .sort({ createdAt: 1 });

    return res.status(200).send({ comments });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.CommentAPI
 * @function UComment API
 * @description 댓글 수정 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/comments/:_id"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.content - 댓글 내용
 *
 * @param {Object} res
 * @param {Object} res.comment - 수정된 댓글
 */
export const update = async (req, res) => {
  try {
    const comment = await Comment(req.user.academyId).findById(req.params._id);
    if (!comment || !comment.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("comment") });
    }

    // 작성자 또는 관리자만 수정 가능
    const isAuthor = comment.author.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";

    if (!isAuthor && !isManager) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (req.body.content) {
      comment.content = req.body.content;
    }

    await comment.save();

    return res.status(200).send({ comment });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.CommentAPI
 * @function DComment API
 * @description 댓글 삭제 API (soft delete)
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/comments/:_id"} req.url
 *
 * @param {Object} res
 */
export const remove = async (req, res) => {
  try {
    const comment = await Comment(req.user.academyId).findById(req.params._id);
    if (!comment || !comment.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("comment") });
    }

    // 작성자 또는 관리자만 삭제 가능
    const isAuthor = comment.author.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";

    if (!isAuthor && !isManager) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    comment.isActive = false;
    await comment.save();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
