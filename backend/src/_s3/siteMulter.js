import multer from "multer";
import multerS3 from "multer-s3";
import { FIELD_INVALID } from "../messages/index.js";
import { fileBucket, fileS3 } from "./fileBucket.js";
import {
  MAX_FILE_BYTES,
  MAX_ZIP_BYTES,
  contentTypeForPath,
  isAllowedFilePath,
  normalizeSitePath,
  toS3Key,
} from "../services/sitePath.js";

/**
 * Upload a single site asset. Expects:
 * - req.params.academyId
 * - multipart field `path` (relative path under site/)
 * - multipart field `file`
 */
export const siteMulter = multer({
  limits: {
    files: 1,
    fileSize: MAX_FILE_BYTES,
  },
  storage: multerS3({
    s3: fileS3,
    bucket: fileBucket,
    acl: "private",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, req.tmp.key);
    },
  }),
  fileFilter: async (req, file, cb) => {
    try {
      file.originalname = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      );

      const academyId = req.params.academyId;
      // Prefer query (reliable with multipart); body.path if field precedes file
      const rawPath = req.query?.path || req.body?.path || file.originalname;
      const relativePath = normalizeSitePath(rawPath);
      if (!relativePath || !isAllowedFilePath(relativePath)) {
        const err = new Error(FIELD_INVALID("path"));
        err.code = "INVALID_FILE_TYPE";
        return cb(err);
      }

      req.tmp = {
        key: toS3Key(academyId, relativePath),
        relativePath,
        contentType: contentTypeForPath(relativePath),
      };
      return cb(null, true);
    } catch (e) {
      const err = new Error(FIELD_INVALID("file"));
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }
  },
});

/** Memory storage for zip import (parsed server-side). */
export const siteZipMulter = multer({
  limits: {
    files: 1,
    fileSize: MAX_ZIP_BYTES,
  },
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const name = Buffer.from(file.originalname, "latin1")
      .toString("utf8")
      .toLowerCase();
    const ok =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.mimetype === "application/octet-stream" ||
      name.endsWith(".zip");
    if (!ok) {
      const err = new Error(FIELD_INVALID("file"));
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    return cb(null, true);
  },
});
