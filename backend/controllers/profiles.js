import { logger } from "../log/logger.js";
import multer from "multer";
import multerS3 from "multer-s3";
import aws from "aws-sdk";

const s3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId"].trim(),
  secretAccessKey: process.env["s3_secretAccessKey"].trim(),
  region: process.env["s3_region"].trim(),
});
const bucket = process.env["s3_bucket"].trim();

const whitelist = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const myMulter = multer({
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
  storage: multerS3({
    s3: s3,
    bucket: bucket,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(
        null,
        `original/${req.user.academyId}/${req.user._id}/${file.originalname}`
      );
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!whitelist.includes(file.mimetype)) {
      const err = new Error("file is not allowed");
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }
    cb(null, true);
  },
});

export const upload = async (req, res) => {
  const user = req.user;

  myMulter.single("img")(req, {}, async (err) => {
    if (err) {
      if (err.code == "LIMIT_FILE_SIZE" || err.code == "INVALID_FILE_TYPE")
        return res.status(409).send({ message: err.message });
      logger.error(err.message);
      return res.status(500).send({ message: err.message });
    }

    if (user.profile) {
      s3.deleteObject(
        {
          Bucket: bucket,
          Key: `original/${user.academyId}/${user._id}/${user.profile
            .split("/")
            .pop()}`,
        },
        async (err, data) => {
          if (err) {
            return res.status(500).send({ err: err.message });
          }
        }
      );
    }
    user.profile = req.file.location.replace("/original/", "/thumb/");
    await user.save();

    return res.status(200).send({ profile: user.profile });
  });
};
