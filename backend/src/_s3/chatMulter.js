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
  "application/json",
  "text/markdown",
  "application/zip",
  "text/plain",
  "application/octet-stream",
];

/**
 * @description Check if file is an image
 */
export const isImageFile = (mimeType) => {
  return imageWhitelist.includes(mimeType);
};

/**
 * @description Upload chat file as "{bucket}/{academyId}/chat/{roomId}/{timestamp}_{randomString}.{ext}"
 * @param {string} roomId - Chat room ID to include in file path
 */
export const chatMulter = (roomId) =>
  multer({
    limits: {
      files: 1,
      fileSize: 20 * 1024 * 1024, // 20MB max
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
      if (!fileWhitelist.includes(file.mimetype)) {
        const err = new Error(FIELD_INVALID("file"));
        err.code = "INVALID_FILE_TYPE";
        return cb(err);
      }

      // Check file size limit based on type
      const isImage = isImageFile(file.mimetype);
      const maxSize = isImage ? 10 * 1024 * 1024 : 20 * 1024 * 1024;

      file.originalname = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      );

      req.tmp = {
        key: `${req.user.academyId}/chat/${roomId}/${
          getDateString() + "_" + getRandomString()
        }.${file.originalname.split(".").pop()}`,
        isImage,
        maxSize,
      };

      cb(null, true);
    },
  });
