const _ = require("lodash");
const { Archive, School, User } = require("../models");

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
    const _Archive = Archive(req.user.academyId);
    const { userId, school } = req.query;
    if (!userId || !school) {
      return res.status(400).send();
    }
    const archive = await _Archive.findOne({
      userId,
      school,
    });

    if (!archive) {
      /* create and save document */
      console.log("create new archive");
      const archive = new _Archive({
        userId,
        school,
      });
      archive.save();
      return res.status(200).send(archive);
    }
    // archive.clean(); //DEVELOPMENT MODE
    console.log(archive);
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findById = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });
    // archive.clean(); //DEVELOPMENT MODE
    console.log(archive);
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.update = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });

    archive.data = Object.assign(archive.data || {}, req.body);
    await archive.save();
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
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* delete */

exports.remove = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });
    await archive.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.test = async (req, res) => {
  try {
    const archives = await Archive(req.user.academyId).find({
      school: "635b3d1ef9127e9881019673",
    });

    for (let archive of archives) {
      if (
        !archive.files ||
        !archive.files["사진"] ||
        !archive.data ||
        !archive.data["사진"]
      ) {
        console.log("exception: userId: ", archive.usreId);
        continue;
      }
      archive.data["인적 사항"] = {
        ...archive.data["인적 사항"],
        ["사진"]: {
          key: archive.files["사진"].key,
          expiryDate: archive.data["사진"].expiryDate,
          originalName: archive.files["사진"].key.split("/").pop(),
          preSignedUrl: archive.data["사진"].url,
          type: `image/${archive.files["사진"].key.split(".").pop()}`,
          url: archive.data["사진"].url.split("?")[0],
        },
      };
      await archive.save();

      // return res.status(200).send(archive);
    }

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
