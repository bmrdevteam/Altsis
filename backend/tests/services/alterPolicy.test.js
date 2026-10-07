import { AI_ERRORS } from "../../src/services/aiPromptPolicy.js";
import {
  assertDmOptIn,
  assertScheduleOwnership,
  resolveAlterContext,
} from "../../src/alter/policy/access.js";

const teacher = { _id: "teacher-1", userId: "teacher1", auth: "member" };
const student = { _id: "student-1", userId: "student1", auth: "member" };
const owner = { _id: "owner-1", userId: "owner1", auth: "owner" };

const chatDeps = (overrides = {}) => ({
  findAcademy: async () => ({
    aiEnabled: true,
    aiApiKey: "test-key",
    alterEventTriggersEnabled: true,
    plans: { ctrl: { enabled: true, usageMonth: "2099-01", usedTokens: 0 } },
    ...(overrides.academy || {}),
  }),
  findSeason: async () => ({
    _id: "season1",
    school: "school1",
    aiSettings: {
      enabled: true,
      permission: { teacher: true },
      ...(overrides.seasonAi || {}),
    },
    ...(overrides.season || {}),
  }),
  findSchool: async () => ({
    _id: "school1",
    aiEnabled: true,
    ...(overrides.school || {}),
  }),
  findRegistration: async () => ({ role: "teacher", ...(overrides.registration || {}) }),
});

const scheduleDeps = (overrides = {}) => ({
  findSeason: async () => ({ _id: "season1", school: "school1" }),
  findRegistration: async () => ({ role: "teacher", ...(overrides.registration || {}) }),
  findAcademy: async () => ({
    aiEnabled: true,
    alterEventTriggersEnabled: true,
    ...(overrides.academy || {}),
  }),
});

describe("resolveAlterContext chat and agent", () => {
  test("teacher with AI on is allowed", async () => {
    const ctx = await resolveAlterContext("demo", teacher, "season1", {
      runner: "chat",
      deps: chatDeps(),
      skipQuota: true,
    });
    expect(ctx.role).toBe("teacher");
    expect(ctx.flags.aiEnabled).toBe(true);
    expect(ctx.registration.role).toBe("teacher");
  });

  test("student is denied", async () => {
    await expect(
      resolveAlterContext("demo", student, "season1", {
        runner: "agent",
        deps: chatDeps({ registration: { role: "student" } }),
        skipQuota: true,
      })
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
  });

  test("academy AI off is denied before role", async () => {
    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "chat",
        deps: chatDeps({ academy: { aiEnabled: false } }),
        skipQuota: true,
      })
    ).rejects.toMatchObject({ status: 403, code: AI_ERRORS.NOT_ENABLED });
  });

  test("season AI off and a teacher without permission are denied", async () => {
    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "chat",
        deps: chatDeps({ seasonAi: { enabled: false, permission: { teacher: true } } }),
        skipQuota: true,
      })
    ).rejects.toMatchObject({ status: 403, code: AI_ERRORS.NOT_ENABLED_FOR_SEASON });

    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "chat",
        deps: chatDeps({ seasonAi: { enabled: true, permission: { teacher: false } } }),
        skipQuota: true,
      })
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
  });
});

describe("resolveAlterContext schedule, event, and ownership", () => {
  test("a teacher can prepare a routine when AI is on", async () => {
    const ctx = await resolveAlterContext("demo", teacher, "season1", {
      runner: "schedule",
      deps: scheduleDeps(),
      requireRole: true,
      requireAi: true,
    });
    expect(ctx.role).toBe("teacher");
    expect(ctx.flags.aiEnabled).toBe(true);
  });

  test("creating or updating while academy AI is off is 403", async () => {
    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "schedule",
        deps: scheduleDeps({ academy: { aiEnabled: false, alterEventTriggersEnabled: true } }),
        requireRole: true,
        requireAi: true,
      })
    ).rejects.toMatchObject({ status: 403, code: AI_ERRORS.NOT_ENABLED });

    const doc = { _id: "sched-1", user: teacher._id, trigger: "time" };
    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "schedule",
        deps: scheduleDeps({ academy: { aiEnabled: false } }),
        requireRole: false,
        requireAi: true,
        owned: doc,
      })
    ).rejects.toMatchObject({ status: 403, code: AI_ERRORS.NOT_ENABLED });
  });

  test("a student is denied even when AI is off", async () => {
    await expect(
      resolveAlterContext("demo", student, "season1", {
        runner: "schedule",
        deps: scheduleDeps({
          registration: { role: "student" },
          academy: { aiEnabled: false },
        }),
        requireRole: true,
        requireAi: true,
      })
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
  });

  test("event flag off is denied and dm without opt-in is refused", async () => {
    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "schedule",
        deps: scheduleDeps({
          academy: { aiEnabled: true, alterEventTriggersEnabled: false },
        }),
        requireRole: true,
        requireEventTriggers: true,
        requireAi: true,
      })
    ).rejects.toMatchObject({ status: 403, code: "EVENT_TRIGGERS_DISABLED" });

    expect(() => assertDmOptIn(["dm_received"], false)).toThrow(/동의/);
    expect(() => assertDmOptIn(["form_submitted"], false)).not.toThrow();
  });

  test("only the owner can see a routine", () => {
    const doc = { _id: "sched-1", user: teacher._id };
    expect(() => assertScheduleOwnership(teacher, doc)).not.toThrow();
    expect(() => assertScheduleOwnership(student, doc)).toThrow(
      expect.objectContaining({ status: 404, code: "NOT_FOUND" })
    );
  });

  test("the trigger tool denies a student and an academy with AI off", async () => {
    await expect(
      resolveAlterContext("demo", student, "season1", {
        runner: "event",
        loaded: {
          user: student,
          registration: { role: "student" },
          academy: { aiEnabled: true },
        },
      })
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });

    await expect(
      resolveAlterContext("demo", teacher, "season1", {
        runner: "event",
        loaded: {
          user: teacher,
          registration: { role: "teacher" },
          academy: { aiEnabled: false },
        },
      })
    ).rejects.toMatchObject({ status: 403, code: AI_ERRORS.NOT_ENABLED });

    const ctx = await resolveAlterContext("demo", owner, "season1", {
      runner: "event",
      loaded: {
        user: owner,
        registration: { role: "student" },
        academy: { aiEnabled: true },
      },
    });
    expect(ctx.role).toBe("teacher");
  });
});
