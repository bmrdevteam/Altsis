/**
 * Local-only seed for the Alter agent demo.
 *
 * Requires MongoDB at DB_URL (default mongodb://127.0.0.1:27017) and the
 * backend env file. Does not start Redis. Re-running replaces the demo academy.
 *
 *   cd backend && node scripts/seedLocalAgentDemo.js
 */
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const { default: mongoose } = await import("mongoose");

await import("../src/env.js");

if (!process.env.DB_URL) {
  process.env.DB_URL = "mongodb://127.0.0.1:27017";
}
if (!process.env.saltRounds) process.env.saltRounds = "10";
if (!process.env.ENCKEY_A) {
  process.env.ENCKEY_A = "RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=";
}
if (!process.env.SIGKEY_A) {
  process.env.SIGKEY_A =
    "DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==";
}
if (!process.env.ENCKEY_E) process.env.ENCKEY_E = process.env.ENCKEY_A;
if (!process.env.SIGKEY_E) process.env.SIGKEY_E = process.env.SIGKEY_A;

const { Academy } = await import("../src/models/Academy.js");
const { addConnection } = await import("../src/_database/mongodb/index.js");
const { User } = await import("../src/models/User.js");
const { School } = await import("../src/models/School.js");
const { Season } = await import("../src/models/Season.js");
const { Registration } = await import("../src/models/Registration.js");
const { Board } = await import("../src/models/Board.js");
const { AltForm } = await import("../src/models/AltForm.js");
const { Syllabus } = await import("../src/models/Syllabus.js");

const ACADEMY_ID = "demo";
const PASSWORD = "Teacher1!";
const STUDENT_PASSWORD = "Student1!";

const waitFor = async (conn, label) => {
  if (conn.readyState === 1) return;
  await conn.asPromise();
  if (conn.readyState !== 1) {
    throw new Error(`${label} connection not ready`);
  }
};

await waitFor(Academy.db, "root");

const existing = await Academy.findOne({ academyId: ACADEMY_ID }).select("+dbName");
if (existing) {
  const dbName = existing.dbName || `${ACADEMY_ID}-db`;
  const dropConn = mongoose.createConnection(
    `${process.env.DB_URL.trim()}/${dbName}`
  );
  await dropConn.asPromise();
  await dropConn.dropDatabase();
  await dropConn.close();
  await Academy.deleteOne({ _id: existing._id });
}

const academy = await Academy.create({
  academyId: ACADEMY_ID,
  academyName: "데모학원",
  email: "demo@example.com",
  tel: "010-0000-0000",
  adminId: "admin",
  adminName: "관리자",
  isActivated: true,
  boardEnabled: true,
  aiEnabled: true,
  aiProvider: "openai",
  aiModel: "gpt-4o-mini",
  aiApiKey: "scripted-local-dev",
  plans: {
    alt: { enabled: true },
    shift: { enabled: true },
    ctrl: { enabled: true, tokenLimit: null, usedTokens: 0 },
  },
});

addConnection(academy);

const school = await School(ACADEMY_ID).create({
  schoolId: "demo",
  schoolName: "데모학교",
  aiEnabled: true,
  boardEnabled: true,
  aiConfig: {
    permission: { teacher: true, student: false, exceptions: [] },
    skills: {},
  },
});

const teacher = await User(ACADEMY_ID).create({
  userId: "teacher1",
  userName: "김교사",
  password: PASSWORD,
  auth: "member",
  email: "teacher1@example.com",
  tel: "010-1111-1111",
  academyId: ACADEMY_ID,
  academyName: "데모학원",
  schools: [
    {
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      schoolAuth: "member",
    },
  ],
});

const student = await User(ACADEMY_ID).create({
  userId: "student1",
  userName: "이학생",
  password: STUDENT_PASSWORD,
  auth: "member",
  email: "student1@example.com",
  tel: "010-2222-2222",
  academyId: ACADEMY_ID,
  academyName: "데모학원",
  schools: [
    {
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      schoolAuth: "member",
    },
  ],
});

const season = await Season(ACADEMY_ID).create({
  school: school._id,
  schoolId: school.schoolId,
  schoolName: school.schoolName,
  year: "2026",
  term: "1",
  isActivated: true,
  aiSettings: {
    enabled: true,
    permission: { teacher: true, student: false },
    guidelines: "",
    references: [],
    examples: {},
    exampleSyllabusIds: [],
  },
});

await Registration(ACADEMY_ID).create({
  season: season._id,
  school: school._id,
  schoolId: school.schoolId,
  schoolName: school.schoolName,
  year: "2026",
  term: "1",
  user: teacher._id,
  userId: teacher.userId,
  userName: teacher.userName,
  role: "teacher",
  isActivated: true,
  permissionSyllabusV2: true,
});

await Registration(ACADEMY_ID).create({
  season: season._id,
  school: school._id,
  schoolId: school.schoolId,
  schoolName: school.schoolName,
  year: "2026",
  term: "1",
  user: student._id,
  userId: student.userId,
  userName: student.userName,
  role: "student",
  isActivated: true,
});

const board = await Board(ACADEMY_ID).create({
  school: school._id,
  schoolId: school.schoolId,
  schoolName: school.schoolName,
  scope: "school",
  name: "교무보드",
  slug: "faculty",
  creator: teacher._id,
  creatorId: teacher.userId,
  creatorName: teacher.userName,
  isActive: true,
  boardMode: "alt",
  members: {
    groups: { manager: true, teacher: true, student: false },
    users: [],
  },
});

await AltForm(ACADEMY_ID).create({
  board: board._id,
  school: school._id,
  creator: teacher._id,
  creatorId: teacher.userId,
  creatorName: teacher.userName,
  title: "출석 점검",
  description: "오늘 출석을 남겨 주세요.",
  isActive: true,
  isDraft: false,
  fields: [
    {
      _id: "memo",
      label: "메모",
      type: "text",
      required: false,
      order: 0,
    },
  ],
  settings: {
    requiredMode: true,
    allowResubmit: false,
    directInputMode: false,
  },
});

await Syllabus(ACADEMY_ID).create({
  season: season._id,
  school: school._id,
  schoolId: school.schoolId,
  schoolName: school.schoolName,
  year: "2026",
  term: "1",
  user: teacher._id,
  userId: teacher.userId,
  userName: teacher.userName,
  classTitle: "문학 탐구",
  point: 1,
  teachers: [
    {
      _id: teacher._id,
      userId: teacher.userId,
      userName: teacher.userName,
      confirmed: false,
    },
  ],
});

const summary = {
  academyId: ACADEMY_ID,
  seasonId: String(season._id),
  schoolId: String(school._id),
  teacher: { userId: "teacher1", password: PASSWORD },
  student: { userId: "student1", password: STUDENT_PASSWORD },
  todos: ["출석 점검", "문학 탐구"],
};

console.log(JSON.stringify(summary, null, 2));
await mongoose.disconnect();
process.exit(0);
