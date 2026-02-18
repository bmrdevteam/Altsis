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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
 * @description Upload post attachment as "{bucket}/{academyId}/posts/{timestamp}_{randomString}.{ext}"
 * All files use private ACL (bucket has Block Public Access enabled).
 */
export const postMulter = multer({
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

    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );

    req.tmp = {
      key: `${req.user.academyId}/posts/${
        getDateString() + "_" + getRandomString()
      }.${file.originalname.split(".").pop()}`,
      isImage: isImageFile(file.mimetype),
    };

    cb(null, true);
  },
});
