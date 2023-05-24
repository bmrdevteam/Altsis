import { logger } from "../log/logger.js";
import { Archive } from "../models/Archive.js";
import { User } from "../models/User.js";
import { School } from "../models/School.js";
import { Registration } from "../models/Registration.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import _ from "lodash";
import { PERMISSION_DENIED, __NOT_FOUND } from "../messages/index.js";

export const findByRegistration = async (req, res) => {
  try {
    let { label, registrationId } = req.query;
    if (!registrationId) {
      return res.status(400).send({});
    }

    const _Archive = Archive(req.user.academyId);

    /* teacher or student request for archive */
    if (label) {
      const studentRegistration = await Registration(
        req.user.academyId
      ).findById(registrationId);
      if (!studentRegistration) {
        return res
          .status(404)
          .send({ message: __NOT_FOUND("registration(student)") });
      }

      const school = await School(req.user.academyId).findById(
        studentRegistration.school
      );
      if (!school) {
        return res.status(404).send({ message: __NOT_FOUND("school") });
      }

      const formArchiveItem = _.find(
        school.formArchive,
        (fa) => fa.label === req.query.label
      );
      if (!formArchiveItem) {
        return res
          .status(404)
          .send({ message: __NOT_FOUND("formArchive_item") });
      }

      /* if it is student */
      if (studentRegistration.user.equals(req.user._id)) {
        if (formArchiveItem?.authStudent !== "view") {
          return res
            .status(403)
            .send({ message: PERMISSION_DENIED, description: "view" });
        }
      } else if (formArchiveItem.authTeacher === "viewAndEditStudents") {
        /* if it is teacher */
        const teacherRegistration = await Registration(
          req.user.academyId
        ).findOne({
          season: studentRegistration.season,
          user: req.user._id,
          role: "teacher",
        });
        if (!teacherRegistration)
          return res.status(403).send({
            message: PERMISSION_DENIED,
            description: "viewAndEditStudents",
          });
      } else if (formArchiveItem?.authTeacher === "viewAndEditMyStudents") {
        if (
          !studentRegistration.teacher?.equals(req.user._id) &&
          !studentRegistration.subTeacher?.equals(req.user._id)
        ) {
          return res.status(403).send({
            message: PERMISSION_DENIED,
            description: "viewAndEditMyStudents",
          });
        }
      } else {
        return res
          .status(403)
          .send({ message: PERMISSION_DENIED, description: "undefined" });
      }

      let archive = await Archive(req.user.academyId).findOne({
        school: studentRegistration.school,
        user: studentRegistration.user,
      });
      if (!archive) {
        archive = await _Archive.create({
          user: studentRegistration.user,
          userId: studentRegistration.userId,
          userName: studentRegistration.userName,
          school: studentRegistration.school,
          schoolId: studentRegistration.schoolId,
          schoolName: studentRegistration.schoolName,
        });
      }
      return res.status(200).send({
        archive: {
          _id: archive._id,
          user: archive.user,
          data: { [label]: archive.data?.[label] },
        },
      });
    }

    /* teacher request for archive for docs */
    if (!ObjectId.isValid(registrationId)) return res.status(400).send();

    const studentRegistration = await Registration(req.user.academyId).findById(
      registrationId
    );
    if (!studentRegistration) {
      return res
        .status(404)
        .send({ message: __NOT_FOUND("registration(student)") });
    }

    const teacherRegistration = await Registration(req.user.academyId).findOne({
      season: studentRegistration.season,
      user: req.user._id,
      role: "teacher",
    });
    if (!teacherRegistration) {
      return res
        .status(404)
        .send({ message: __NOT_FOUND("registration(teacher)") });
    }

    let archive = await _Archive.findOne({
      user: studentRegistration.user,
      school: studentRegistration.school,
    });
    if (!archive) {
      archive = await _Archive.create({
        user: studentRegistration.user,
        userId: studentRegistration.userId,
        userName: studentRegistration.userName,
        school: studentRegistration.school,
        schoolId: studentRegistration.schoolId,
        schoolName: studentRegistration.schoolName,
      });
    }

    return res.status(200).send({ archive });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateByRegistration = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params._id)) return res.status(400).send();
    for (let field of ["label", "data", "registration"]) {
      if (!(field in req.body)) {
        return res.status(400).send();
      }
    }

    const user = req.user;

    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) {
      return res.status(404).send({ message: __NOT_FOUND("archive") });
    }

    const school = await School(user.academyId).findById(archive.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const formArchiveItem = _.find(
      school.formArchive,
      (fa) => fa.label === req.body.label
    );
    if (!formArchiveItem) {
      return res.status(404).send({ message: __NOT_FOUND("formArchive_Item") });
    }

    if (formArchiveItem.authTeacher === "viewAndEditStudents") {
      const studentRegistration = await Registration(user.academyId).findById(
        req.body.registration
      );

      if (!studentRegistration) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      const teacherRegistration = await Registration(user.academyId).findOne({
        season: studentRegistration.season,
        user: user._id,
        role: "teacher",
      });
      if (!teacherRegistration) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else if (formArchiveItem.authTeacher === "viewAndEditMyStudents") {
      const studentRegistration = await Registration(user.academyId).findById(
        req.body.registration
      );

      if (!studentRegistration) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      if (
        !studentRegistration.teacher?.equals(user._id) &&
        !studentRegistration.subTeacher?.equals(user._id)
      ) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else {
      return res.status(400).send({});
    }

    archive.data = {
      ...archive.data,
      [req.body.label]: req.body.data,
    };

    await archive.save();
    return res.status(200).send({
      archive: {
        _id: archive._id,
        user: archive.user,
        data: {
          [req.body.label]: archive.data[req.body.label],
        },
      },
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
