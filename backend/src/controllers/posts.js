/**
 * PostAPI namespace
 * @namespace APIs.PostAPI
 * @see TPost in {@link Models.Post}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { Board, Post, Notification, User, Registration, SurveyResponse } from "../models/index.js";
import {
  isBoardMember,
  isBoardWriter,
  getUserRoleInSeason,
  getBoardMembers,
  getPostReaders,
  validatePostPermission,
  canUserSeePost,
} from "../services/boards.js";
import { sendAutoNotification } from "../services/notifications.js";

import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
  LIMIT_FILE_SIZE,
  INVALID_FILE_TYPE,
} from "../messages/index.js";
import { postMulter, isImageFile } from "../_s3/postMulter.js";
import { signUrl, signUrlForView, fileS3, fileBucket } from "../_s3/fileBucket.js";

/**
 * @memberof APIs.PostAPI
 * @function CPost API
 * @description 게시글 생성 API
 * @version 2.0.0
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
 * @param {Object?} req.body.permissionRead - 읽기 권한 (null이면 전체 멤버)
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

    // 작성 권한 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!isBoardWriter(board, req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // permissionRead 검증 (보드 멤버 범위 내인지)
    const permissionRead = req.body.permissionRead || null;
    if (permissionRead) {
      const validation = validatePostPermission(board, permissionRead);
      if (!validation.valid) {
        return res.status(400).send({ message: validation.message });
      }
    }

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
      ...(permissionRead && { permissionRead }),
      ...(req.body.survey && { survey: req.body.survey }),
    });

    // 게시글 수 증가
    board.postCount = (board.postCount || 0) + 1;
    await board.save();

    // 열람 권한 대상에게 알림 발송 (작성자 제외)
    try {
      const usersWithPermission = await getPostReaders(
        req.user.academyId,
        board,
        post
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function RPosts/RPost API
 * @description 게시글 목록/상세 조회 API
 * @version 2.0.0
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

          // 멤버 확인
          const role = await getUserRoleInSeason(
            req.user.academyId,
            defaultBoard.schoolId,
            req.user
          );
          if (!isBoardMember(defaultBoard, req.user, role)) {
            return res.status(403).send({ message: PERMISSION_DENIED });
          }

          // 열람 권한 확인
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

      // 멤버 확인
      const role = await getUserRoleInSeason(
        req.user.academyId,
        board.schoolId,
        req.user
      );
      if (!isBoardMember(board, req.user, role)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      // 열람 권한 확인
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

    // 멤버 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!isBoardMember(board, req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const query = { board: board._id, isActive: true };

    if (req.query.before) {
      query.createdAt = { $lt: new Date(req.query.before) };
    }

    // 고정 게시글 먼저, 그 다음 최신순
    const includeContent = req.query.includeContent === "true";
    const postQuery = Post(req.user.academyId)
      .find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit);
    if (!includeContent) {
      postQuery.select("-content");
    }
    const posts = await postQuery;

    // 열람 권한 기반 필터링
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
        isLegacyNotification: true,
        targetAudience: n.toUserList?.length > 0
          ? { type: "custom", users: n.toUserList }
          : { type: "all" },
      }));

      // 작성자의 보드 작성 권한 확인
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
        // 레거시: permissionWrite 기반 체크
        const writerGroups = board.writers?.groups || board.permissionWrite || {};
        if (auth === "manager" && writerGroups.manager) return true;
        const authorRole = roleMap.get(aid);
        if (authorRole === "teacher" && writerGroups.teacher) return true;
        if (authorRole === "student" && writerGroups.student) return true;
        return false;
      });

      // 열람 권한 필터링 (레거시 알림)
      const filteredNotifications = writePermittedNotifications.filter((post) =>
        canUserSeePost(post, req.user, role)
      );

      // 게시글과 알림을 합쳐서 날짜순 정렬
      combinedPosts = [...filteredPosts, ...filteredNotifications]
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, limit);
    }

    return res.status(200).send({ posts: combinedPosts, board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function UPost API
 * @description 게시글 수정 API
 * @version 2.0.0
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

    // permissionRead 수정 + 검증
    if ("permissionRead" in req.body) {
      if (req.body.permissionRead) {
        const board = await Board(req.user.academyId).findById(post.board);
        if (board) {
          const validation = validatePostPermission(board, req.body.permissionRead);
          if (!validation.valid) {
            return res.status(400).send({ message: validation.message });
          }
        }
        post.permissionRead = req.body.permissionRead;
      } else {
        // null 전송 시 → 전체 멤버 공개로 변경
        post.permissionRead = undefined;
      }
      post.markModified("permissionRead");
    }

    // 하위호환: targetAudience
    if (req.body.targetAudience) post.targetAudience = req.body.targetAudience;

    // 설문 수정
    if ("survey" in req.body) {
      if (req.body.survey) {
        // 응답이 있으면 질문 구조 변경 차단
        if (post.survey && post.survey.responseCount > 0) {
          return res.status(400).send({
            message: "이미 응답이 있는 설문의 질문을 수정할 수 없습니다.",
          });
        }
        post.survey = req.body.survey;
      } else {
        post.survey = null;
      }
      post.markModified("survey");
    }

    await post.save();

    return res.status(200).send({ post });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function RPostReaders API
 * @description 게시글 열람 대상 사용자 목록 조회 API
 * @version 2.0.0
 */
