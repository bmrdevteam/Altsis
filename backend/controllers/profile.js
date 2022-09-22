const multer = require("multer");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");

const s3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId"],
  secretAccessKey: process.env["s3_secretAccessKey"],
  region: process.env["s3_region"],
});
const bucket = process.env["s3_bucket"];

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
      cb(null, `original/${req.user.academyId}_${req.user._id}`);
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

exports.upload = async (req, res) => {
  const user = req.user;

  myMulter.single("img")(req, {}, async (err) => {
    if (err) {
      if (err.code == "LIMIT_FILE_SIZE" || err.code == "INVALID_FILE_TYPE")
        return res.status(409).send({ err });
      return res.status(500).send({ err });
    }

    const originalUrl = req.file.location;
    const url = originalUrl.replace(/\/original\//, "/thumb/");

    if (user.profile) {
      try {
        await s3.deleteObject({
          Bucket: bucket,
          Key: `thumb/${user.academyId}_${user._id}`,
        });
      } catch (err) {
        return res.status(500).send({ err: err.message });
      }
    } else {
      user.profile = url;
      await user.save();
    }

    return res.status(200).send({ url, originalUrl });
  });
};

exports.read = (req, res) => {
  const url = req.user.profile || process.env["defaultProfile"];
  return res.status(200).send({ url });
};

exports.delete = (req, res) => {
  const user = req.user;
  if (!user.profile) {
    return res.status(404).send({ message: "no profile!" });
  }

  s3.deleteObject(
    { Bucket: bucket, Key: `original/${user.academy.academyId}_${user._id}` },
    async (err, data) => {
      if (err) {
        return res.status(500).send({ err: err.message });
      }
      user.profile = undefined;
      await user.save();

      return res.status(200).send({ success: true });
    }
  );
};
