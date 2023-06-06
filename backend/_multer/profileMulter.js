import multer from "multer";
import multerS3 from "multer-s3";
import aws from "aws-sdk";
import { FIELD_INVALID } from "../messages/index.js";
import mongoose from "mongoose";

const profileS3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId"].trim(),
  secretAccessKey: process.env["s3_secretAccessKey"].trim(),
  region: process.env["s3_region"].trim(),
});
const profileBucket = process.env["s3_bucket"].trim();

const whitelist = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

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
