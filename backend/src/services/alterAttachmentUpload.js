/**
 * Alter·활동 챗봇이 공유하는 첨부 수신.
 * 권한 검사는 호출하는 쪽에서 끝낸 뒤 이 함수만 호출한다.
 */
import { logger } from "../log/logger.js";
import { FIELD_REQUIRED } from "../messages/index.js";
import { alterMulter } from "../_s3/alterMulter.js";
import { fileBucket, fileS3 } from "../_s3/fileBucket.js";
import { tryCommitUpload } from "./academyStorage.js";
import { processAlterUpload } from "./alterAttachments.js";

export const receiveAlterAttachment = (req, res, seasonId) => {
  alterMulter(seasonId).single("file")(req, res, async (err) => {
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
              "지원하지 않는 파일입니다. txt/md/csv/pdf/docx/png/jpg/webp만 첨부할 수 있습니다.",
          });
        }
        return res
          .status(400)
          .send({ message: err.message || "파일 업로드에 실패했습니다." });
      }

      if (!req.file || !req.tmp?.key) {
        return res.status(400).send({ message: FIELD_REQUIRED("file") });
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
      logger.error(innerErr.message);
      return res.status(innerErr.status || 500).send({
        message: innerErr.message || "서버 오류가 발생했습니다.",
      });
    }
  });
};
