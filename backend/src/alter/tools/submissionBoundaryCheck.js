/**
 * teacherA must not see teacher1's class submissions, by title or by the
 * agent search catalog. A staff board the teacher already opens stays visible.
 */

import mongoose from "mongoose";
import { AltForm, AltSheetRow, Board, Season, Syllabus, User } from "../../models/index.js";
import { buildSearchCatalog, isSubmissionSearchTable } from "../../services/alterSearchCatalog.js";
import { EVAL_ACADEMY } from "../eval/mongo.js";
import { createAgentTools } from "./registry.js";

const person = (userId, userName) => ({
  _id: new mongoose.Types.ObjectId(),
  userId,
  userName,
  auth: "member",
});

const tool = (name) => createAgentTools().find((item) => item.name === name);

const teacherCtx = (user, school, seasonId) => ({
  academyId: EVAL_ACADEMY,
  user,
  academy: { aiEnabled: true },
  school,
  season: { _id: seasonId },
  seasonId: String(seasonId),
  registration: { role: "teacher" },
});

const submissionText = async (catalog) => {
  const bits = [];
  for (const row of catalog.specs || []) {
    if (!isSubmissionSearchTable(row.name)) continue;
    const loaded = await row.load({});
    bits.push(JSON.stringify(loaded));
  }
  return bits.join("\n");
};

