import multer from "multer";
import multerS3 from "multer-s3";
import { FIELD_INVALID } from "../messages/index.js";
import mongoose from "mongoose";
import { profileS3, profileBucket } from "./profileBucket.js";

const whitelist = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/**
 *  @description Upload file "abc.jpg" as "{bucket}/original/{user._id}/abc.jpg" and AWS Lambda will copy this as "{bucket}/thumb/{user._id}/abc.jpg"
 */
export const profileMulter = multer({
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
  storage: multerS3({
    s3: profileS3,
    bucket: profileBucket,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const tokens = file.originalname.split(".");
      const filename =
        mongoose.Types.ObjectId().toString() + tokens[tokens.length - 1];
      cb(null, `original/${req.user.academyId}/${req.user._id}/${filename}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!whitelist.includes(file.mimetype)) {
      const err = new Error(FIELD_INVALID("file"));
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }
    cb(null, true);
  },
});
