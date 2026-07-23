/**
 * PostAPI namespace
 * @namespace APIs.PostAPI
 * @see TPost in {@link Models.Post}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import https from "https";
import http from "http";
import zlib from "zlib";
import { AltForm, AltSheet, AltSheetRow, Board, Post, SurveyResponse } from "../models/index.js";
import {
  parseSheetDeclaration,
  renderMerge,
  stripMergeTags,
} from "../utils/mergeEngine.js";
import { getAltBoardRole } from "../services/altForms.js";
import {
  isBoardMember,
  isBoardWriter,
  getUserRoleInSeason,
  getBoardMembers,
  getPostReaders,
  validatePostPermission,
  canUserSeePost,
} from "../services/boards.js";
import { sendAutoNotification, isBoardNotificationEnabled } from "../services/notifications.js";

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

/** 시트명 또는 동일 제목 양식으로 AltSheet 해석 (조회 시 name 무단 변경 없음) */
const resolveAltSheetByName = async (academyId, boardId, sheetName) => {
  let sheet = await AltSheet(academyId).findOne({
    board: boardId,
    name: sheetName,
    isActive: true,
  });
  if (sheet) return sheet;

  const formByTitle = await AltForm(academyId).findOne({
    board: boardId,
    title: sheetName,
    isActive: true,
  });
  if (!formByTitle) return null;

  return AltSheet(academyId).findOne({
    form: formByTitle._id,
    isActive: true,
  });
};

/**
 * 문서 머지 행 필터 (필드별 + 키워드).
 * filters JSON: { _keyword?, _respondentName?, [라벨]: string | {from,to} }
 */
