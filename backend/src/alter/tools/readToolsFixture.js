/**
 * N3 permission boundary. A teacher sees their class. A student and another
 * teacher's class do not.
 */

import mongoose from "mongoose";
import {
  AltForm,
  AltSheetRow,
  Board,
  CalendarEvent,
  Enrollment,
  Registration,
  Season,
  Syllabus,
  User,
} from "../../models/index.js";
import { EVAL_ACADEMY } from "../eval/mongo.js";
import { createAgentTools } from "./registry.js";

const person = (userId, userName, auth = "member") => ({
  _id: new mongoose.Types.ObjectId(),
  userId,
  userName,
  auth,
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

export const runReadToolsCheck = async () => {
  const schoolId = new mongoose.Types.ObjectId();
  const otherSchoolId = new mongoose.Types.ObjectId();
  const seasonId = new mongoose.Types.ObjectId();
  const school = { _id: schoolId, schoolId: "evalschool", schoolName: "평가학교" };
  const teacherA = person("teacherA1", "김교사");
  const teacherB = person("teacherB1", "이교사");
  const student = person("student1", "김학생", "student");
  const park = person("parkstud", "박학생", "member");
  const choi = person("choistud", "최학생", "member");
  park.auth = "member";
  const phone = "010-9999-8888";
  const email = "teacher@example.com";

  await User(EVAL_ACADEMY).create([
    { _id: park._id, userId: park.userId, userName: park.userName, auth: "member" },
    { _id: choi._id, userId: choi.userId, userName: choi.userName, auth: "member" },
  ]);
  await Season(EVAL_ACADEMY).create({
    _id: seasonId,
    school: schoolId,
    schoolId: "evalschool",
    schoolName: "평가학교",
    year: "2026",
    term: "2",
  });
  await Registration(EVAL_ACADEMY).create({
    season: seasonId,
    school: schoolId,
    schoolId: "evalschool",
    user: teacherA._id,
    userId: teacherA.userId,
    userName: teacherA.userName,
    role: "teacher",
    isActivated: true,
    permissionSyllabusV2: true,
  });

  const syllabusA = await Syllabus(EVAL_ACADEMY).create({
    season: seasonId,
    school: schoolId,
    user: teacherA._id,
    userId: teacherA.userId,
    userName: teacherA.userName,
    classTitle: "문학탐구",
    classroom: "본관201",
    time: [{ label: "1교시", day: "월", start: "09:00", end: "09:50" }],
    teachers: [{ _id: teacherA._id, userId: teacherA.userId, userName: teacherA.userName, confirmed: false }],
  });
  await Syllabus(EVAL_ACADEMY).create({
    season: seasonId,
    school: schoolId,
    user: teacherB._id,
    userId: teacherB.userId,
    userName: teacherB.userName,
    classTitle: "과학실험",
    classroom: "별관1",
    time: [{ label: "2교시", day: "화", start: "10:00", end: "10:50" }],
    teachers: [{ _id: teacherB._id, userId: teacherB.userId, userName: teacherB.userName, confirmed: true }],
  });
  await Enrollment(EVAL_ACADEMY).collection.insertOne({
    syllabus: syllabusA._id,
    season: seasonId,
    school: schoolId,
    student: park._id,
    studentId: park.userId,
    studentName: park.userName,
  });

  const board = await Board(EVAL_ACADEMY).create({
    school: schoolId,
    schoolId: "evalschool",
    schoolName: "평가학교",
    scope: "school",
    name: "문학보드",
    slug: `munhak-${schoolId.toString().slice(-6)}`,
    isActive: true,
    boardMode: "alt",
    creator: teacherA._id,
    syllabus: syllabusA._id,
    altBoardRole: {
      [String(park._id)]: "respondent",
      [String(choi._id)]: "respondent",
    },
  });
  const form = await AltForm(EVAL_ACADEMY).create({
    board: board._id,
    school: schoolId,
    creator: teacherA._id,
    title: "출석결재",
    isActive: true,
    isDraft: false,
    fields: [{ _id: "appr1", label: "승인", type: "approval" }],
  });
  await AltSheetRow(EVAL_ACADEMY).create({
    sheet: new mongoose.Types.ObjectId(),
    form: form._id,
    board: board._id,
    _respondent: park._id,
    _respondentId: park.userId,
    _respondentName: `박학생 ${phone}`,
    _submittedAt: new Date("2026-10-03T01:00:00.000Z"),
    isDraft: false,
    isActive: true,
    data: {
      appr1: {
        version: 2,
        overallStatus: "pending",
        status: "pending",
        currentStep: 0,
        currentApproverUserId: teacherA.userId,
        approver: { userId: teacherA.userId, userName: teacherA.userName },
        steps: [
          {
            order: 0,
            label: "1차 승인",
            status: "pending",
            approver: { userId: teacherA.userId, userName: teacherA.userName },
          },
        ],
      },
    },
  });
  await CalendarEvent(EVAL_ACADEMY).create({
    title: `학교행사 ${email}`,
    start: new Date("2026-10-03T01:00:00.000Z"),
    end: new Date("2026-10-03T02:00:00.000Z"),
    scope: "school",
    school: schoolId,
    user: teacherA._id,
    recurrence: { type: "none" },
  });
  await CalendarEvent(EVAL_ACADEMY).create({
    title: "개인 비밀",
    start: new Date("2026-10-03T03:00:00.000Z"),
    end: new Date("2026-10-03T04:00:00.000Z"),
    scope: "personal",
    school: schoolId,
    user: teacherB._id,
    recurrence: { type: "none" },
  });
  await CalendarEvent(EVAL_ACADEMY).create({
    title: "다른 학교 행사",
    start: new Date("2026-10-03T01:00:00.000Z"),
    end: new Date("2026-10-03T02:00:00.000Z"),
    scope: "school",
    school: otherSchoolId,
    user: teacherB._id,
    recurrence: { type: "none" },
  });

  const ctxA = teacherCtx(teacherA, school, seasonId);
  const ctxB = teacherCtx(teacherB, school, seasonId);
  const ctxStudent = {
    ...teacherCtx(student, school, seasonId),
    user: student,
    registration: { role: "student" },
  };
  const problems = [];
  const expectOk = (ok, label) => {
    if (!ok) problems.push(label);
  };

  const approvals = await tool("get_pending_approvals").execute(ctxA, {});
  const approvalText = JSON.stringify(approvals);
  expectOk(approvalText.includes("출석결재"), "결재양식");
  expectOk(approvalText.includes("문학탐구"), "수업확인");
  expectOk(approvalText.includes("[연락처]"), "결재마스킹");
  expectOk(!approvalText.includes(phone), "결재전화");
  expectOk(!approvalText.includes(park.userId), "결재아이디");

  const status = await tool("get_form_submission_status").execute(ctxA, {
    formId: String(form._id),
  });
  const statusText = JSON.stringify(status);
  const row = status.forms?.[0] || {};
  expectOk(row.submittedCount === 1, "제출수");
  expectOk(row.missingCount === 1, "미제출수");
  expectOk(statusText.includes("박학생"), "제출이름");
  expectOk(statusText.includes("최학생"), "미제출이름");
  expectOk(statusText.includes("[연락처]"), "제출마스킹");
  expectOk(!statusText.includes(phone), "제출전화");
  expectOk(!statusText.includes(park.userId), "제출아이디");

  const byName = await tool("get_form_submission_status").execute(ctxA, { query: "출석결재" });
  const byNameText = JSON.stringify(byName);
  expectOk(byName.forms?.[0]?.submittedCount === 1, "이름조회");
  expectOk(byNameText.includes("박학생"), "이름조회제출");
  expectOk(!byNameText.includes("formId") && !byNameText.includes("boardId"), "이름조회식별자");

  const otherStatus = await tool("get_form_submission_status").execute(ctxB, {
    formId: String(form._id),
  });
  const otherText = JSON.stringify(otherStatus);
  expectOk(otherStatus.summary === "담당 수업이 아닙니다.", "다른교사");
  expectOk(!otherText.includes("박학생") && !otherText.includes("최학생"), "다른교사이름");
  expectOk(!otherText.includes("submittedCount"), "다른교사수");

  const otherByName = await tool("get_form_submission_status").execute(ctxB, { query: "출석결재" });
  const otherByNameText = JSON.stringify(otherByName);
  expectOk(otherByName.summary === "담당 수업이 아닙니다.", "다른교사이름조회");
  expectOk(!otherByNameText.includes("박학생") && !otherByNameText.includes("최학생"), "다른교사이름조회유출");

  const calendar = await tool("get_calendar").execute(ctxA, {
    start: "2026-10-01",
    end: "2026-10-07",
  });
  const calendarText = JSON.stringify(calendar);
  expectOk(calendar.count === 1, "일정수");
  expectOk(calendarText.includes("[이메일]"), "일정마스킹");
  expectOk(!calendarText.includes(email), "일정메일");
  expectOk(!calendarText.includes("개인 비밀"), "개인일정");
  expectOk(!calendarText.includes("다른 학교"), "다른학교일정");

  const courses = await tool("get_my_courses").execute(ctxA, {});
  const courseText = JSON.stringify(courses);
  const mine = (courses.courses || []).find((item) => item.classTitle === "문학탐구");
  expectOk(!!mine, "내수업");
  expectOk(mine?.room === "본관201", "강의실");
  expectOk(JSON.stringify(mine?.time || []).includes("09:00"), "시간");
  expectOk(mine?.enrolled === 1, "수강인원");
  expectOk(!courseText.includes("과학실험"), "A에B수업");
  expectOk(!courseText.includes("박학생"), "수강생이름");

  const coursesB = await tool("get_my_courses").execute(ctxB, {});
  const courseBText = JSON.stringify(coursesB);
  expectOk(courseBText.includes("과학실험"), "B수업");
  expectOk(!courseBText.includes("문학탐구"), "B에A수업");

  for (const name of [
    "get_pending_approvals",
    "get_form_submission_status",
    "get_calendar",
    "get_my_courses",
  ]) {
    const args =
      name === "get_calendar"
        ? { start: "2026-10-01", end: "2026-10-07" }
        : name === "get_form_submission_status"
          ? { formId: String(form._id) }
          : {};
    const denied = await tool(name).execute(ctxStudent, args);
    const packed = JSON.stringify(denied);
    expectOk(denied.summary === "권한이 없습니다.", `학생-${name}`);
    expectOk(!packed.includes("박학생") && !packed.includes("문학탐구"), `학생유출-${name}`);
    expectOk(!packed.includes(phone) && !packed.includes(email), `학생개인정보-${name}`);
  }

  const toolNames = [
    "get_pending_approvals",
    "get_form_submission_status",
    "get_calendar",
    "get_my_courses",
  ];
  if (problems.length) {
    return { text: `유출 ${problems.join(" ")}`, toolNames };
  }
  return {
    text: "학생은 거절됩니다. 다른 교사 수업은 보이지 않습니다. 담당 수업 결재 제출 일정 수업을 조회했습니다.",
    toolNames,
  };
};
