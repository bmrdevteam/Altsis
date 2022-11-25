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
    addConnection(academy.dbName);

    /* create & save admin document  */
    const _User = User(academy.dbName);
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

module.exports.find = async (req, res) => {
  try {
    /* if user is admin/magager/member of academy: return full info */
    if (req.params._id) {
      if (!req.isAuthenticated()) return res.status(401).send();

      const academy = await Academy.findById(req.params._id);

      if (req.user.auth == "owner") {
        return res.status(200).send(academy);
      }
      if (req.user.dbName != academy.dbName) return res.status(401).send();
      delete academy.dbName;
      return res.status(200).send(academy);
    }
    /* if user is owner: return full info but exclude root */
    if (req.isAuthenticated() && req.user.auth == "owner") {
      const academies = await Academy.find({ academyId: { $ne: "root" } });
      return res.status(200).send({ academies });
    }
    /* else: return filtered info */
    const academies = await Academy.find(req.query).select([
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
    const academy = await Academy.findById(req.params._id);
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

const typeToModel = (docType, dbName) => {
  if (docType === "schools") return School(dbName);
  if (docType === "seasons") return Season(dbName);
  if (docType === "users") return User(dbName);
  if (docType === "registrations") return Registration(dbName);
  if (docType === "forms") return Form(dbName);
};

module.exports.findUsers = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    if (req.params.user) {
      const document = await User(academy.dbName).findById(req.params.user);
      return res.status(200).send(document);
    }

    if (req.query["no-school"]) {
      const documents = await User(academy.dbName).find({
        schools: { $size: 0 },
      });

      return res.status(200).send({ documents });
    }
    const documents = await User(academy.dbName).find(req.query);

    return res.status(200).send({ documents });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findDocuments = async (req, res) => {
  try {
    console.log("DEBUG: ", req.query);
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    if (req.params.docId) {
      const document = await typeToModel(
        req.params.docType,
        academy.dbName
      ).findById(req.params.docId);
      return res.status(200).send(document);
    }

    const documents = await typeToModel(
      req.params.docType,
      academy.dbName
    ).find(req.query);

    return res.status(200).send({ documents });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.deleteDocument = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const document = await typeToModel(
      req.params.docType,
      academy.dbName
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
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const _School = School(academy.dbName);

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
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const _Season = Season(academy.dbName);
    const exSeason = await _Season.findOne({
      year: req.body.year,
      term: req.body.term,
    });
    if (exSeason)
      return res
        .status(409)
        .send({ message: "(year, term) is already in use" });

    const school = await School(academy.dbName).findById(req.body.school);
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
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const _User = User(academy.dbName);
    const exUser = await _User.findOne({ userId: req.body.userId });
    if (exUser)
      return res.status(409).send({ message: "userId is already in use" });

    const user = new _User({
      ...req.body,
      academyId: academy.academyId,
      academyName: academy.academyName,
    });
    await user.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateClassrooms = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const school = await School(academy.dbName).findById(req.params.school);
    school.classrooms = req.body.new;
    await school.save();

    return res.status(200).send(school);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSubjects = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const school = await School(academy.dbName).findById(req.params.school);
    school.subjects = req.body.new;
    await school.save();

    return res.status(200).send(school);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSeason = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const season = await Season(academy.dbName).findById(req.params.season);
    season.year = req.body.year;
    season.term = req.body.term;
    season.period = req.body.period;
    await season.save();

    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSeasonField = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const season = await Season(academy.dbName).findById(req.params.season);

    if (!req.params.field) {
      season.year = req.body.year;
      season.term = req.body.term;
      season.period = req.body.period;
    } else {
      let field = req.params.field;
      if (req.params.fieldType)
        field +=
          req.params.fieldType[0].toUpperCase() + req.params.fieldType.slice(1);

      season[field] = req.body.new;
    }

    await season.save();

    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createRegistration = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const _Registration = Registration(academy.dbName);
    const exRegistration = await Registration(academy.dbName).findOne({
      season: req.body.season,
      userId: req.body.userId,
    });
    if (exRegistration)
      return res
        .status(404)
        .send({ message: "user is already registered in this season" });

    const season = await Season(academy.dbName).findById(req.body.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    const user = await User(academy.dbName).findOne({
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
    });

    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    console.log("hello?");
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    const user = await User(academy.dbName).findById(req.params.user);
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
    await deleteConnection(academy.dbName);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