export const findReaders = async (req, res) => {
  try {
    const post = await Post(req.user.academyId).findById(req.params._id);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 멤버 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!isBoardMember(board, req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const users = await getPostReaders(req.user.academyId, board, post);
    return res.status(200).send({ users });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function UPostPin API
 * @description 게시글 고정/해제 API
 * @version 1.0.0
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function DPost API
 * @description 게시글 삭제 API (soft delete)
 * @version 1.0.0
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
        const isAuthor = notification.user?.equals(req.user._id);
        const isManager =
          req.user.auth === "admin" || req.user.auth === "manager";

        if (!isAuthor && !isManager) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }

        await Notification(req.user.academyId).deleteOne({
          _id: req.params._id,
        });

        return res.status(200).send();
      }

      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const isAuthor = post.author.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";

    if (!isAuthor && !isManager) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    post.isActive = false;
    await post.save();

    const board = await Board(req.user.academyId).findById(post.board);
    if (board) {
      board.postCount = Math.max(0, (board.postCount || 0) - 1);
      await board.save();
    }

    // 설문 응답 정리
    if (post.survey) {
      await SurveyResponse(req.user.academyId).deleteMany({ post: post._id });
    }

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function CUploadPostFile API
 * @description 게시글 첨부파일 업로드 API
 * @version 1.0.0
 */
export const uploadFile = async (req, res) => {
  postMulter.single("file")(req, {}, async (err) => {
    if (err) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        case "INVALID_FILE_TYPE":
          return res.status(409).send({ message: INVALID_FILE_TYPE });
        default:
          return res.status(500).send({ message: err.code });
      }
    }

    try {
      const isImage = req.tmp.isImage;

      // 이미지: 인라인 삽입용 7일 서명 URL, 비이미지: 5분 서명 URL
      const viewUrl = signUrlForView(
        req.tmp.key,
        isImage ? 60 * 60 * 24 * 7 : undefined
      );
      const { preSignedUrl, expiryDate } = signUrl(
        req.tmp.key,
        req.file.originalname
      );

      return res.status(200).send({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        key: req.tmp.key,
        url: req.file.location,
        isImage,
        viewUrl,
        preSignedUrl,
        expiryDate,
      });
    } catch (err) {
      logger.error(err.message);
      return res.status(500).send({ message: "서버 오류가 발생했습니다." });
    }
  });
};

/**
 * @memberof APIs.PostAPI
 * @function viewFile API
 * @description 게시글 파일 인라인 보기 (302 리다이렉트)
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/posts/file/view"} req.url
 * @param {string} req.query.key - S3 key
 */
export const viewFile = async (req, res) => {
  try {
    if (!req.query.key) {
      return res.status(400).send({ message: FIELD_REQUIRED("key") });
    }

    const keys = req.query.key.split("/");
    if (keys[1] !== "posts") {
      return res.status(400).send({ message: FIELD_INVALID("key") });
    }

    const data = await fileS3
      .getObject({ Bucket: fileBucket, Key: req.query.key })
      .promise();

    res.set("Content-Type", data.ContentType);
    res.set("Content-Length", String(data.ContentLength));
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    return res.send(data.Body);
  } catch (err) {
    if (err.code === "NoSuchKey") {
      return res.status(404).send({ message: "파일을 찾을 수 없습니다." });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.PostAPI
 * @function RSignedUrlPostFile API
 * @description 게시글 첨부파일 서명된 URL 조회 API
 * @version 1.0.0
 */
export const signPostFile = async (req, res) => {
  try {
    for (let field of ["key", "fileName"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const keys = req.query.key.split("/");
    if (keys[1] !== "posts") {
      return res.status(400).send({ message: FIELD_INVALID("key") });
    }

    if (req.query.view === "true") {
      const preSignedUrl = signUrlForView(req.query.key);
      return res.status(200).send({ preSignedUrl });
    }

    const { preSignedUrl, expiryDate } = signUrl(
      req.query.key,
      req.query.fileName
    );

    return res.status(200).send({ preSignedUrl, expiryDate });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
