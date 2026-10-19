import { issueConfirmation, redeemConfirmation } from "../../core/confirmation.js";
import { planDispatch } from "../../policy/dispatchPlan.js";
import { actorFromAlterCtx } from "../../policy/skillGate.js";
import { dispatchTurn, redeemDispatch, resetDispatchState, registerDispatchExecutor } from "../dispatch.js";
import { registerAuditPort } from "../auditPort.js";
import { dispatchSkillForMessage, matchDispatchIntent } from "../intent.js";

const admin = actorFromAlterCtx({ user: { _id: "admin-1", auth: "admin" }, registration: { role: "teacher" } });
const teacher = actorFromAlterCtx({ user: { _id: "teacher-1", auth: "member" }, registration: { role: "teacher" } });
const student = actorFromAlterCtx({ user: { _id: "student-1", auth: "member" }, registration: { role: "student" } });
const owner = actorFromAlterCtx({ user: { _id: "owner-1", auth: "owner" }, registration: { role: "teacher" } });

const form = {
  id: "form-draft",
  title: "양식",
  kind: "draft",
  channel: "dispatch",
  costTier: "low",
  confirmation: "before_apply",
  studentAllowed: false,
  requiredRoles: ["owner", "admin", "manager"],
  requiredFlags: [],
};

const writeSkill = {
  ...form,
  id: "save-form",
  kind: "write",
  confirmation: "both",
  costTier: "high",
};

describe("dispatch confirmation", () => {
  beforeEach(() => resetDispatchState());

  test("a timetable request matches form-draft and ignores submission wording", () => {
    expect(matchDispatchIntent("시간표 양식을 만들어줘")).toBe("form-draft");
    expect(matchDispatchIntent("막대 차트 그림을 만들어 줘")).toBe("generate_image");
    expect(matchDispatchIntent("학부모 상담 공지 초안 써줘")).toBe("document-draft");
    expect(matchDispatchIntent("미제출 양식이 있으면 알려줘")).toBeNull();
    expect(dispatchSkillForMessage("시간표 양식을 만들어줘", { id: "syllabus-draft" })).toBeNull();
  });

  test("no chip proposes and does not run the executor", async () => {
    const seen = [];
    registerAuditPort((entry) => seen.push(entry));
    let ran = 0;
    registerDispatchExecutor("form-draft", async () => {
      ran += 1;
      return { text: "만들었습니다.", draft: { kind: "form", title: "시간표" } };
    });
    const result = await dispatchTurn({
      skillId: "form-draft",
      request: "시간표 양식을 만들어줘",
      skillGate: { actor: admin, flags: {}, chip: null },
      ctx: { user: { _id: "admin-1", auth: "admin" }, academyId: "eval" },
    });
    expect(ran).toBe(0);
    expect(result.draft).toBeNull();
    expect(result.confirmation.stage).toBe("propose");
    expect(result.text).toContain("진행할까요?");
    expect(seen.map((entry) => entry.decision)).toEqual(["propose"]);
    expect(seen[0].skillId).toBe("form-draft");
    expect(seen[0].prompt).toBeUndefined();
  });

  test("the proposal card runs the executor once", async () => {
    let ran = 0;
    registerDispatchExecutor("form-draft", async () => {
      ran += 1;
      return { text: "시간표 초안입니다.", draft: { kind: "form", title: "시간표" } };
    });
    const proposed = await dispatchTurn({
      skillId: "form-draft",
      request: "시간표 양식을 만들어줘",
      skillGate: { actor: admin, flags: {}, chip: null },
      ctx: { user: { _id: "admin-1", auth: "admin" }, academyId: "eval" },
    });
    const proceeded = await redeemDispatch({
      academyId: "eval",
      actorId: "admin-1",
      user: { _id: "admin-1", auth: "admin" },
      confirmationId: proposed.confirmation.id,
      action: "proceed",
    });
    expect(proceeded.ok).toBe(true);
    expect(ran).toBe(1);
    expect(proceeded.draft.confirmationId).toBe(proceeded.confirmation.id);
    expect(proceeded.confirmation.stage).toBe("before_apply");
    const again = await redeemDispatch({
      academyId: "eval",
      actorId: "admin-1",
      user: { _id: "admin-1", auth: "admin" },
      confirmationId: proposed.confirmation.id,
      action: "proceed",
    });
    expect(again.ok).toBe(false);
    expect(again.code).toBe("CONSUMED");
    expect(ran).toBe(1);
    const applied = await redeemDispatch({
      academyId: "eval",
      actorId: "admin-1",
      user: { _id: "admin-1", auth: "admin" },
      confirmationId: proceeded.confirmation.id,
      action: "apply",
    });
    expect(applied.applied).toBe(true);
    const appliedAgain = await redeemDispatch({
      academyId: "eval",
      actorId: "admin-1",
      user: { _id: "admin-1", auth: "admin" },
      confirmationId: proceeded.confirmation.id,
      action: "apply",
    });
    expect(appliedAgain.code).toBe("CONSUMED");
  });

  test("a chosen form chip previews without a proposal", async () => {
    let ran = 0;
    registerDispatchExecutor("form-draft", async () => {
      ran += 1;
      return { text: "바로 미리보기", draft: { kind: "form", title: "시간표" } };
    });
    const result = await dispatchTurn({
      skillId: "form-draft",
      request: "시간표 양식을 만들어줘",
      skillGate: {
        actor: admin,
        flags: {},
        chip: { id: "form-draft", title: "양식", allowedTools: [] },
      },
      ctx: { user: { _id: "admin-1", auth: "admin" }, academyId: "eval" },
    });
    expect(ran).toBe(1);
    expect(result.draft.title).toBe("시간표");
    expect(result.confirmation.stage).toBe("before_apply");
  });

  test("a teacher and a student do not get a form proposal", async () => {
    const deniedTeacher = planDispatch({ actor: teacher, flags: {}, chip: null, capability: form });
    expect(deniedTeacher.decision).toBe("deny");
    expect(deniedTeacher.reasonCode).toBe("ROLE_DENIED");
    const deniedStudent = await dispatchTurn({
      skillId: "form-draft",
      request: "시간표 양식을 만들어줘",
      skillGate: { actor: student, flags: {}, chip: null },
      ctx: { user: { _id: "student-1" }, academyId: "eval" },
    });
    expect(deniedStudent.executed).toBe(false);
    expect(deniedStudent.confirmation).toBeNull();
    expect(deniedStudent.text).toContain("학생");
  });

  test("owner may be proposed, and a write skill never runs first", () => {
    const allowed = planDispatch({ actor: owner, flags: {}, chip: null, capability: form });
    expect(allowed.stage).toBe("propose");
    expect(allowed.executeNow).toBe(false);
    const write = planDispatch({
      actor: owner,
      flags: {},
      chip: { id: "save-form", title: "저장", allowedTools: [] },
      capability: writeSkill,
    });
    expect(write.executeNow).toBe(false);
    expect(write.stage).toBe("before_execute");
  });

  test("apply without a card does not count as saved", () => {
    const missing = redeemConfirmation(null, { actorId: "admin-1", action: "apply" });
    expect(missing.ok).toBe(false);
    const card = issueConfirmation({ skillId: "form-draft", stage: "propose", actorId: "admin-1", request: "시간표" });
    const wrong = redeemConfirmation(card, { actorId: "admin-1", action: "apply" });
    expect(wrong.code).toBe("STAGE");
  });

});
