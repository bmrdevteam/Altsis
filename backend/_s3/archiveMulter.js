import _ from "lodash";
import multer from "multer";
import multerS3 from "multer-s3";
import { FIELD_INVALID } from "../messages/index.js";
import { fileBucket, archiveS3 } from "./fileBucket.js";

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

const whitelist = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/vnd.hancom.hwp",
  "application/pdf",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
];

/**
 * upload archive file
 * @example Upload file "abc.jpg" as "{bucket}/{academyId}/archive/{randomString}.jpg"
 */
export const archiveMulter = multer({
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  storage: multerS3({
    s3: archiveS3,
    bucket: fileBucket,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, req.tmp.key);
    },
  }),
  fileFilter: async (req, file, cb) => {
    if (!whitelist.includes(file.mimetype)) {
      const err = new Error(FIELD_INVALID("file"));
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }

    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    req.tmp = {
      key: `${req.user.academyId}/archive/${
        getDateString() + "_" + getRandomString()
      }.${file.originalname.split(".").pop()}`,
    };

    cb(null, true);
  },
});
