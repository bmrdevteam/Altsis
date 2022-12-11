const _ = require("lodash");
const { Apps, School, User } = require("../models");

// create
module.exports.create = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findOne({
      userId: req.body.userId,
    });
    if (!user) return res.status(404).send();

    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) return res.status(404).send();

    const _Apps = Apps(req.user.academyId);

    /* check duplication */
    const exApps = await _Apps.findOne({
      title: req.body.title,
    });

    if (exApps)
      return res.status(409).send({ message: `apps already exists` });

    /* create and save document */
    const apps = new _Apps({
      userId: user.userId,
      userName: user.userName,
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      title: req.body.title,
      description: req.body.description,
    });
    await apps.save();
    return res.status(200).send(apps);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    // const { userId, school } = req.query;
    // if (!userId || !school) {
    //   return res.status(400).send();
    // }
    const apps = await Apps(req.user.academyId).findOne({
      userId: "mrgoodway"
    });
    if (!apps) return res.status(404).send({ message: "apps not found" });
    apps.clean(); //DEVELOPMENT MODE
    return res.status(200).send(apps);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findById = async (req, res) => {
  try {
    const apps = await Apps(req.user.academyId).findById(req.params._id);
    if (!apps) return res.status(404).send({ message: "apps not found" });
    apps.clean(); //DEVELOPMENT MODE
    return res.status(200).send(apps);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// module.exports.updateDataField = async (req, res) => {
//   try {
//     const apps = await Apps(req.user.academyId).findById(req.params._id);
//     if (!apps) return res.status(404).send({ message: "apps not found" });

//     const field = req.params.field;
//     apps.data[field] = req.body.new;
//     await apps.save();
//     return res.status(200).send(apps);
//   } catch (err) {
//     return res.status(500).send({ message: err.message });
//   }
// };

/* delete */

exports.remove = async (req, res) => {
  try {
    const apps = await Apps(req.user.academyId).findById(req.params._id);
    if (!apps) return res.status(404).send({ message: "apps not found" });
    await apps.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
