const _ = require("lodash");
const client = require("../caches/redis");

const {
  TestData,
  User,
  Registration,
  School,
  Archive,
  Syllabus,
  Enrollment,
} = require("../models");
//_____________________________________________________________________________

module.exports.createTestData = async (req, res) => {
  try {
    const _TestData = TestData(req.user.academyId);
    const td = new _TestData(req.body);
    await td.save();
    return res.status(200).send(td);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.getTestData = async (req, res) => {
  try {
    if (req.params._id) {
      const td = await TestData(req.user.academyId).findById(req.params._id);
      return res.status(200).send(td);
    }

    const tds = await TestData(req.user.academyId).find(req.query);
    return res.status(200).send({ tds });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateTestData = async (req, res) => {
  try {
    const td = await TestData(req.user.academyId).findById(req.params._id);
    if (!td) return res.status(404).send({ message: "td not found" });

    td[req.params.field] = req.body.new;
    await td.save();
    return res.status(200).send(td);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.removeTestData = async (req, res) => {
  try {
    const td = await TestData(req.user.academyId).findById(req.params._id);
    if (!td) return res.status(404).send({ message: "td not found" });

    await td.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

//_____________________________________________________________________________

module.exports.db = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "hello world! this is test/db",
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.test1 = (req, res) => {
  return res.status(200).send({
    message: "hello world! this is test/test1",
  });
};

module.exports.createRedis = async (req, res) => {
  await client.set(req.body.key, req.body.value);
  return res.status(200).send({ success: true });
};

module.exports.getRedis = (req, res) => {
  client.keys("*", (err, keys) => {
    return res.status(200).send({ keys });
  });
};
module.exports.removeRedis = async (req, res) => {
  await client.del(req.params.key);
  return res.status(200).send({ success: true });
};

module.exports.testRedisHash = async (req, res) => {
  await client.v4.HSET(req.body.academyId, req.body.userId, "socket.id");
  const sid = await client.v4.HGET(req.body.academyId, req.body.userId);
  return res.status(200).send({ sid });
};

//Enrollment, Notification, Registration, Syllabus에 user(oid)필드 추가
module.exports.includeUid = async (req, res) => {
  try {
    const academyId = req.query.academyId;
    if (!academyId) {
      return res.status(400).send({ message: "academyId is not defined" });
    }

    const users = await User(academyId).find();
    const userIdToUid = {};
    for (let u of users) userIdToUid[u.userId] = u._id;

    let finds = [
      Enrollment(academyId).find({
        $or: [
          { user: { $exists: false } },
          { student: { $exists: false } },
          { "teachers._id": { $exists: false } },
        ],
      }),
      Registration(academyId).find({
        $or: [
          { user: { $exists: false } },
          {
            $and: [
              { teacherId: { $exists: true } },
              { teacher: { $exists: false } },
            ],
          },
          {
            $and: [
              { subTeacherId: { $exists: true } },
              { subTeacher: { $exists: false } },
            ],
          },
        ],
      }),
      Syllabus(academyId).find({
        $or: [
          { user: { $exists: false } },
          {
            $and: [
              { "teachers.userId": { $exists: true } },
              { "teachers._id": { $exists: false } },
            ],
          },
        ],
      }),
    ];
    const [enrollments, registrations, syllabuses] = await Promise.all(finds);

    // const userNotFoundSet = new Set();
    // enrollments.forEach((doc) => {
    //   if (!doc.user) userNotFoundSet.add(doc.userId);
    //   if (!doc.student) userNotFoundSet.add(doc.studentId);
    // });
    // registrations.forEach((doc) => {
    //   if (!doc.user) userNotFoundSet.add(doc.userId);
    //   if (doc.teacherId && !doc.teacher) userNotFoundSet.add(doc.teacherId);
    //   if (doc.subTeacherId && !doc.subTeacher)
    //     userNotFoundSet.add(doc.subTeacherId);
    // });
    // syllabuses.forEach((doc) => {
    //   if (!doc.user) userNotFoundSet.add(doc.userId);
    //   doc.teachers.forEach((tdoc) => {
    //     if (!tdoc._id) userNotFoundSet.add(tdoc.userId);
    //   });
    // });

    // const userNotFoundList = [...userNotFoundSet];
    // if (userNotFoundList.length > 0)
    //   return res.status(409).send({ userNotFoundList });

    let updates = [
      enrollments.map((doc) => {
        doc.user = userIdToUid[doc.userId];
        doc.student = userIdToUid[doc.studentId];
        for (let i = 0; i < doc.teachers.length; i++)
          doc.teachers[i]._id = userIdToUid[doc.teachers[i].userId];
        return doc.save();
      }),

      registrations.map((doc) => {
        doc.user = userIdToUid[doc.userId];
        if (doc.teacherId) doc.teacher = userIdToUid[doc.teacherId];
        if (doc.subTeacherId) doc.subTeacher = userIdToUid[doc.subTeacherId];

        return doc.save();
      }),
      syllabuses.map((doc) => {
        doc.user = userIdToUid[doc.userId];
        for (let i = 0; i < doc.teachers.length; i++)
          doc.teachers[i]._id = userIdToUid[doc.teachers[i].userId];

        return doc.save();
      }),
    ];
    const logs = ["enrollments", "registrations", "syllabuses"];
    for (idx = 0; idx < logs.length; idx++) {
      console.log(`updating ${logs[idx]}...`);
      await Promise.all(updates[idx]);
      console.log(`updating ${logs[idx]} is done.`);
    }

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

//Archive에 user(oid)필드 추가
module.exports.includeUidinArchive = async (req, res) => {
  try {
    const users = await User(req.user.academyId).find(req.query);

    let finds = [];
    let uids = [];
    for (let u of users) {
      for (let s of u.schools) {
        finds.push(
          Archive(req.user.academyId).findOne({
            userId: u.userId,
            school: s.school,
          })
        );
        uids.push(u._id);
      }
    }

    const archives = await Promise.all(finds);

    let updates = [];
    for (let idx = 0; idx < archives.length; idx++) {
      if (archives[idx]) {
        updates.push(
          Archive(req.user.academyId).findByIdAndUpdate(archives[idx]._id, {
            user: uids[idx],
          })
        );
      }
    }

    await Promise.all(updates);

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

//Archive에 schoolId,schoolName 필드 추가
module.exports.includeSchoolIdAndSchoolNameinArchive = async (req, res) => {
  try {
    const academyId = req.query.academyId;
    if (!academyId) {
      return res.status(400).send({ message: "academyId is not defined" });
    }

    const schools = await School(academyId).find();

    let finds = [];
    const exArchives = await Archive(academyId).find({
      schoolId: { $exists: false },
    });
    for (let a of exArchives) {
      finds.push(
        Archive(academyId).findOne({
          userId: a.userId,
          schoolId: a.schoolId,
        })
      );
    }
    const archives = await Promise.all(finds);

    let cnt = 0;
    let updates = [];
    for (let a of archives) {
      const school = _.find(schools, { _id: a.school });
      if (!school) {
        return res.status(409).send({
          message: `school with _id(${a.school}) is not found`,
        });
      }
      updates.push(
        Archive(academyId).findByIdAndUpdate(a._id, {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
        })
      );
      cnt += 1;
    }

    await Promise.all(updates);

    return res.status(200).send({ cnt });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
