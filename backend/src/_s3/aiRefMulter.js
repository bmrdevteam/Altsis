import multer from "multer";
import multerS3 from "multer-s3";
import { FIELD_INVALID } from "../messages/index.js";
import { fileBucket, fileS3 } from "./fileBucket.js";

const getRandomString = () => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let res = "";
  for (var i = 0; i < 12; i++) {
    const randomNumber = Math.floor(Math.random() * chars.length);
    res += chars[randomNumber];
  }
  return res;
};

const getDateString = () => {
  const now = new Date();
  return now.getTime().toString();
};

const fileWhitelist = [
  "application/pdf",
  "application/vnd.hancom.hwp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/octet-stream",
];

/**
 * @description Upload AI reference file as "{bucket}/{academyId}/ai-ref/{seasonId}/{timestamp}_{randomString}.{ext}"
 * @param {string} seasonId - Season ID to include in file path
 */
export const aiRefMulter = (seasonId) =>
  multer({
    limits: {
      files: 1,
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
    storage: multerS3({
      s3: fileS3,
      bucket: fileBucket,
      acl: "public-read",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        cb(null, req.tmp.key);
      },
    }),
    fileFilter: async (req, file, cb) => {
      if (!fileWhitelist.includes(file.mimetype)) {
        const err = new Error(FIELD_INVALID("file"));
        err.code = "INVALID_FILE_TYPE";
        return cb(err);
      }

      file.originalname = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      );

      req.tmp = {
        key: `${req.user.academyId}/ai-ref/${seasonId}/${
          getDateString() + "_" + getRandomString()
        }.${file.originalname.split(".").pop()}`,
      };

      cb(null, true);
    },
  });
