/**
 * PostAPI namespace
 * @namespace APIs.PostAPI
 * @see TPost in {@link Models.Post}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { Board, Post, Notification, User, Registration } from "../models/index.js";
import {
  hasBoardPermission,
  getUserRoleInSeason,
  getUsersWithReadPermission,
  filterUsersByTargetAudience,
} from "../services/boards.js";
import { sendAutoNotification } from "../services/notifications.js";

import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * targetAudience 기반으로 현재 사용자가 게시글을 볼 수 있는지 확인
 * @param {Object} post - 게시글 (targetAudience 포함)
 * @param {Object} user - 현재 사용자
 * @param {string|null} role - 현재 시즌에서의 역할 ("student" | "teacher" | null)
 * @returns {boolean}
 */
const canUserSeePost = (post, user, role) => {
  // admin은 항상 볼 수 있음
  if (user.auth === "admin") return true;

  // 작성자 본인은 항상 볼 수 있음
  if (
    post.author?.equals?.(user._id) ||
    post.authorId === user.userId
  ) {
    return true;
  }

  const ta = post.targetAudience;
  if (!ta || ta.type === "all") return true;

  if (ta.type === "custom") {
    return ta.users?.some(
      (u) => u.userId === user.userId || u.user?.equals?.(user._id)
    );
  }

  if (ta.type === "manager") {
    return user.auth === "manager";
  }

  // teacher / student
  return role === ta.type;
};

/**
 * @memberof APIs.PostAPI
 * @function CPost API
 * @description 게시글 생성 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/posts"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.board - board._id
 * @param {string} req.body.title - 제목
 * @param {string} req.body.content - 내용 (Markdown)
 * @param {string?} req.body.category - 카테고리
 * @param {Object[]?} req.body.attachments - 첨부파일
 *
 * @param {Object} res
 * @param {Object} res.post - 생성된 게시글
 */