export const runOtherClassCheck = async () => {
  const schoolId = new mongoose.Types.ObjectId();
  const seasonId = new mongoose.Types.ObjectId();
  const school = { _id: schoolId, schoolId: "boundary", schoolName: "경계학교" };
  const teacherA = person("teacherA2", "김교사");
  const teacher1 = person("teacher11", "정교사");
  const student = person("infostu1", "정보학생");
  const teammate = person("teammate1", "한팀원");

  await User(EVAL_ACADEMY).create([
    { _id: student._id, userId: student.userId, userName: student.userName, auth: "member" },
    { _id: teammate._id, userId: teammate.userId, userName: teammate.userName, auth: "member" },
  ]);
  await Season(EVAL_ACADEMY).create({
    _id: seasonId,
    school: schoolId,
    schoolId: "boundary",
    schoolName: "경계학교",
    year: "2026",
    term: "2",
  });
  const syllabus = await Syllabus(EVAL_ACADEMY).create({
    season: seasonId,
    school: schoolId,
    user: teacher1._id,
    userId: teacher1.userId,
    userName: teacher1.userName,
    classTitle: "10학년 정보 A반",
    classroom: "정보실",
    teachers: [{ _id: teacher1._id, userId: teacher1.userId, userName: teacher1.userName, confirmed: true }],
  });
  const classBoard = await Board(EVAL_ACADEMY).create({
    school: schoolId,
    schoolId: "boundary",
    schoolName: "경계학교",
    scope: "school",
    name: "10학년 정보 A반",
    slug: `info-a-${schoolId.toString().slice(-6)}`,
    isActive: true,
    boardMode: "alt",
    creator: teacher1._id,
    syllabus: syllabus._id,
    members: {
      groups: { manager: false, teacher: true, student: true },
      users: [],
    },
    writers: {
      groups: { manager: false, teacher: true, student: false },
      users: [],
    },
    altBoardRole: { [String(student._id)]: "respondent" },
  });
  const classForm = await AltForm(EVAL_ACADEMY).create({
    board: classBoard._id,
    school: schoolId,
    creator: teacher1._id,
    title: "정보 과제",
    isActive: true,
    isDraft: false,
    writers: {
      groups: { manager: false, teacher: true, student: false },
      users: [],
    },
    fields: [{ _id: "note1", label: "내용", type: "text" }],
  });
  await AltSheetRow(EVAL_ACADEMY).create({
    sheet: new mongoose.Types.ObjectId(),
    form: classForm._id,
    board: classBoard._id,
    _respondent: student._id,
    _respondentId: student.userId,
    _respondentName: "정보학생",
    _submittedAt: new Date("2026-10-03T01:00:00.000Z"),
    isDraft: false,
    isActive: true,
    data: { note1: "제출함" },
  });

  const teamBoard = await Board(EVAL_ACADEMY).create({
    school: schoolId,
    schoolId: "boundary",
    schoolName: "경계학교",
    scope: "school",
    name: "고등 교사팀",
    slug: `staff-${schoolId.toString().slice(-6)}`,
    isActive: true,
    boardMode: "alt",
    creator: teacherA._id,
    altBoardRole: { [String(teammate._id)]: "respondent" },
  });
  const meeting = await AltForm(EVAL_ACADEMY).create({
    board: teamBoard._id,
    school: schoolId,
    creator: teacherA._id,
    title: "회의 점검",
    isActive: true,
    isDraft: false,
    fields: [{ _id: "m1", label: "메모", type: "text" }],
  });
  await AltForm(EVAL_ACADEMY).create({
    board: teamBoard._id,
    school: schoolId,
    creator: teacherA._id,
    title: "회의 기록",
    isActive: true,
    isDraft: false,
    fields: [{ _id: "m2", label: "메모", type: "text" }],
  });
  await AltSheetRow(EVAL_ACADEMY).create({
    sheet: new mongoose.Types.ObjectId(),
    form: meeting._id,
    board: teamBoard._id,
    _respondent: teammate._id,
    _respondentId: teammate.userId,
    _respondentName: "한팀원",
    _submittedAt: new Date("2026-10-04T01:00:00.000Z"),
    isDraft: false,
    isActive: true,
    data: { m1: "참석" },
  });

  const ctxA = teacherCtx(teacherA, school, seasonId);
  const problems = [];
  const expectOk = (ok, label) => {
    if (!ok) problems.push(label);
  };
  const packed = (value) => JSON.stringify(value);

  const asked = await tool("get_form_submission_status").execute(ctxA, {
    query: "10학년 정보 A반 양식 제출 현황",
  });
  const askedText = packed(asked);
  expectOk(asked.summary === "담당 수업이 아닙니다.", "다른수업거절");
  expectOk(!asked.forms?.length, "다른수업빈결과");
  expectOk(!askedText.includes("정보학생"), "다른수업이름");
  expectOk(!askedText.includes("submittedCount"), "다른수업수");
  expectOk(!askedText.includes("formId") && !askedText.includes("boardId"), "다른수업식별자");

  const team = await tool("get_form_submission_status").execute(ctxA, { query: "회의 점검" });
  const teamText = packed(team);
  expectOk(team.forms?.[0]?.submittedCount === 1, "교사보드제출");
  expectOk(teamText.includes("한팀원"), "교사보드이름");
  expectOk(teamText.includes("고등 교사팀"), "교사보드");
  expectOk(!teamText.includes("정보학생"), "교사보드에다른수업");
  expectOk(!teamText.includes("formId") && !teamText.includes("boardId"), "교사보드식별자");

  const many = await tool("get_form_submission_status").execute(ctxA, { query: "회의" });
  const manyText = packed(many);
  expectOk(Array.isArray(many.candidates) && many.candidates.length >= 2, "후보");
  expectOk(!many.forms?.length, "후보에행없음");
  expectOk(manyText.includes("회의 점검") && manyText.includes("회의 기록"), "후보제목");
  expectOk(!manyText.includes("한팀원") && !manyText.includes("정보학생"), "후보이름");
  expectOk(!manyText.includes("formId") && !manyText.includes("boardId"), "후보식별자");

  const catalogArgs = {
    academyId: EVAL_ACADEMY,
    user: teacherA,
    school,
    season: { _id: seasonId },
    registration: { role: "teacher" },
  };
  const open = await buildSearchCatalog(catalogArgs);
  const agent = await buildSearchCatalog({ ...catalogArgs, omitSubmissionTables: true });
  const openText = await submissionText(open);
  const agentNames = (agent.specs || []).map((row) => row.name);
  expectOk(openText.includes("정보학생"), "검색누수재현");
  expectOk(agentNames.every((name) => !isSubmissionSearchTable(name)), "검색표제외");
  expectOk(!(await submissionText(agent)).includes("정보학생"), "검색이름없음");
  expectOk((agent.formTables || []).length === 0, "검색양식힌트없음");

  const toolNames = ["get_form_submission_status", "search_school_data"];
  if (problems.length) {
    return { text: `유출 ${problems.join(" ")}`, toolNames };
  }
  return {
    text: "다른 교사 수업 제출은 없습니다. 교사 보드 제출은 보입니다.",
    toolNames,
  };
};
