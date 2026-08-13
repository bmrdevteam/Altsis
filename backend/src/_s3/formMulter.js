import multer from "multer";
import multerS3 from "multer-s3";
import { FIELD_INVALID } from "../messages/index.js";
import { fileBucket, fileS3 } from "./fileBucket.js";

const getRandomString = () => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let res = "";
  for (let i = 0; i < 12; i++) {
    const randomNumber = Math.floor(Math.random() * chars.length);
    res += chars[randomNumber];
  }
  return res;
};

const getDateString = () => {
  return new Date().getTime().toString();
};

const imageWhitelist = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

const fileWhitelist = [
  ...imageWhitelist,
  "application/pdf",
  "application/vnd.hancom.hwp",
  "application/haansofthwp",
  "application/vnd.hancom.hwpx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/csv",
  "application/csv",
  "text/html",
  "application/xhtml+xml",
  "application/json",
  "text/markdown",
  "application/zip",
  "text/plain",
  "application/octet-stream",
];

const fileExt = (originalname) =>
  String(originalname || "").split(".").pop()?.toLowerCase() || "";

/**
 * 양식 첨부 허용 여부 (MIME + CSV/HTML 확장자 보조)
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {boolean}
 */
export const isAllowedFormUpload = (mimetype, originalname) => {
  const mime = String(mimetype || "").toLowerCase();
  if (fileWhitelist.includes(mime)) return true;
  const ext = fileExt(originalname);
  if (ext === "csv") {
    return [
      "text/csv",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ].includes(mime);
  }
  if (ext === "html" || ext === "htm") {
    return [
      "text/html",
      "application/xhtml+xml",
      "text/plain",
      "application/octet-stream",
    ].includes(mime);
  }
  return false;
};

/**
 * 인라인 미리보기용 Content-Type (확장자 우선)
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {string}
 */
export const resolveFormContentType = (mimetype, originalname) => {
  const ext = fileExt(originalname);
  if (ext === "csv") return "text/csv; charset=utf-8";
  if (ext === "html" || ext === "htm") return "text/html; charset=utf-8";
  if (ext === "json") return "application/json; charset=utf-8";
  if (ext === "md" || ext === "markdown") return "text/markdown; charset=utf-8";
  if (ext === "txt") return "text/plain; charset=utf-8";
  return mimetype || "application/octet-stream";
};

export const isFormImageFile = (mimeType) =>
  imageWhitelist.includes(String(mimeType || "").toLowerCase());

const FORM_KEY_PREFIX = "forms";

/**
 * Upload form file as "{bucket}/{academyId}/forms/{timestamp}_{random}.{ext}"
 */
export const formMulter = multer({
  limits: {
    files: 1,
    fileSize: 20 * 1024 * 1024,
  },
  storage: multerS3({
    s3: fileS3,
    bucket: fileBucket,
    acl: "private",
    contentType: function (req, file, cb) {
      cb(null, resolveFormContentType(file.mimetype, file.originalname));
    },
    key: function (req, file, cb) {
      cb(null, req.tmp.key);
    },
  }),
  fileFilter: async (req, file, cb) => {
    if (!isAllowedFormUpload(file.mimetype, file.originalname)) {
      const err = new Error(FIELD_INVALID("file"));
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }

    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );

    const ext = fileExt(file.originalname) || "bin";
    req.tmp = {
      key: `${req.user.academyId}/${FORM_KEY_PREFIX}/${
        getDateString() + "_" + getRandomString()
      }.${ext}`,
      isImage: isFormImageFile(file.mimetype),
    };

    cb(null, true);
  },
});

export const isFormFileKey = (key) => {
  const parts = String(key || "").split("/");
  return parts[1] === FORM_KEY_PREFIX || parts[1] === "archive";
};
