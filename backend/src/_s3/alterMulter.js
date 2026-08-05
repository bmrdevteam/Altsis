import multer from "multer";
import multerS3 from "multer-s3";
import { FIELD_INVALID } from "../messages/index.js";
import { fileBucket, fileS3 } from "./fileBucket.js";

const getRandomString = () => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let res = "";
  for (let i = 0; i < 12; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
};

const imageWhitelist = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const docWhitelist = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/octet-stream",
];

const fileWhitelist = [...imageWhitelist, ...docWhitelist];

export const isAlterImageMime = (mimeType) =>
  imageWhitelist.includes(String(mimeType || "").toLowerCase());

/**
 * Alter 첨부 업로드
 * key: {academyId}/alter/{seasonId}/{ts}_{rand}.{ext}
 */
export const alterMulter = (seasonId) =>
  multer({
    limits: {
      files: 1,
      fileSize: 10 * 1024 * 1024, // 10MB
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
      const mime = String(file.mimetype || "").toLowerCase();
      if (!fileWhitelist.includes(mime) && !fileWhitelist.includes(file.mimetype)) {
        // also allow by extension for some browsers
        const lower = String(file.originalname || "").toLowerCase();
        const okExt =
          /\.(pdf|docx|txt|md|csv|png|jpe?g|webp)$/i.test(lower);
        if (!okExt) {
          const err = new Error(FIELD_INVALID("file"));
          err.code = "INVALID_FILE_TYPE";
          return cb(err);
        }
      }

      file.originalname = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      );
      const ext = file.originalname.split(".").pop() || "bin";
      const sid = String(seasonId || "general").replace(/[^a-zA-Z0-9_-]/g, "");
      req.tmp = {
        key: `${req.user.academyId}/alter/${sid}/${Date.now()}_${getRandomString()}.${ext}`,
        isImage: isAlterImageMime(file.mimetype),
      };
      cb(null, true);
    },
  });
