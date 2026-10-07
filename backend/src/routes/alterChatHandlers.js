/**
 * Alter chat HTTP handlers. Routes compose these so the AI controller
 * does not import alter conversation, attachment, or search services.
 */
import { logger } from "../log/logger.js";
import { toPublicAlterError } from "../alter/core/errors.js";
import { tryCommitUpload } from "../services/academyStorage.js";
import {
  SKILL_IDS,
  assertSeasonAiAccess,
  resolveSkillPrepSettings,
  resolveSkillId,
} from "../services/aiSkills.js";
import { isStaffAuth } from "../services/aiLibraryAcl.js";
import {
  listAlterConversations as listAlterConversationsSvc,
  createAlterConversation as createAlterConversationSvc,
  listAlterMessages as listAlterMessagesSvc,
  renameAlterConversation as renameAlterConversationSvc,
  deleteAlterConversation as deleteAlterConversationSvc,
  bulkDeleteAlterConversations as bulkDeleteAlterConversationsSvc,
} from "../services/alterConversations.js";
import { alterMulter } from "../_s3/alterMulter.js";
import { fileBucket, fileS3 } from "../_s3/fileBucket.js";
import { processAlterUpload } from "../services/alterAttachments.js";
import { buildSearchScopeOptions } from "../services/alterSearchCatalog.js";

const sendAlterError = (res, err) => {
  const pub = toPublicAlterError(err);
  logger.error(err?.message || pub.message);
  return res.status(pub.status).send({ code: pub.code, message: pub.message });
};

/**
 * @memberof APIs.AIAPI
 * @function UploadAlterAttachment API
 * @route POST /ai/alter/attachment
 * @description Alter 첨부 업로드. 문서는 텍스트 추출, 이미지는 S3 key 반환.
 */
export const uploadAlterAttachment = async (req, res) => {
  try {
    const seasonId = req.query.season || req.body?.season;
    if (!seasonId) {
      return res.status(400).send({ code: "INVALID_INPUT", message: "학기가 필요합니다." });
    }

    await assertSeasonAiAccess(req.user.academyId, req.user, seasonId);

    alterMulter(seasonId).single("file")(req, res, async (err) => {
      try {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).send({
              code: "LIMIT_REACHED",
              message: "파일 크기는 10MB를 초과할 수 없습니다.",
            });
          }
          if (err.code === "INVALID_FILE_TYPE") {
            return res.status(400).send({
              code: "INVALID_INPUT",
              message:
                "지원하지 않는 파일입니다. txt/md/csv/pdf/docx/png/jpg/webp만 첨부할 수 있습니다.",
            });
          }
          return sendAlterError(res, err);
        }

        if (!req.file || !req.tmp?.key) {
          return res.status(400).send({ code: "INVALID_INPUT", message: "파일이 필요합니다." });
        }

        if (!(await tryCommitUpload(res, req.user.academyId, req.file))) {
          return;
        }

        const s3Object = await fileS3
          .getObject({ Bucket: fileBucket, Key: req.tmp.key })
          .promise();
        const buffer = Buffer.isBuffer(s3Object.Body)
          ? s3Object.Body
          : Buffer.from(s3Object.Body);

        const attachment = await processAlterUpload({
          buffer,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          fileKey: req.tmp.key,
          fileSize: req.file.size,
        });

        return res.status(200).send({ attachment });
      } catch (innerErr) {
        return sendAlterError(res, innerErr);
      }
    });
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter prep — 스킬별 저장된 지침·참고자료
 * @route GET /ai/alter/skill-settings?season=&skill=
 */
export const getAlterSkillSettings = async (req, res) => {
  try {
    const seasonId = req.query.season;
    const skill = resolveSkillId(req.query.skill || SKILL_IDS.CHAT);
    const { season, school, registration } = await assertSeasonAiAccess(
      req.user.academyId,
      req.user,
      seasonId
    );
    const settings = await resolveSkillPrepSettings(
      req.user.academyId,
      school,
      season,
      skill,
      {
        userId: req.user._id,
        isTeacher:
          isStaffAuth(req.user.auth, req.user, school?._id) ||
          registration?.role === "teacher",
      }
    );
    if (skill === SKILL_IDS.SEARCH) {
      settings.searchScope = await buildSearchScopeOptions({
        academyId: req.user.academyId,
        school,
      });
    }
    return res.status(200).send(settings);
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter 대화 목록
 * @route GET /ai/alter/conversations?school=&season=&before=&beforeId=
 * school 우선. season만 있으면 해당 학기의 학교로 조회 (하위 호환).
 * 학기와 무관하게 학교 단위로 대화를 모은다.
 */
export const listAlterConversations = async (req, res) => {
  try {
    const { conversations, hasMore } = await listAlterConversationsSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      schoolId: req.query.school,
      seasonId: req.query.season,
      limit: req.query.limit,
      before: req.query.before,
      beforeId: req.query.beforeId,
    });
    return res.status(200).send({ conversations, hasMore });
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter 대화 생성
 * @route POST /ai/alter/conversations
 */
export const createAlterConversation = async (req, res) => {
  try {
    const {
      season: seasonId,
      title,
      pageType,
      contextLabel,
      syllabusId,
    } = req.body || {};
    const conversation = await createAlterConversationSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      seasonId,
      title,
      pageType,
      contextLabel,
      syllabusId,
    });
    return res.status(200).send({ conversation });
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter 메시지 목록
 * @route GET /ai/alter/conversations/:id/messages
 */
export const listAlterMessages = async (req, res) => {
  try {
    const messages = await listAlterMessagesSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationId: req.params.id,
      limit: req.query.limit,
    });
    return res.status(200).send({ messages });
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter 대화 이름 변경
 * @route PATCH /ai/alter/conversations/:id
 */
export const renameAlterConversation = async (req, res) => {
  try {
    const conversation = await renameAlterConversationSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationId: req.params.id,
      title: req.body?.title,
    });
    return res.status(200).send({ conversation });
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter 대화 삭제(소프트)
 * @route DELETE /ai/alter/conversations/:id
 */
export const deleteAlterConversation = async (req, res) => {
  try {
    await deleteAlterConversationSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationId: req.params.id,
    });
    return res.status(200).send({ ok: true });
  } catch (err) {
    return sendAlterError(res, err);
  }
};

/**
 * Alter 대화 일괄 삭제(소프트)
 * @route POST /ai/alter/conversations/bulk-delete
 */
export const bulkDeleteAlterConversations = async (req, res) => {
  try {
    const result = await bulkDeleteAlterConversationsSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationIds: req.body?.ids,
    });
    return res.status(200).send(result);
  } catch (err) {
    return sendAlterError(res, err);
  }
};
