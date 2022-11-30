const {
  addConnection,
  deleteConnection,
  conn,
} = require("../databases/connection");
const Form = require("../models/Form");
const { User, Academy, School, Season } = require("../models/models");
const Registration = require("../models/Registration");

module.exports.create = async (req, res) => {
  try {
    /* check duplication */
    const exAcademy = await Academy.findOne({ academyId: req.body.academyId });
    if (exAcademy)
      return res.status(409).send({
        message: `academyId '${exAcademy.academyId}'is already in use`,
      });

    /* create academy document & check validation */
    const academy = new Academy(req.body);
    if (!academy.checkValidation())
      return res.status(400).send({ message: "validation failed" });

    /* save academy document */
    await academy.save();

    /* create db */
    addConnection(academy.academyId);

    /* create & save admin document  */
    const _User = User(academy.academyId);
    const password = _User.generatePassword();
    const admin = new _User({
      userId: academy.adminId,
      userName: academy.adminName,
      academyId: academy.academyId,
      academyName: academy.academyName,
      password,
      auth: "admin",
    });
    await admin.save();

    return res.status(200).send({
      adminPassword: password,
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.activate = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* activate academy */
    academy.isActivated = true;
    await academy.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.inactivate = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* activate academy */
    academy.isActivated = false;
    await academy.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    /* if one academy info is requested */
    if (req.params.academyId) {
      if (!req.isAuthenticated())
        return res.status(401).send({ message: "You are not logged in" });

      const academy = await Academy.findOne({
        academyId: req.params.academyId,
      }).select("-dbName");

      if (!academy) {
        return res.status(404).send({ message: "Academy not found" });
      }
      if (req.user.auth == "owner") {
        return res.status(200).send(academy);
      }

      if (req.user.academyId != academy.academyId)
        return res
          .status(401)
          .send({ message: "You are not a member of this academy" });

      if (!academy.isActivated) {
        return res.status(401).send({ message: "This academy is blocked." });
      }

      return res.status(200).send(academy);
    }

    /* if user is owner: return full info but exclude root */
    if (req.isAuthenticated() && req.user.auth == "owner") {
      const academies = await Academy.find({ academyId: { $ne: "root" } });
      return res.status(200).send({ academies });
    }
    /* else: return filtered info */
    const academies = await Academy.find({ isActivated: true }).select([
      "academyId",
      "academyName",
    ]);
    return res.status(200).send({ academies });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateField = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({
      academyId: req.params.academyId,
    });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    academy["email"] = req.body.email;
    academy["tel"] = req.body.tel;
    await academy.save();
    return res.status(200).send(academy);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// module.exports.updateField = async (req, res) => {
//   try {
//     if (["email", "tel"].indexOf(req.params.field) == -1)
//       return res.status(400).send();

//     /* find document */
//     const academy = await Academy.findById(req.params._id);
//     if (!academy) return res.status(404).send({ message: "academy not found" });

//     academy[req.params.field] = req.body.new;
//     if (!academy.checkValidation(req.params.field))
//       return res.status(400).send({ message: "validation failed" });

//     await academy.save();
//     return res.status(200).send(academy);
//   } catch (err) {
//     return res.status(500).send({ message: err.message });
//   }
// };

const typeToModel = (docType, academyId) => {
  if (docType === "schools") return School(academyId);
  if (docType === "seasons") return Season(academyId);
  if (docType === "users") return User(academyId);
  if (docType === "registrations") return Registration(academyId);
  if (docType === "forms") return Form(academyId);
};

module.exports.findUsers = async (req, res) => {
  try {
    if (req.params.user) {
      const document = await User(req.user.academyId).findById(req.params.user);
      return res.status(200).send(document);
    }

    if (req.query["no-school"]) {
      const documents = await User(req.user.academyId).find({
        schools: { $size: 0 },
      });

      return res.status(200).send({ documents });
    }
    const documents = await User(req.user.academyId).find(req.query);

    return res.status(200).send({ documents });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findDocuments = async (req, res) => {
  try {
    if (req.params.docId) {
      const document = await typeToModel(
        req.params.docType,
        req.user.academyId
      ).findById(req.params.docId);
      return res.status(200).send(document);
    }

    const documents = await typeToModel(
      req.params.docType,
      req.user.academyId
    ).find(req.query);

    return res.status(200).send({ documents });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.deleteDocument = async (req, res) => {
  try {
    const document = await typeToModel(
      req.params.docType,
      req.user.academyId
    ).findById(req.params.docId);
    if (!document)
      return res.status(404).send({ message: "document not found" });

    await document.remove();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createSchool = async (req, res) => {
  try {
    const _School = School(req.user.academyId);

    const exSchool = await _School.findOne({ schoolId: req.body.schoolId });
    if (exSchool)
      return res
        .status(409)
        .send({ message: `schoolId(${exSchool.schoolId}) is already in use` });

    const school = new _School(req.body);
    await school.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createSeason = async (req, res) => {
  try {
    const _Season = Season(req.user.academyId);
    const exSeason = await _Season.findOne({
      year: req.body.year,
      term: req.body.term,
    });
    if (exSeason)
      return res
        .status(409)
        .send({ message: "(year, term) is already in use" });

    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) return res.status(404).send({ message: "school not found" });

    const season = new _Season({
      ...req.body,
      classrooms: school.classrooms,
      subjects: school.subjects,
    });

    await season.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createUser = async (req, res) => {
  try {
    const _User = User(req.user.academyId);
    const exUser = await _User.findOne({ userId: req.body.userId });
    if (exUser)
      return res.status(409).send({ message: "userId is already in use" });

    const user = new _User({
      ...req.body,
      academyId: req.user.academyId,
      academyName: req.user.academyName,
    });
    await user.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateClassrooms = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params.school);
    school.classrooms = req.body.new;
    await school.save();

    return res.status(200).send(school);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSubjects = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params.school);
    school.subjects = req.body.new;
    await school.save();

    return res.status(200).send(school);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSeason = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.params.season);
    season.year = req.body.year;
    season.term = req.body.term;
    season.period = req.body.period;
    await season.save();

    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSeasonPermission = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.params.season);
    if (req.params.permissionType === "syllabus")
      season.permissionSyllabus = req.body.new;
    else if (req.params.permissionType === "evaluation")
      season.permissionEvaluation = req.body.new;
    else if (req.params.permissionType === "enrollment")
      season.permissionEnrollment = req.body.new;
    else return res.status(403).send();

    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.activateSeason = async (req, res) => {
  try {
    /* find document */
    const season = await Season(req.user.academyId).findById(req.params.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    /* activate season */
    season.isActivated = true;
    await season.save();

    /* activate registrations */
    await Registration(req.user.academyId).updateMany(
      { season },
      { isActivated: true }
    );

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
  season;
};

module.exports.inactivateSeason = async (req, res) => {
  try {
    /* find document */
    const season = await Season(req.user.academyId).findById(req.params.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    /* activate academy */
    season.isActivated = false;
    await season.save();

    /* activate registrations */
    await Registration(req.user.academyId).updateMany(
      { season },
      { isActivated: false }
    );

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createRegistration = async (req, res) => {
  try {
    const _Registration = Registration(req.user.academyId);
    const exRegistration = await Registration(req.user.academyId).findOne({
      season: req.body.season,
      userId: req.body.userId,
    });
    if (exRegistration)
      return res
        .status(404)
        .send({ message: "user is already registered in this season" });

    const season = await Season(req.user.academyId).findById(req.body.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    const user = await User(req.user.academyId).findOne({
      userId: req.body.userId,
    });
    if (!user) return res.status(404).send({ message: "user not found" });

    const registration = new _Registration({
      season: season._id,
      year: season.year,
      term: season.term,
      school: season.school,
      schoolId: season.schoolId,
      schoolName: season.schoolName,
      userId: user.userId,
      userName: user.userName,
      role: req.body.role,
      isActivated: season.isActivated,
    });

    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findById(req.params.user);
    user.auth = req.body.auth;
    user.email = req.body.email;
    user.tel = req.body.tel;
    await user.save();
    console.log("user is updated! ", user);

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* delete document */
    academy.remove();

    /* delete db */
    await deleteConnection(academy.academyId);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