const applyMergeRowFilters = (rowQuery, filters, form) => {
  if (!filters || typeof filters !== "object") return;

  const labelMap = new Map(
    (form.fields || []).map((f) => [f.label, f._id.toString()])
  );
  const fieldTypeMap = new Map(
    (form.fields || []).map((f) => [f.label, f.type])
  );
  const andParts = [];

  for (const [label, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;

    if (label === "_keyword") {
      const kw = String(value).trim();
      if (!kw) continue;
      const or = [
        { _respondentName: { $regex: kw, $options: "i" } },
        { _respondentId: { $regex: kw, $options: "i" } },
      ];
      for (const f of form.fields || []) {
        or.push({
          [`data.${f._id.toString()}`]: { $regex: kw, $options: "i" },
        });
      }
      andParts.push({ $or: or });
      continue;
    }

    if (label === "_respondentName") {
      andParts.push({
        _respondentName: { $regex: String(value), $options: "i" },
      });
      continue;
    }

    const fieldId = labelMap.get(label);
    if (!fieldId) continue;

    if (typeof value === "object" && (value.from || value.to)) {
      const dateQuery = {};
      if (value.from) dateQuery.$gte = value.from;
      if (value.to) dateQuery.$lte = value.to;
      const fieldType = fieldTypeMap.get(label);
      if (fieldType === "multiDate") {
        andParts.push({ [`data.${fieldId}`]: { $elemMatch: dateQuery } });
      } else {
        andParts.push({ [`data.${fieldId}`]: dateQuery });
      }
    } else {
      andParts.push({
        [`data.${fieldId}`]: { $regex: String(value), $options: "i" },
      });
    }
  }

  if (andParts.length === 0) return;

  if (rowQuery.$and) {
    rowQuery.$and.push(...andParts);
  } else if (rowQuery.$or) {
    // 가시성 $or 와 필터를 AND로 결합
    rowQuery.$and = [{ $or: rowQuery.$or }, ...andParts];
    delete rowQuery.$or;
  } else {
    if (andParts.length === 1) {
      Object.assign(rowQuery, andParts[0]);
    } else {
      rowQuery.$and = andParts;
    }
  }
};

/**
 * @memberof APIs.PostAPI
 * @function SearchPosts API
 * @description 게시물 검색 API (CommandPalette용)
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/posts/search"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.school - school._id
 * @param {string} req.query.q - 검색 키워드
 *
 * @param {Object} res
 * @param {Object[]} res.posts - 검색 결과 게시글 목록 (boardName 포함)
 */
export const search = async (req, res) => {
  try {
    const { school, q } = req.query;
    if (!school || !q || q.trim().length < 2) {
      return res.status(200).send({ posts: [] });
    }

    const keyword = q.trim();

    // 해당 학교의 활성 보드 조회
    const boards = await Board(req.user.academyId).find({
      school,
      isActive: { $ne: false },
    });

    if (!boards.length) {
      return res.status(200).send({ posts: [] });
    }

    // 사용자가 멤버인 보드만 필터
    const accessibleBoards = [];
    const boardMap = new Map();
    for (const board of boards) {
      const role = await getUserRoleInSeason(
        req.user.academyId,
        board.schoolId,
        req.user
      );
      if (isBoardMember(board, req.user, role)) {
        accessibleBoards.push(board);
        boardMap.set(board._id.toString(), { board, role });
      }
    }

    if (!accessibleBoards.length) {
      return res.status(200).send({ posts: [] });
    }

    // 접근 가능한 보드에서 제목으로 검색
    const boardIds = accessibleBoards.map((b) => b._id);
    const posts = await Post(req.user.academyId)
      .find({
        board: { $in: boardIds },
        isActive: true,
        title: { $regex: keyword, $options: "i" },
      })
      .select("-content")
      .sort({ createdAt: -1 })
      .limit(20);

    // 열람 권한 필터링 + board 정보 추가
    const results = [];
    for (const post of posts) {
      if (results.length >= 10) break;
      const { board, role } = boardMap.get(post.board.toString());
      if (canUserSeePost(post, req.user, role)) {
        const postObj = post.toObject();
        postObj.boardName = board.name;
        results.push(postObj);
      }
    }

    return res.status(200).send({ posts: results });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

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

    // postType 자동 결정 (첨부 기반)
    const surveys = req.body.surveys || [];
    let postType = req.body.postType || "general";
    if (surveys.length > 0 && surveys.some((s) => s.questions?.length)) {
      postType = "survey";
    }

    // 설문 게시글 검증
    if (postType === "survey") {
      if (!surveys.length || !surveys.some((s) => s.questions?.length)) {
        return res.status(400).send({ message: "설문 게시글은 최소 1개의 설문이 필요합니다." });
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
      postType,
      category: req.body.category || "",
      attachments: req.body.attachments || [],
      ...(permissionRead && { permissionRead }),
      ...(surveys.length > 0 && { surveys }),
    });

    // 게시글 수 증가
    board.postCount = (board.postCount || 0) + 1;
    await board.save();

    // 열람 권한 대상에게 알림 발송 (작성자 제외)
    try {
      const notifEnabled = await isBoardNotificationEnabled(
        req.user.academyId,
        board.school,
        board,
        "newPost"
      );

      if (notifEnabled) {
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

      // 열람 권한 확인
      if (!canUserSeePost(post, req.user, role)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      // 조회수 증가
      post.viewCount = (post.viewCount || 0) + 1;
      await post.save();

      // 머지 렌더링
      if (req.query.merge === "true" && post.content) {
        const altRole = getAltBoardRole(board, req.user);

        // ── {{#sheet 시트명}} — 읽기 전용 머지 ──
        const { sheetName, body } = parseSheetDeclaration(post.content);
        if (sheetName) {
          const sheet = await resolveAltSheetByName(
            req.user.academyId,
            board._id,
            sheetName
          );

          if (sheet) {
            const form = await AltForm(req.user.academyId).findById(sheet.form);
            if (form) {
              // 기록 시트 목록과 동일하게 form 기준으로 조회
              // (sheet id 불일치 시 CSV/직접입력 행이 빠지는 문제 방지)
              let rowQuery = { form: form._id, isActive: true };

              // 기록(시트) 목록과 동일한 가시성:
              // admin/writer → 전체
              // respondent + shareResponses → 전체 (응답자 없는 CSV/직접입력 행 포함)
              // 그 외 → 본인 행 (+ 승인자인 행)
              if (altRole === "admin" || altRole === "writer") {
                if (req.query.userId) {
                  rowQuery._respondent = req.query.userId;
                }
              } else if (
                altRole === "respondent" &&
                (form.settings?.shareResponses || form.settings?.directInputMode)
              ) {
                // 전체 공유 / 직접입력 모드: 응답자 없는 행 포함 전체
              } else {
                const approvalFieldIds = (form.fields || [])
                  .filter((f) => f.type === "approval")
                  .map((f) => f._id.toString());
                if (approvalFieldIds.length > 0) {
                  const approverConditions = approvalFieldIds.map((fid) => ({
                    [`data.${fid}.approver.userId`]: req.user.userId,
                  }));
                  rowQuery.$or = [
                    { _respondent: req.user._id },
                    ...approverConditions,
                  ];
                } else {
                  rowQuery._respondent = req.user._id;
                }
              }

              if (req.query.filters) {
                try {
                  applyMergeRowFilters(
                    rowQuery,
                    JSON.parse(req.query.filters),
                    form
                  );
                } catch (e) {
                  /* ignore */
                }
              }

              const rows = await AltSheetRow(req.user.academyId).find(rowQuery).sort({ createdAt: 1 }).lean();

              const postObj = post.toObject();
              postObj._rawContent = postObj.content;
              const rendered = renderMerge(body, rows, form.fields);
              postObj.content = rendered.content;
              postObj._mergeApplied = true;
              if (rendered.stripped) postObj._mergeStripped = true;
              if (rendered.truncated) postObj._mergeTruncated = true;

              // 필터 UI용 필드 목록 (머지 열람자 공통)
              postObj._mergeFields = (form.fields || [])
                .filter((f) => f.type !== "content" && f.type !== "docResponse")
                .map((f) => ({ label: f.label, type: f.type }));

              return res.status(200).send({ post: postObj, board });
            } else {
              logger.warn(`Merge: AltForm not found for sheet ${sheet._id}`);
            }
          } else {
            logger.warn(`Merge: AltSheet "${sheetName}" not found for board ${board._id}`);
          }

          // 시트/폼을 찾지 못했어도 템플릿 태그 정리 후 반환
          const postObj = post.toObject();
          postObj.content = stripMergeTags(body);
          postObj._mergeApplied = false;
          return res.status(200).send({ post: postObj, board });
        }
      }

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

    return res.status(200).send({ posts: filteredPosts, board });
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
    if ("surveys" in req.body) {
      const newSurveys = req.body.surveys || [];

      // 응답이 있는 설문 삭제 차단
      for (const existing of post.surveys || []) {
        if (existing.responseCount > 0) {
          const stillExists = newSurveys.find(
            (s) => s._id?.toString() === existing._id.toString()
          );
          if (!stillExists) {
            return res.status(400).send({
              message: `이미 응답이 있는 설문("${existing.title || "설문"}")을 삭제할 수 없습니다.`,
            });
          }
        }
      }

      // 설문 게시글이면 최소 1개 필수
      if (post.postType === "survey" && newSurveys.length === 0) {
        return res.status(400).send({
          message: "설문 게시글은 최소 1개의 설문이 필요합니다.",
        });
      }

      post.surveys = newSurveys;
      post.markModified("surveys");
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

    if (!post || !post.isActive) {
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
    if (post.surveys && post.surveys.length > 0) {
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

/**
 * @memberof APIs.PostAPI
 * @function duplicate API
 * @description 게시글 복제 (내용 복사, 데이터 없음)
 */
export const duplicate = async (req, res) => {
  try {
    const post = await Post(req.user.academyId)
      .findById(req.params._id)
      .lean();
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const newPost = await Post(req.user.academyId).create({
      board: post.board,
      author: req.user._id,
      authorId: req.user.userId,
      authorName: req.user.userName,
      authorProfile: req.user.profile,
      title: `${post.title} (복사)`,
      content: post.content || "",
      isActive: true,
    });

    return res.status(200).send({ post: newPost });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * URL에서 HTML을 가져와 OG 메타태그를 파싱하는 헬퍼
 */
function fetchHtml(url, timeout = 8000, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error("Too many redirects"));

    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AltsisBot/1.0; +https://altsis.org)",
          Accept: "text/html",
          "Accept-Encoding": "gzip, deflate",
        },
        timeout,
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          return fetchHtml(redirectUrl, timeout, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        // gzip/deflate 디코딩
        let stream = res;
        const encoding = res.headers["content-encoding"];
        if (encoding === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === "deflate") {
          stream = res.pipe(zlib.createInflate());
        }

        const chunks = [];
        let size = 0;
        const maxSize = 512 * 1024; // 512KB — head 영역만 필요하므로 충분
        stream.on("data", (chunk) => {
          size += chunk.length;
          chunks.push(chunk);
          if (size > maxSize) {
            stream.destroy();
          }
        });
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.on("error", reject);
  });
}

function parseOgTags(html, baseUrl) {
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*?)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:title["']/i)?.[1] ||
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
    "";

  const ogDescription =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*?)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:description["']/i)?.[1] ||
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*?)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']description["']/i)?.[1] ||
    "";

  let ogImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*?)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:image["']/i)?.[1] ||
    "";

  // 상대 URL → 절대 URL 변환
  if (ogImage && baseUrl) {
    try {
      ogImage = new URL(ogImage, baseUrl).href;
    } catch {
      // 변환 실패 시 원본 유지
    }
  }

  return {
    ogTitle: decodeHtmlEntities(ogTitle),
    ogDescription: decodeHtmlEntities(ogDescription),
    ogImage,
  };
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * @memberof APIs.PostAPI
 * @function FetchOgMeta API
 * @description URL의 Open Graph 메타데이터를 가져오는 API
 *
 * @param {Object} req
 * @param {string} req.query.url - 대상 URL
 */
export const fetchOgMeta = async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).send({ message: FIELD_REQUIRED("url") });
    }

    const targetUrl = req.query.url;

    try {
      const parsed = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).send({ message: FIELD_INVALID("url") });
      }
    } catch {
      return res.status(400).send({ message: FIELD_INVALID("url") });
    }

    try {
      const html = await fetchHtml(targetUrl);
      const meta = parseOgTags(html, targetUrl);
      return res.status(200).send(meta);
    } catch {
      return res.status(200).send({
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
      });
    }
  } catch (err) {
    logger.error(err.message);
    return res.status(200).send({
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
    });
  }
};