export const create = async (req, res) => {
  try {
    for (let field of ["board", "title", "content"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const board = await Board(req.user.academyId).findById(req.body.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 쓰기 권한 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!hasBoardPermission(board, "write", req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // targetAudience 설정
    const targetAudience = req.body.targetAudience || { type: "all" };

    const post = await Post(req.user.academyId).create({
      board: board._id,
      author: req.user._id,
      authorId: req.user.userId,
      authorName: req.user.userName,
      authorProfile: req.user.profile,
      title: req.body.title,
      content: req.body.content,
      category: req.body.category || "",
      attachments: req.body.attachments || [],
      targetAudience,
    });

    // 게시글 수 증가
    board.postCount = (board.postCount || 0) + 1;
    await board.save();

    // 대상 지정에 따라 알림 발송 (작성자 제외)
    try {
      logger.info(
        `Post created with targetAudience: ${JSON.stringify(targetAudience)}`
      );

      const usersWithPermission = await filterUsersByTargetAudience(
        req.user.academyId,
        board,
        targetAudience
      );

      logger.info(
        `Users with permission: ${usersWithPermission.length} users`
      );

      const notifyUsers = usersWithPermission.filter(
        (u) => u.userId !== req.user.userId
      );

      logger.info(
        `Sending notifications to ${notifyUsers.length} users for new post: ${post.title}`
      );

      if (notifyUsers.length > 0) {
        const result = await sendAutoNotification({
          academyId: req.user.academyId,
          toUserList: notifyUsers.slice(0, 100), // 최대 100명까지
          notificationType: "newPost",
          category: board.name,
          title: `[새 게시글] ${post.title}`,
          description: `${board.name}에 새 게시글이 등록되었습니다.`,
          relatedEntity: { type: "post", id: post._id },
          fromUser: req.user,
        });
        logger.info(
          `Notifications created: ${result?.length || 0} notifications`
        );
      }
    } catch (notifyErr) {
      // 알림 실패는 게시글 생성 성공에 영향을 주지 않음
      logger.error(`Failed to send notifications: ${notifyErr.message}`);
      logger.error(notifyErr.stack);
    }

    return res.status(200).send({ post });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function RPosts/RPost API
 * @description 게시글 목록/상세 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/posts/:_id?"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.board - board._id (목록 조회시)
 * @param {number?} req.query.limit - 페이지 크기 (기본 20)
 * @param {string?} req.query.before - 이전 페이지 기준 날짜 (ISO string)
 *
 * @param {Object} res
 * @param {Object[]} res.posts - 게시글 목록 또는
 * @param {Object} res.post - 게시글 상세
 */
export const find = async (req, res) => {
  try {
    /* RPost */
    if (req.params._id) {
      let post = await Post(req.user.academyId).findById(req.params._id);
      let isLegacyNotification = false;

      // Post를 찾지 못하면 기존 알림(Notification)에서 찾기
      if (!post || !post.isActive) {
        const notification = await Notification(req.user.academyId).findOne({
          _id: req.params._id,
          type: "sent",
        });

        if (notification) {
          isLegacyNotification = true;
          // 기본 게시판 찾기
          const defaultBoard = await Board(req.user.academyId).findOne({
            isDefault: true,
          });

          if (!defaultBoard) {
            return res.status(404).send({ message: __NOT_FOUND("board") });
          }

          // 알림을 게시글 형태로 변환
          post = {
            _id: notification._id,
            board: defaultBoard._id,
            author: notification.user,
            authorId: notification.userId,
            authorName: notification.userName,
            title: notification.title,
            content: notification.description || "",
            category: notification.category || "",
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
            viewCount: 0,
            isPinned: false,
            isActive: true,
            isLegacyNotification: true,
            targetAudience: notification.toUserList?.length > 0
              ? { type: "custom", users: notification.toUserList }
              : { type: "all" },
          };

          // 읽기 권한 확인
          const role = await getUserRoleInSeason(
            req.user.academyId,
            defaultBoard.schoolId,
            req.user
          );
          if (!hasBoardPermission(defaultBoard, "read", req.user, role)) {
            return res.status(403).send({ message: PERMISSION_DENIED });
          }

          // targetAudience 기반 권한 확인
          if (!canUserSeePost(post, req.user, role)) {
            return res.status(403).send({ message: PERMISSION_DENIED });
          }

          return res.status(200).send({ post, board: defaultBoard });
        }

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

      // targetAudience 기반 권한 확인
      if (!canUserSeePost(post, req.user, role)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      // 조회수 증가
      post.viewCount = (post.viewCount || 0) + 1;
      await post.save();

      return res.status(200).send({ post, board });
    }

    /* RPosts */
    if (!("board" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("board") });
    }

    const board = await Board(req.user.academyId).findById(req.query.board);
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

    const limit = parseInt(req.query.limit) || 20;
    const query = { board: board._id, isActive: true };

    if (req.query.before) {
      query.createdAt = { $lt: new Date(req.query.before) };
    }

    // 고정 게시글 먼저, 그 다음 최신순
    const posts = await Post(req.user.academyId)
      .find(query)
      .select("-content") // 목록에서는 내용 제외
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit);

    // targetAudience 기반 필터링
    const filteredPosts = posts.filter((post) =>
      canUserSeePost(post, req.user, role)
    );

    // 기본 게시판(공지사항)인 경우 기존 알림(Notification)도 포함
    let combinedPosts = filteredPosts;
    if (board.isDefault) {
      const notificationQuery = { type: "sent" };
      if (req.query.before) {
        notificationQuery.createdAt = { $lt: new Date(req.query.before) };
      }

      const oldNotifications = await Notification(req.user.academyId)
        .find(notificationQuery)
        .sort({ createdAt: -1 })
        .limit(limit);

      // 알림을 게시글 형태로 변환
      const notificationAsPosts = oldNotifications.map((n) => ({
        _id: n._id,
        board: board._id,
        author: n.user,
        authorId: n.userId,
        authorName: n.userName,
        title: n.title,
        category: n.category || "",
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        viewCount: 0,
        isPinned: false,
        isActive: true,
        isLegacyNotification: true, // 기존 알림임을 표시
        targetAudience: n.toUserList?.length > 0
          ? { type: "custom", users: n.toUserList }
          : { type: "all" },
      }));

      // 작성자의 게시판 쓰기 권한 확인 (권한 없는 사용자의 알림 제외)
      const authorIds = [
        ...new Set(
          oldNotifications.map((n) => n.user?.toString()).filter(Boolean)
        ),
      ];
      const [authorUsers, authorRegs] = await Promise.all([
        User(req.user.academyId)
          .find({ _id: { $in: authorIds } })
          .select("_id auth"),
        Registration(req.user.academyId)
          .find({
            user: { $in: authorIds },
            schoolId: board.schoolId,
            isActivated: true,
          })
          .select("user role"),
      ]);
      const authMap = new Map(
        authorUsers.map((u) => [u._id.toString(), u.auth])
      );
      const roleMap = new Map(
        authorRegs.map((r) => [r.user.toString(), r.role])
      );

      const writePermittedNotifications = notificationAsPosts.filter((n) => {
        const aid = n.author?.toString();
        const auth = authMap.get(aid);
        if (auth === "admin") return true;
        if (auth === "manager" && board.permissionWrite.manager) return true;
        const authorRole = roleMap.get(aid);
        if (authorRole === "teacher" && board.permissionWrite.teacher)
          return true;
        if (authorRole === "student" && board.permissionWrite.student)
          return true;
        return false;
      });

      // targetAudience 기반 필터링 (레거시 알림)
      const filteredNotifications = writePermittedNotifications.filter((post) =>
        canUserSeePost(post, req.user, role)
      );

      // 게시글과 알림을 합쳐서 날짜순 정렬
      combinedPosts = [...filteredPosts, ...filteredNotifications]
        .sort((a, b) => {
          // 고정 게시글 우선
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // 날짜 역순
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, limit);
    }

    return res.status(200).send({ posts: combinedPosts, board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function UPost API
 * @description 게시글 수정 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/posts/:_id"} req.url
 *
 * @param {Object} req.body
 * @param {string?} req.body.title - 제목
 * @param {string?} req.body.content - 내용
 * @param {string?} req.body.category - 카테고리
 * @param {Object[]?} req.body.attachments - 첨부파일
 *
 * @param {Object} res
 * @param {Object} res.post - 수정된 게시글
 */
export const update = async (req, res) => {
  try {
    const post = await Post(req.user.academyId).findById(req.params._id);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    // 작성자 또는 관리자만 수정 가능
    const isAuthor = post.author.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";

    if (!isAuthor && !isManager) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (req.body.title) post.title = req.body.title;
    if (req.body.content) post.content = req.body.content;
    if ("category" in req.body) post.category = req.body.category;
    if (req.body.attachments) post.attachments = req.body.attachments;
    if (req.body.targetAudience) post.targetAudience = req.body.targetAudience;

    await post.save();

    return res.status(200).send({ post });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function UPostPin API
 * @description 게시글 고정/해제 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/posts/:_id/pin"} req.url
 *
 * @param {Object} req.body
 * @param {boolean} req.body.isPinned - 고정 여부
 *
 * @param {Object} res
 * @param {Object} res.post - 수정된 게시글
 */
export const pin = async (req, res) => {
  try {
    const post = await Post(req.user.academyId).findById(req.params._id);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    if (!("isPinned" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("isPinned") });
    }

    post.isPinned = req.body.isPinned;
    await post.save();

    return res.status(200).send({ post });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function DPost API
 * @description 게시글 삭제 API (soft delete)
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/posts/:_id"} req.url
 *
 * @param {Object} res
 */
export const remove = async (req, res) => {
  try {
    const post = await Post(req.user.academyId).findById(req.params._id);

    // Post를 찾지 못하면 기존 알림(Notification)에서 찾기
    if (!post || !post.isActive) {
      const notification = await Notification(req.user.academyId).findOne({
        _id: req.params._id,
        type: "sent",
      });

      if (notification) {
        // 작성자 또는 관리자만 삭제 가능
        const isAuthor = notification.user?.equals(req.user._id);
        const isManager =
          req.user.auth === "admin" || req.user.auth === "manager";

        if (!isAuthor && !isManager) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }

        // 레거시 알림 삭제
        await Notification(req.user.academyId).deleteOne({
          _id: req.params._id,
        });

        return res.status(200).send();
      }

      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    // 작성자 또는 관리자만 삭제 가능
    const isAuthor = post.author.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";

    if (!isAuthor && !isManager) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    post.isActive = false;
    await post.save();

    // 게시글 수 감소
    const board = await Board(req.user.academyId).findById(post.board);
    if (board) {
      board.postCount = Math.max(0, (board.postCount || 0) - 1);
      await board.save();
    }

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
