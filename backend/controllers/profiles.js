import { logger } from "../log/logger.js";
import multer from "multer";
import multerS3 from "multer-s3";
import aws from "aws-sdk";
import { FIELD_INVALID } from "../messages/index.js";

const profileS3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId"].trim(),
  secretAccessKey: process.env["s3_secretAccessKey"].trim(),
  region: process.env["s3_region"].trim(),
});
const profileBucket = process.env["s3_bucket"].trim();

const whitelist = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const profileMulter = multer({
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
      cb(
        null,
        `original/${req.user.academyId}/${req.user._id}/${file.originalname}`
      );
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

/**
 * @memberof APIs.UserAPI
 * @function UUserProfile API
 * @description 프로필 사진 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/profile"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @param {formData} req.body
 *
 * @param {Object} res
 * @param {string} res.profile
 *
 * @throws {}
 *
 */
export const update = async (req, res) => {
  const user = req.user;

  profileMulter.single("img")(req, {}, async (err) => {
    if (err) {
      if (err.code == "LIMIT_FILE_SIZE" || err.code == "INVALID_FILE_TYPE")
        return res.status(409).send({ message: err.message });
      logger.error(err.message);
      return res.status(500).send({ message: err.message });
    }

    if (user.profile) {
      profileS3.deleteObject(
        {
          Bucket: profileBucket,
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
