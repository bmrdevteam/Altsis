const express = require("express");
const School = require("../models/School");
const Syllabus = require("../models/Syllabus");
const router = express.Router();
const { classroomsTable } = require("../utils/util");
const _ = require("lodash");
const client = require("../caches/redis");
const TimeBlock = require("../models/TimeBlock");
const Season = require("../models/Season");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const mongoose = require("mongoose");
const User = require("../models/User");

//______________________________DB____________

router.get("/db/seasons", async (req, res) => {
  try {
    const _Season = Season(req.user.dbName);
    const sample = await _Season.findById("635c89a962ebbaf625f4bea9");
    const base = sample.toObject();
    delete base._id;

    const bs_seasons = [
      { year: "2016학년도", term: "4쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2016학년도", term: "3쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2017학년도", term: "1쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2017학년도", term: "2쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2018학년도", term: "1쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2017학년도", term: "3쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2017학년도", term: "4쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2018학년도", term: "2쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2016학년도", term: "1쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2016학년도", term: "2쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2018학년도", term: "3쿼터", "temp.createdAt": "2000-01-01" },
      { year: "2018학년도", term: "4쿼터", "temp.createdAt": "2000-01-01" },
      {
        year: "2019학년도",
        term: "1쿼터",
        "temp.createdAt": "2019-02-11 06:30:30",
      },
      {
        year: "2019학년도",
        term: "2쿼터",
        "temp.createdAt": "2019-04-08 01:54:48",
      },
      {
        year: "2019학년도",
        term: "4쿼터",
        "temp.createdAt": "2019-09-26 07:42:17",
      },
      {
        year: "2019학년도",
        term: "3쿼터",
        "temp.createdAt": "2019-06-19 08:22:00",
      },
      {
        year: "2020학년도",
        term: "1쿼터",
        "temp.createdAt": "2020-02-25 11:57:15",
      },
      {
        year: "2020학년도",
        term: "3쿼터",
        "temp.createdAt": "2020-06-29 09:36:30",
      },
      {
        year: "2020학년도",
        term: "2쿼터",
        "temp.createdAt": "2020-04-22 12:06:53",
      },
      {
        year: "2020학년도",
        term: "4쿼터",
        "temp.createdAt": "2020-09-21 08:34:53",
      },
      {
        year: "2021학년도",
        term: "3쿼터",
        "temp.createdAt": "2021-06-17 15:32:01",
      },
      {
        year: "2021학년도",
        term: "2쿼터",
        "temp.createdAt": "2021-04-08 16:00:07",
      },
      {
        year: "2021학년도",
        term: "1쿼터",
        "temp.createdAt": "2021-06-17 15:31:34",
      },
      {
        year: "2021학년도",
        term: "4쿼터",
        "temp.createdAt": "2021-09-27 14:49:40",
      },
      {
        year: "2022학년도",
        term: "1쿼터",
        "temp.createdAt": "2022-02-03 10:00:00",
      },
      {
        year: "2022학년도",
        term: "2쿼터",
        "temp.createdAt": "2022-04-07 15:30:06",
      },
      {
        year: "2022학년도",
        term: "3쿼터",
        "temp.createdAt": "2022-06-16 17:01:31",
      },
      {
        year: "2022학년도",
        term: "4쿼터",
        "temp.createdAt": "2022-09-22 16:00:17",
      },
    ];

    for (let i = 0; i < bs_seasons.length; i++) {
      const season = new _Season(_.merge(base, bs_seasons[i]));
      await season.save();
    }

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.post("/db/syllabuses", async (req, res) => {
  try {
    const _Syllabus = Syllabus("bmr-db");
    const _syllabuses = req.body.syllabuses.map((s) => {
      return new _Syllabus(s);
    });
    await _Syllabus.insertMany(_syllabuses);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send(err);
  }
});

// const {data,add}=require('../databases/connection')
// router.post('/test2', (req, res) => {
//     add({key:req.body.key,val:req.body.val});
//     res.status(200).json({
//         data
//     })
// })

const json2csv = require("json2csv").parse;
router.get("/csv", async (req, res) => {
  if (!req.user) return res.status(404).send();

  const users = await User(req.user.dbName).find({});
  const fields = ["userId", "userName"];
  csv = json2csv(users, { fields });
  console.log(csv);
  res.set("Content-Type", "text/csv");
  return res.status(200).send(csv);
});

const id = {
  ms: "634cba616a42d475ca80f011",
  hs: "634cba5a6a42d475ca80f00c",
};

router.get("/mongoose", async (req, res) => {
  const Model = Enrollment("bmr4-db");
  const msdocs = await Model.find({ schoolId: "ms" });
  Promise.all(
    msdocs.map((doc) => {
      doc.school = id.ms;
      const newId = mongoose.Types.ObjectId(doc.season);
      doc.season = undefined;
      doc.season = newId;

      const newSyllabus = mongoose.Types.ObjectId(doc.season);
      doc.syllabus = undefined;
      doc.syllabus = newSyllabus;

      doc.save();
    })
  );
  const hsdocs = await Model.find({ schoolId: "hs" });
  Promise.all(
    hsdocs.map((doc) => {
      doc.school = id.hs;
      const newId = mongoose.Types.ObjectId(doc.season);
      doc.season = undefined;
      doc.season = newId;

      const newSyllabus = mongoose.Types.ObjectId(doc.season);
      doc.syllabus = undefined;
      doc.syllabus = newSyllabus;

      doc.save();
    })
  );

  return res.status(200).send({ msdocs, hsdocs });
});

router.get("/syllabus", (req, res) => {
  const duplicatedLabels = _([...req.body.time1, ...req.body.time2])
    .groupBy((x) => x.label)
    .pickBy((x) => x.length > 1)
    .keys()
    .value();

  return res.status(200).send({ duplicatedLabels });
});
router.get("/lodash/countBy", (req, res) => {
  const arr1 = ["a", "b", "b"];
  const duplication = [];
  const counter = _.countBy(arr1);
  for (const userId in counter) {
    if (counter[userId] != 1) {
      duplication.push(userId);
    }
  }

  return res.status(200).send(duplication);
});

router.get("/lodash/findIndex", (req, res) => {
  const user = {
    schools: [
      {
        schoolId: "bmrhs",
        schoolName: "bmrhs",
      },
      {
        schoolId: "bmrms",
        schoolName: "bmrms",
      },
    ],
  };

  const val = _.findIndex(user.schools, {
    schoolId: req.query.schoolId,
    schoolName: req.query.schoolName,
  });

  return res.status(200).send({ query: req.query, val });
});

router.get("/lodash/indexof", (req, res) => {
  const arr = ["abc", "def"];
  const arr2 = [
    ["abc", "def"],
    ["abc2", "def2"],
  ];
  const arr3 = [{ first: "abc" }, { second: "def" }];

  const resArr = [];

  resArr.push(_.indexOf(arr, "abc"));
  resArr.push(_.indexOf(arr, "qwer"));

  resArr.push(
    _.findIndex(arr2, function (el) {
      return _.isEqual(el, ["abc", "def"]);
    })
  );
  resArr.push(
    _.findIndex(arr2, function (el) {
      return _.isEqual(el, ["abcdef"]);
    })
  );

  resArr.push(_.findIndex(arr3, { second: "def" }));
  resArr.push(_.findIndex(arr3, { thrid: "def" }));

  return res.status(200).send({ resArr });
});

router.get("/lodash", (req, res) => {
  const arr11_1 = [1, 1];
  const arr11_2 = [1, 1];
  const arr12 = [1, 2];

  const res1 = _.isEqual(arr11_1, arr11_2);
  const res2 = _.isEqual(arr11_1, arr12);

  const obj1 = { a: 1, b: 1 };
  const obj2 = { a: 1, b: 1 };
  const obj3 = { a: 1, b: 2 };

  const res3 = _.isEqual(obj1, obj2);
  const res4 = _.isEqual(obj1, obj3);

  const objArr1 = [
    { a: 1, b: 1 },
    { a: 1, b: 1 },
  ];
  const objArr2 = [
    { a: 1, b: 1 },
    { a: 1, b: 1 },
  ];
  const objArr3 = [
    { a: 1, b: 1 },
    { a: 1, b: 2 },
  ];

  const res5 = _.isEqual(objArr1, objArr2);
  const res6 = _.isEqual(objArr1, objArr3);

  const test1 = [
    { label: "월5", day: "월", start: "9:00", end: "9:50" },
    { label: "월2", day: "월", start: "10:00", end: "10:50" },
  ];
  const test2 = [
    { label: "월5", day: "월", start: "9:00", end: "9:50" },
    { label: "월2", day: "월", start: "10:00", end: "10:55" },
  ];

  let res7 = [];
  for (let i = 0; i < test1.length; i++) {
    res7.push([test1[i], test2[i], _.isEqual(test1[i], test2[i])]);
  }
  const res8 = _.difference(test1, test2);

  return res
    .status(200)
    .send({ res1, res2, res3, res4, res5, res6, res7, res8 });
});

router.get("/classrooms", async (req, res) => {
  const schoolId = req.query.schoolId;
  const year = req.query.year;
  const term = req.query.term;

  const syllabuses = await Syllabus(req.user.dbName).find({
    schoolId,
    year,
    term,
  });

  const table = await classroomsTable(syllabuses);

  res.status(200).json({ table });
});

router.get("/date", (req, res) => {
  res.status(200).json({
    success: true,
    parse: Date.parse(req.body.createdAt),
  });
});

router.get("/test1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "hello world! this is test1 -2",
  });
});

router.get("/session", (req, res) => {
  res.json({
    "req.session": req.session, // 세션 데이터
    "req.user": req.user, // login시 저장되는 데이터
  });
});

router.post("/session", (req, res) => {
  req.session[req.body.key] = req.body.value;
  return req.session.save(() => {
    return res.status(200).send({ success: true });
  });
});

router.post("/redis", (req, res) => {
  client.set(req.body.key, req.body.value);
  return res.status(200).send({ success: true });
});

router.get("/redis", (req, res) => {
  client.keys("*", (err, keys) => {
    return res.status(200).send({ keys });
  });
});

router.delete("/redis/all", (req, res) => {
  client.keys("*", (err, keys) => {
    keys.map((key) => {
      client.del(key);
    });
    return res.status(200).send({ success: true });
  });
});

router.delete("/redis/:key", (req, res) => {
  console.log("key: ", req.params.key);
  client.del(req.params.key);
  return res.status(200).send({ success: true });
});

router.get("/passport", (req, res) => {
  return res.status(200).send({ passport: req.session.passport });
});

module.exports = router;
