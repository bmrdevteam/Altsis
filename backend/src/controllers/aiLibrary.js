/**
 * Alter 라이브러리 API (교사·관리자)
 */
import { logger } from "../log/logger.js";
import { extractText } from "../utils/textExtractor.js";
import { fileS3, fileBucket } from "../_s3/fileBucket.js";
import { schoolAiLibraryMulter } from "../_s3/aiRefMulter.js";
import { tryCommitUpload } from "../services/academyStorage.js";
import { PROMPT_LIMITS, truncateText } from "../services/aiPromptPolicy.js";
import { assertSeasonAiAccess } from "../services/aiSkills.js";
import { isStaffAuth } from "../services/aiLibraryAcl.js";
import {
  createLibraryItemDoc,
  deleteLibraryItemDoc,
  downloadLibraryItemUrl,
  getLibraryItem,
  listLibraryItems,
  loadSchoolForLibrary,
  updateLibraryItemDoc,
} from "../services/aiLibrary.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

const throwHttp = (status, message, code) => {
  const err = new Error(message);
  err.status = status;
  err.code = code || message;
  throw err;
};

const sendError = (res, err) => {
  logger.error(err.message);
  return res
    .status(err.status || 500)
    .send({ message: err.message || "서버 오류가 발생했습니다." });
};

/**
 * 관리자: 학교만으로 접근. 교사: 학기 AI + teacher 역할.
 */
export const assertLibraryPageAccess = async ({
  academyId,
  user,
  schoolId,
  seasonId,
}) => {
  if (!schoolId) {
    throwHttp(400, FIELD_REQUIRED("school"));
  }
  const school = await loadSchoolForLibrary(academyId, schoolId);
  const staff = isStaffAuth(user?.auth);
  if (staff) {
    return { school, isStaff: true };
  }
  if (!seasonId) {
    throwHttp(400, FIELD_REQUIRED("season"));
  }
  const ctx = await assertSeasonAiAccess(academyId, user, seasonId);
  if (ctx.registration?.role !== "teacher") {
    throwHttp(403, PERMISSION_DENIED);
  }
  if (ctx.school && String(ctx.school._id) !== String(school._id)) {
    throwHttp(403, PERMISSION_DENIED);
  }
  return { school: ctx.school || school, isStaff: false };
};

const schoolIdFromReq = (req) =>
  req.query.school || req.body?.school || req.params.school;

export const list = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.query.season,
    });
    const items = await listLibraryItems({
      academyId: req.user.academyId,
      schoolId: school._id,
      userId: req.user._id,
      kind: req.query.kind,
      visibility: req.query.visibility,
    });
    return res.status(200).send({ items });
  } catch (err) {
    return sendError(res, err);
  }
};

export const findOne = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.query.season,
    });
    const item = await getLibraryItem({
      academyId: req.user.academyId,
      schoolId: school._id,
      userId: req.user._id,
      itemId: req.params.itemId,
    });
    return res.status(200).send({ item });
  } catch (err) {
    return sendError(res, err);
  }
};

export const create = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school, isStaff } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.body?.season || req.query.season,
    });
    const item = await createLibraryItemDoc({
      academyId: req.user.academyId,
      school,
      user: req.user,
      isStaff,
      body: req.body || {},
    });
    return res.status(200).send({ item, aiConfig: school.aiConfig });
  } catch (err) {
    return sendError(res, err);
  }
};

export const update = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school, isStaff } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.body?.season || req.query.season,
    });
    const item = await updateLibraryItemDoc({
      academyId: req.user.academyId,
      school,
      user: req.user,
      isStaff,
      itemId: req.params.itemId,
      body: req.body || {},
    });
    return res.status(200).send({ item, aiConfig: school.aiConfig });
  } catch (err) {
    return sendError(res, err);
  }
};

export const remove = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school, isStaff } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.query.season,
    });
    await deleteLibraryItemDoc({
      academyId: req.user.academyId,
      school,
      user: req.user,
      isStaff,
      itemId: req.params.itemId,
    });
    return res.status(200).send({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
};

export const download = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.query.season,
    });
    const url = await downloadLibraryItemUrl({
      academyId: req.user.academyId,
      schoolId: school._id,
      userId: req.user._id,
      itemId: req.params.itemId,
    });
    return res.status(200).send({ url });
  } catch (err) {
    return sendError(res, err);
  }
};

export const upload = async (req, res) => {
  try {
    const schoolId = schoolIdFromReq(req);
    const { school, isStaff } = await assertLibraryPageAccess({
      academyId: req.user.academyId,
      user: req.user,
      schoolId,
      seasonId: req.query.season || req.body?.season,
    });

    schoolAiLibraryMulter(String(school._id)).single("file")(
      req,
      res,
      async (err) => {
        try {
          if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res
                .status(400)
                .send({ message: "파일 크기는 10MB를 초과할 수 없습니다." });
            }
            if (err.code === "INVALID_FILE_TYPE") {
              return res.status(400).send({
                message:
                  "지원하지 않는 파일 형식입니다. PDF, DOCX, TXT, HWP 파일만 업로드할 수 있습니다.",
              });
            }
            return res
              .status(500)
              .send({ message: "서버 오류가 발생했습니다." });
          }
          if (!req.file) {
            return res.status(400).send({ message: FIELD_REQUIRED("file") });
          }
          if (!(await tryCommitUpload(res, req.user.academyId, req.file))) {
            return;
          }

          const s3Object = await fileS3
            .getObject({ Bucket: fileBucket, Key: req.tmp.key })
            .promise();
          const extracted = await extractText(s3Object.Body, req.file.mimetype);
          const contentLimit = PROMPT_LIMITS.LIBRARY_CONTENT_CHARS || 200000;
          const content = truncateText(extracted || "", contentLimit);
          const contentLength = content.length;
          let extractWarning;
          if (!contentLength) {
            extractWarning =
              "텍스트를 추출하지 못했습니다. 스캔 PDF이거나 지원되지 않는 형식일 수 있습니다.";
          } else if (
            req.file.mimetype === "application/pdf" &&
            contentLength < 80
          ) {
            extractWarning =
              "추출된 텍스트가 매우 짧습니다. 스캔본이면 OCR이 필요할 수 있습니다.";
          } else if ((extracted || "").length > contentLimit) {
            extractWarning = `본문이 저장 상한(${contentLimit}자)을 넘어 앞부분만 저장했습니다.`;
          }

          const item = await createLibraryItemDoc({
            academyId: req.user.academyId,
            school,
            user: req.user,
            isStaff,
            body: {
              kind: req.body.kind,
              visibility: req.body.visibility,
              title: req.body.title || req.file.originalname,
              content,
              skillTags: req.body.skillTags,
            },
            fileMeta: {
              fileName: req.file.originalname,
              fileKey: req.tmp.key,
              fileSize: req.file.size,
              mimeType: req.file.mimetype,
            },
          });

          return res.status(200).send({
            item,
            aiConfig: school.aiConfig,
            contentLength,
            extractWarning,
          });
        } catch (innerErr) {
          return sendError(res, innerErr);
        }
      }
    );
  } catch (err) {
    return sendError(res, err);
  }
};
