const _ = require("lodash");
const { Archive, School, User } = require("../models");
const multer = require("multer");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");
const { parseISO, addSeconds } = require("date-fns");

const s3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId2"].trim(),
  secretAccessKey: process.env["s3_secretAccessKey2"].trim(),
  region: process.env["s3_region"].trim(),
  signatureVersion: "v4",
});
const bucket = process.env["s3_bucket2"].trim();
const signedUrlExpireSeconds = 60 * 5;

const randomString = () => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let tmp = "";
  for (var i = 0; i < 12; i++) {
    const randomNumber = Math.floor(Math.random() * chars.length);
    tmp += chars[randomNumber];
  }
  return tmp;
};

const signUrl = (key, filename) => {
  const preSignedUrl = s3.getSignedUrl("getObject", {
    Bucket: bucket,
    Key: key,
    Expires: signedUrlExpireSeconds,
    ResponseContentDisposition: `attachment; filename ="${encodeURI(
      filename
    )}"`,
    // ContentType: "image/*",
  });

  const params = new URL(preSignedUrl).searchParams;
  const creationDate = parseISO(params.get("X-Amz-Date"));
  const expiresInSecs = Number(params.get("X-Amz-Expires"));
  const expiryDate = addSeconds(creationDate, expiresInSecs);

  return { preSignedUrl, expiryDate };
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

const tmpMulter = multer({
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  storage: multerS3({
    s3: s3,
    bucket: bucket,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, req.tmp.key);
    },
  }),
  fileFilter: async (req, file, cb) => {
    if (!whitelist.includes(file.mimetype)) {
      const err = new Error("file is not allowed");
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }

    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    req.tmp = {
      key: `archive/${req.user.academyId}/${
        Date.now() + "_" + randomString()
      }.${file.originalname.split(".").pop()}`,
    };

    cb(null, true);
  },
});

/* upload file */

module.exports.uploadArchive = async (req, res) => {
  tmpMulter.single("file")(req, {}, async (err) => {
    if (err) {
      if (err.code == "LIMIT_FILE_SIZE" || err.code == "INVALID_FILE_TYPE")
        return res.status(409).send({ message: err.message });
      if (err.code == "ARCHIVE_NOT_FOUND")
        return res.status(404).send({ message: err.message });
      return res.status(500).send({ message: err.message });
    }

    const { preSignedUrl, expiryDate } = signUrl(
      req.tmp.key,
      req.file.originalname
    );

    return res.status(200).send({
      originalName: req.file.originalname,
      type: req.file.mimetype,
      key: req.tmp.key,
      url: req.file.location,
      preSignedUrl,
      expiryDate,
    });
  });
};

/* sign file */

module.exports.sign = async (req, res) => {
  /* 권한 검사 */
  const keys = req.query.key.split("/");
  if (keys[0] === "archive") {
    // is teacher?
  } else if (keys[0] === "backup") {
    // is owner?
    if (req.user.auth !== "owner")
      return res.status(403).send({ message: "Access Denied" });
  }

  const { preSignedUrl, expiryDate } = signUrl(
    req.query.key,
    req.query.fileName
  );

  return res.status(200).send({
    preSignedUrl,
    expiryDate,
  });
};

/* find backup */
module.exports.findBackup = async (req, res) => {
  try {
    if (!("academyId" in req.query)) {
      return res.status(400).send({ message: "query(academyId) is required" });
    }

    const list = [];

    /* req.query.title */
    if ("title" in req.query) {
      const data = await s3
        .listObjectsV2({
          Bucket: bucket,
          Prefix: `backup/${req.query.academyId}/${req.query.title}/`,
        })
        .promise();

      for (let content of data.Contents) {
        const keys = content.Key.split("/");
        if (keys.length === 4 && keys[3] !== "") {
          list.push({ title: keys[3], size: content.Size });
        }
      }
    } else {
      const data = await s3
        .listObjectsV2({
          Bucket: bucket,
          Prefix: `backup/${req.query.academyId}/`,
        })
        .promise();

      for (let content of data.Contents) {
        const keys = content.Key.split("/");
        if (keys.length === 4 && keys[3] === "") {
          list.push({ title: keys[2] });
        }
      }
    }

    return res.status(200).send({ list });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* create */
module.exports.create = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findOne({
      userId: req.body.userId,
    });
    if (!user) return res.status(404).send();

    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) return res.status(404).send();

    const _Archive = Archive(req.user.academyId);

    /* check duplication */
    const exArchive = await _Archive.findOne({
      school: req.body.school,
      userId: req.body.userId,
    });

    if (exArchive)
      return res.status(409).send({ message: `archive already exists` });

    /* create and save document */
    const archive = new _Archive({
      userId: user.userId,
      userName: user.userName,
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      data: req.body.data,
    });
    await archive.save();
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    const { userId, school } = req.query;
    if (!userId || !school) {
      return res.status(400).send();
    }
    const archive = await Archive(req.user.academyId).findOneOrCreate({
      userId,
      school,
    });
    if (!archive) return res.status(404).send({ message: "archive not found" });
    archive.clean(); //DEVELOPMENT MODE

    // check archive.file is expired
    for (let field in archive.files) {
      // if pre-signed url is expired
      if (archive.data[field]?.expiryDate < new Date().toString()) {
        const { preSignedUrl, expiryDate } = signUrl(archive.files[field].key);
        archive.data[field] = { url: preSignedUrl, expiryDate };
        await archive.save();
      }
      // const isExpired = expiryDate < new Date();
    }

    archive.files = undefined;
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findById = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });
    archive.clean(); //DEVELOPMENT MODE
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateDataField = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });

    const field = req.params.field;
    archive.data[field] = req.body.new;
    await archive.save();
    archive.files = undefined;
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* delete */

exports.remove = async (req, res) => {
  try {
    s3.deleteObject(
      {
        Bucket: bucket,
        Key: req.query.key,
      },
      async (err, data) => {
        if (err) {
          return res.status(500).send({ err: err.message });
        }
        return res.status(200).send();
      }
    );
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

module.exports.removeField = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });

    const field = req.params.field;
    archive.data[field] = undefined;
    await archive.save();
    archive.files = undefined;
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* test */

module.exports.test = async (req, res) => {
  /* upload file */
  const { userIds, school } = req.body;
  let idx = 1;
  for (let userId of userIds) {
    const archive = await Archive("bmr").findOneOrCreate({ userId, school });

    const key = `bmr/archive/tmp_bmrhs_221205/${userId}.jpg`;

    const { preSignedUrl, expiryDate } = signUrl(key);

    archive.files = {
      ...archive.files,
      ["사진"]: {
        url: `https://${bucket}.s3.ap-northeast-2.amazonaws.com/${key}`,
        key,
      },
    };
    archive.data = {
      ...archive.data,
      ["사진"]: { url: preSignedUrl, expiryDate },
    };
    await archive.save();
    idx = idx + 1;
  }
  return res.status(200).send();
  // archiveMulter.single("img")(req, {}, async (err) => {
  //   if (err) {
  //     if (err.code == "LIMIT_FILE_SIZE" || err.code == "INVALID_FILE_TYPE")
  //       return res.status(409).send({ message: err.message });
  //     if (err.code == "ARCHIVE_NOT_FOUND")
  //       return res.status(404).send({ message: err.message });
  //     return res.status(500).send({ message: err.message });
  //   }

  //   const { archive, key } = req.mm;

  //   archive.files = undefined;
  //   return res.status(200).send(archive);
  // });
};
