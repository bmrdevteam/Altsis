import { createAgentTools } from "../../src/services/alterAgentTools.js";
import { runAgentLoop } from "../../src/services/alterAgentProtocol.js";
import {
  assertScheduleTeacher,
  beginManualRun,
  claimDueDocument,
  confirmProposal,
  createScheduleForUser,
  deleteScheduleForUser,
  findOwnedSchedule,
  setScheduleEnabled,
  updateScheduleForUser,
} from "../../src/services/alterScheduleService.js";
import {
  executeClaimedSchedule,
  processDueAlterSchedules,
  runClaimedSlot,
} from "../../src/services/alterScheduleRun.js";
import {
  MIN_INTERVAL_MS,
  assertReadOnlyPrompt,
  buildScheduleFields,
  computeNextRunAt,
  matchesClaimQuery,
  nextStateAfterRun,
  truncateSummary,
} from "../../src/services/alterScheduleTime.js";

const teacherDeps = {
  findSeason: async () => ({ _id: "season1", school: "school1" }),
  findRegistration: async () => ({ role: "teacher" }),
  findAcademy: async () => ({ aiEnabled: true, alterEventTriggersEnabled: true }),
};

const weeklyFields = () =>
  buildScheduleFields(
    {
      title: "월요일 할 일",
      prompt: "이번 주 할 일을 조회해서 정리해 줘",
      timezone: "Asia/Seoul",
      schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
    },
    new Date("2026-10-04T22:00:00.000Z")
  );

describe("alter schedule time", () => {
  test("Monday 08:00 Asia/Seoul is the previous Sunday 23:00 UTC", () => {
    const beforeEight = new Date("2026-10-04T22:00:00.000Z");
    const next = computeNextRunAt(
      { kind: "weekly", time: "08:00", weekdays: [1], timezone: "Asia/Seoul" },
      beforeEight
    );
    expect(next.toISOString()).toBe("2026-10-04T23:00:00.000Z");

    const exactly = new Date("2026-10-04T23:00:00.000Z");
    const following = computeNextRunAt(
      { kind: "weekly", time: "08:00", weekdays: [1], timezone: "Asia/Seoul" },
      exactly
    );
    expect(following.toISOString()).toBe("2026-10-11T23:00:00.000Z");
  });

  test("daily time stays on the same Seoul day when it is still ahead", () => {
    const morning = new Date("2026-10-04T22:30:00.000Z");
    const next = computeNextRunAt(
      { kind: "daily", time: "09:00", timezone: "Asia/Seoul" },
      morning
    );
    expect(next.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  test("allows read questions and refuses imperative writes", () => {
    for (const prompt of [
      "이번 주 미제출 양식이 있는지 알려줘",
      "결재 대기인 항목이 있는지 알려줘",
      "채점할 게 있는지 알려줘",
    ]) {
      expect(assertReadOnlyPrompt(prompt)).toBe(prompt);
    }
    for (const prompt of [
      "출석부를 제출해 줘",
      "이 양식을 채점해 줘",
      "예약을 삭제해 줘",
      "이 건을 결재해 줘",
      "승인해 줘",
      "안내를 보내 줘",
      "일정을 수정해 줘",
    ]) {
      expect(() => assertReadOnlyPrompt(prompt)).toThrow(/조회와 안내/);
    }
  });

  test("strips markdown before truncating a summary", () => {
    expect(truncateSummary("**출석** 점검입니다. [안내](https://example.com)를 보세요.")).toBe(
      "출석 점검입니다. 안내를 보세요."
    );
  });

  test("rejects a write prompt and keeps daily gaps at least an hour", () => {
    expect(() =>
      buildScheduleFields({
        title: "제출",
        prompt: "출석부를 제출해 줘",
        schedule: { kind: "daily", time: "08:00" },
      })
    ).toThrow(/조회와 안내/);

    const first = computeNextRunAt(
      { kind: "daily", time: "08:00", timezone: "Asia/Seoul" },
      new Date("2026-10-04T00:00:00.000Z")
    );
    const second = computeNextRunAt(
      { kind: "daily", time: "08:00", timezone: "Asia/Seoul" },
      first
    );
    expect(second.getTime() - first.getTime()).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);

    expect(
      computeNextRunAt(
        { kind: "once", onceAt: "2020-01-01T00:00:00.000Z", timezone: "Asia/Seoul" },
        new Date("2026-10-04T00:00:00.000Z")
      )
    ).toBeNull();
  });
});

describe("alter schedule claim", () => {
  const memory = (rows) => ({
    async findOneAndUpdate(filter, update) {
      const at = filter.nextRunAt.$lte;
      const idx = rows.findIndex((row) => matchesClaimQuery(row, at));
      if (idx < 0) return null;
      const previous = { ...rows[idx] };
      rows[idx] = { ...rows[idx], ...update.$set };
      return previous;
    },
  });

  test("a second claim does not take the same due row", async () => {
    const now = new Date("2026-10-04T23:00:00.000Z");
    const rows = [
      {
        _id: "s1",
        enabled: true,
        nextRunAt: now,
        claimUntil: null,
        lastStatus: "",
      },
    ];
    const model = memory(rows);
    const first = await claimDueDocument(model, now);
    const second = await claimDueDocument(model, now);
    expect(first?.claimToken).toBeTruthy();
    expect(second).toBeNull();
    expect(rows[0].lastStatus).toBe("running");
    expect(rows[0].claimToken).toBe(first.claimToken);
  });

  test("an expired lease can be claimed again", () => {
    const now = new Date("2026-10-04T23:00:00.000Z");
    expect(
      matchesClaimQuery(
        {
          enabled: true,
          nextRunAt: now,
          claimUntil: new Date(now.getTime() - 1000),
        },
        now
      )
    ).toBe(true);
    expect(
      matchesClaimQuery(
        {
          enabled: true,
          nextRunAt: now,
          claimUntil: new Date(now.getTime() + 1000),
        },
        now
      )
    ).toBe(false);
  });

  test("redis duplicate guard does not execute", async () => {
    const seen = [];
    const result = await runClaimedSlot({
      academyId: "demo",
      doc: {
        _id: "s1",
        nextRunAt: new Date("2026-10-04T23:00:00.000Z"),
        claimToken: "tok",
      },
      tryClaim: async () => false,
      release: async () => {},
      execute: async () => {
        seen.push("ran");
      },
      releaseMongo: async () => {
        seen.push("released");
      },
    });
    expect(result).toEqual({ ran: false, reason: "duplicate" });
    expect(seen).toEqual(["released"]);
  });
});

describe("alter schedule runner", () => {
  const doc = () => ({
    _id: "s1",
    user: "teacher-object",
    title: "월요일 할 일",
    prompt: "이번 주 할 일을 조회해서 정리해 줘",
    season: "season1",
    schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
    timezone: "Asia/Seoul",
    enabled: true,
    nextRunAt: new Date("2026-10-04T23:00:00.000Z"),
    claimToken: "tok",
    runs: [],
  });

  test("runs the read-only agent and stores a notification plus history", async () => {
    const notifications = [];
    const saved = [];
    const agentArgs = [];
    const patch = await executeClaimedSchedule({
      academyId: "demo",
      doc: doc(),
      deps: {
        loadContext: async () => ({
          user: { _id: "teacher-object", userId: "teacher1", userName: "김교사" },
          academy: { aiApiKey: "scripted-local-dev" },
          season: { _id: "season1" },
          school: { _id: "school1" },
          registration: { role: "teacher" },
        }),
        executeAgent: async (args) => {
          agentArgs.push(args);
          return {
            text: "보드에 출석 점검이 남아 있습니다.",
            tokenUsage: { totalTokens: 12 },
            links: [],
          };
        },
        persistTurn: async () => ({ conversation: { _id: "conv1" } }),
        notify: async (payload) => {
          notifications.push(payload);
        },
        save: async (_id, next) => {
          saved.push(next);
        },
      },
    });
    expect(agentArgs[0].allowScheduleTool).toBe(false);
    expect(agentArgs[0].message).toBe("이번 주 할 일을 조회해서 정리해 줘");
    expect(agentArgs[0].user.userId).toBe("teacher1");
    expect(notifications).toHaveLength(1);
    expect(notifications[0].notificationType).toBe("alterSchedule");
    expect(notifications[0].relatedEntity).toEqual({
      type: "alterConversation",
      id: "conv1",
    });
    expect(notifications[0].toUserList[0].userId).toBe("teacher1");
    expect(patch.lastStatus).toBe("ok");
    expect(patch.runs).toHaveLength(1);
    expect(patch.runs[0].conversationId).toBe("conv1");
    expect(patch.claimUntil).toBeNull();
    expect(saved[0].lastStatus).toBe("ok");
  });

  test("stores plain text and the tool names from the run", async () => {
    const notifications = [];
    const patch = await executeClaimedSchedule({
      academyId: "demo",
      doc: doc(),
      deps: {
        loadContext: async () => ({
          user: { _id: "teacher-object", userId: "teacher1", userName: "김교사" },
        }),
        executeAgent: async () => ({
          text: "**출석** 점검입니다. [안내](https://example.com)를 보세요.",
          tokenUsage: { totalTokens: 4 },
          links: [],
          toolNames: ["get_my_todos", "_parse", "search_product_guide"],
        }),
        persistTurn: async () => ({ conversation: { _id: "conv2" } }),
        notify: async (payload) => notifications.push(payload),
        save: async () => {},
      },
    });
    expect(patch.lastResultSummary).toBe("출석 점검입니다. 안내를 보세요.");
    expect(notifications[0].description).toBe("출석 점검입니다. 안내를 보세요.");
    expect(patch.runs[0].toolNames).toEqual(["get_my_todos", "search_product_guide"]);
  });

  test("records a skip and does not notify when AI or quota blocks the run", async () => {
    for (const code of ["AI_NOT_ENABLED", "AI_USAGE_LIMIT_EXCEEDED", "PERMISSION_DENIED"]) {
      const notifications = [];
      let agentCalled = false;
      const patch = await executeClaimedSchedule({
        academyId: "demo",
        doc: doc(),
        deps: {
          loadContext: async () => {
            const err = new Error(code);
            err.code = code;
            throw err;
          },
          executeAgent: async () => {
            agentCalled = true;
          },
          notify: async (payload) => notifications.push(payload),
          persistTurn: async () => ({ conversation: { _id: "nope" } }),
          save: async () => {},
        },
      });
      expect(agentCalled).toBe(false);
      expect(notifications).toHaveLength(0);
      expect(patch.lastStatus).toBe("skipped");
      expect(patch.lastResultSummary.length).toBeGreaterThan(0);
    }
  });

  test("keeps the last ten runs", () => {
    const base = doc();
    base.runs = Array.from({ length: 10 }, (_, i) => ({
      at: new Date(),
      status: "ok",
      summary: String(i),
      conversationId: "",
      reason: "",
    }));
    const next = nextStateAfterRun(base, {
      status: "ok",
      summary: "열한번째",
      at: new Date("2026-10-05T00:00:00.000Z"),
    });
    expect(next.runs).toHaveLength(10);
    expect(next.runs[9].summary).toBe("열한번째");
  });

  test("due processor claims each academy once per due row", async () => {
    const ran = [];
    let remaining = 1;
    await processDueAlterSchedules({
      now: new Date(),
      academies: [{ academyId: "demo" }],
      claim: async () => {
        if (remaining === 0) return null;
        remaining -= 1;
        return { _id: "s1", nextRunAt: new Date(), claimToken: "t" };
      },
      runSlot: async ({ academyId, doc }) => {
        ran.push(`${academyId}:${doc._id}`);
      },
    });
    expect(ran).toEqual(["demo:s1"]);
  });
});

describe("alter schedule permissions and confirm", () => {
  const user = { _id: "teacher-object", userId: "teacher1" };

  test("students cannot own a schedule", async () => {
    await expect(
      assertScheduleTeacher("demo", { _id: "student" }, "season1", {
        findSeason: async () => ({ _id: "season1", school: "school1" }),
        findRegistration: async () => ({ role: "student" }),
      })
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
  });

  test("another user cannot load someone else's schedule", async () => {
    await expect(
      findOwnedSchedule("demo", { _id: "other-user" }, "sched-1", {
        findOne: async (query) => {
          expect(query.user).toBe("other-user");
          expect(query._id).toBe("sched-1");
          return null;
        },
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  test("the chat tool returns a proposal and confirm is what saves it", async () => {
    const tool = createAgentTools().find((item) => item.name === "manage_schedule");
    const created = [];
    const result = await runAgentLoop({
      protocol: "native",
      serverCtx: {
        academyId: "demo",
        user,
        seasonId: "season1",
      },
      userMessage: "매주 월요일 아침 8시에 이번 주 할 일 정리해 줘",
      tools: [tool],
      generate: async ({ forceFinal }) => {
        if (!forceFinal) {
          return {
            text: "",
            toolCalls: [
              {
                id: "c1",
                name: "manage_schedule",
                arguments: {
                  action: "propose_create",
                  title: "월요일 할 일",
                  prompt: "이번 주 할 일을 조회해서 정리해 줘",
                  schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
                  userId: "attacker",
                  academyId: "evil",
                },
              },
            ],
          };
        }
        return { text: "저장을 눌러 주세요.", toolCalls: [] };
      },
    });
    expect(created).toHaveLength(0);
    expect(result.scheduleProposal.saved).toBe(false);
    expect(result.scheduleProposal.action).toBe("create");
    expect(result.scheduleProposal.userId).toBeUndefined();
    expect(result.scheduleProposal.schedule.weekdays).toEqual([1]);

    const saved = await confirmProposal(
      "demo",
      user,
      { season: "season1", proposal: result.scheduleProposal },
      {
        ...teacherDeps,
        model: {
          countDocuments: async (query) => {
            expect(query.user).toBe(user._id);
            return created.length;
          },
          create: async (row) => {
            created.push(row);
            return { ...row, _id: "saved-1" };
          },
        },
      }
    );
    expect(created).toHaveLength(1);
    expect(created[0].createdVia).toBe("agent");
    expect(created[0].userId).toBe("teacher1");
    expect(created[0].user).toBe(user._id);
    expect(saved._id).toBe("saved-1");
  });

  test("the sixth schedule is rejected", async () => {
    const fields = weeklyFields();
    let created = false;
    await expect(
      confirmProposal(
        "demo",
        user,
        {
          season: "season1",
          proposal: {
            saved: false,
            action: "create",
            title: fields.title,
            prompt: fields.prompt,
            schedule: fields.schedule,
            timezone: fields.timezone,
          },
        },
        {
          ...teacherDeps,
          model: {
            countDocuments: async () => 5,
            create: async () => {
              created = true;
            },
          },
        }
      )
    ).rejects.toMatchObject({ code: "SCHEDULE_LIMIT" });
    expect(created).toBe(false);
  });

  const chainFind = (rows) => (query) => {
    const api = {
      sort() {
        return api;
      },
      select() {
        return api;
      },
      async lean() {
        return rows
          .filter((row) => String(row.user) === String(query.user))
          .sort((a, b) => {
            const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (delta !== 0) return delta;
            return String(a._id).localeCompare(String(b._id));
          });
      },
    };
    return api;
  };

  test("parallel creates keep five schedules", async () => {
    const rows = [0, 1, 2, 3].map((index) => ({
      _id: `old-${index}`,
      user: user._id,
      proposalKey: `old-${index}`,
      createdAt: new Date(Date.UTC(2020, 0, index + 1)),
    }));
    let entered = 0;
    let counts = 0;
    let release = () => {};
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const model = {
      rows,
      countDocuments: async () => {
        counts += 1;
        return counts <= 8 ? 4 : rows.length;
      },
      findOne: async (query) =>
        rows.find(
          (row) => row.user === query.user && row.proposalKey === query.proposalKey
        ) || null,
      find: chainFind(rows),
      create: async (row) => {
        const saved = {
          ...row,
          _id: `new-${rows.length}`,
          createdAt: new Date(Date.UTC(2026, 0, rows.length + 1)),
        };
        saved.deleteOne = async () => {
          const index = rows.findIndex((item) => item._id === saved._id);
          if (index >= 0) rows.splice(index, 1);
        };
        rows.push(saved);
        entered += 1;
        if (entered >= 8) release();
        await gate;
        return saved;
      },
    };
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        confirmProposal(
          "demo",
          user,
          {
            season: "season1",
            proposal: {
              saved: false,
              action: "create",
              title: `할 일 ${index}`,
              prompt: "이번 주 할 일을 조회해서 정리해 줘",
              schedule: { kind: "daily", time: "09:00" },
              timezone: "Asia/Seoul",
            },
          },
          { ...teacherDeps, model }
        )
      )
    );
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rows).toHaveLength(5);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(rejected).toHaveLength(7);
    for (const result of rejected) {
      expect(result.reason.code).toBe("SCHEDULE_LIMIT");
    }
  });

  test("confirming the same proposal twice does not duplicate it", async () => {
    const rows = [];
    const model = {
      countDocuments: async () => rows.length,
      findOne: async (query) =>
        rows.find(
          (row) => row.user === query.user && row.proposalKey === query.proposalKey
        ) || null,
      find: chainFind(rows),
      create: async (row) => {
        const saved = { ...row, _id: "saved-once", createdAt: new Date(), deleteOne: async () => {} };
        rows.push(saved);
        return saved;
      },
    };
    const body = {
      season: "season1",
      proposal: {
        saved: false,
        action: "create",
        title: "월요일 할 일",
        prompt: "이번 주 할 일을 조회해서 정리해 줘",
        schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
        timezone: "Asia/Seoul",
      },
    };
    const first = await confirmProposal("demo", user, body, { ...teacherDeps, model });
    const second = await confirmProposal("demo", user, body, { ...teacherDeps, model });
    expect(second._id).toBe(first._id);
    expect(rows).toHaveLength(1);
  });

  test("a settings create of the same schedule is rejected", async () => {
    const rows = [];
    const model = {
      countDocuments: async () => rows.length,
      findOne: async (query) =>
        rows.find(
          (row) => row.user === query.user && row.proposalKey === query.proposalKey
        ) || null,
      find: chainFind(rows),
      create: async (row) => {
        const saved = { ...row, _id: "settings-1", createdAt: new Date(), deleteOne: async () => {} };
        rows.push(saved);
        return saved;
      },
    };
    const body = {
      season: "season1",
      title: "월요일 할 일",
      prompt: "이번 주 할 일을 조회해서 정리해 줘",
      timezone: "Asia/Seoul",
      schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
    };
    await createScheduleForUser("demo", user, body, "settings", { ...teacherDeps, model });
    await expect(
      createScheduleForUser("demo", user, body, "settings", { ...teacherDeps, model })
    ).rejects.toMatchObject({ status: 409, code: "SCHEDULE_DUPLICATE" });
    expect(rows).toHaveLength(1);
  });

  test("a duplicate key on confirm returns the row already stored", async () => {
    const existing = {
      _id: "saved-race",
      user: user._id,
      proposalKey: "pending",
      title: "월요일 할 일",
    };
    let lookups = 0;
    const model = {
      countDocuments: async () => 1,
      findOne: async () => {
        lookups += 1;
        return lookups === 1 ? null : existing;
      },
      create: async () => {
        const err = new Error("dup");
        err.code = 11000;
        throw err;
      },
    };
    const saved = await confirmProposal(
      "demo",
      user,
      {
        season: "season1",
        proposal: {
          saved: false,
          action: "create",
          title: "월요일 할 일",
          prompt: "이번 주 할 일을 조회해서 정리해 줘",
          schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
          timezone: "Asia/Seoul",
        },
      },
      { ...teacherDeps, model }
    );
    expect(saved._id).toBe("saved-race");
    expect(lookups).toBe(2);
  });

  test("a student run is forbidden before the schedule is loaded", async () => {
    const seen = [];
    await expect(
      beginManualRun("demo", { _id: "student" }, "sched-1", "season1", {
        findSeason: async () => {
          seen.push("season");
          return { _id: "season1" };
        },
        findRegistration: async () => {
          seen.push("registration");
          return { role: "student" };
        },
        model: {
          findOne: async () => {
            seen.push("find");
            return { _id: "sched-1" };
          },
        },
      })
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
    expect(seen).toEqual(["season", "registration"]);
  });

  test("an owner who is no longer a teacher can update, disable, and delete", async () => {
    const doc = {
      _id: "sched-1",
      user: user._id,
      title: "월요일 할 일",
      prompt: "이번 주 할 일을 조회해서 정리해 줘",
      timezone: "Asia/Seoul",
      schedule: { kind: "daily", time: "09:00" },
      nextRunAt: new Date("2020-01-01T00:00:00.000Z"),
      enabled: false,
      save: async () => {},
      deleteOne: async () => {
        doc.deleted = true;
      },
    };
    const model = { findOne: async () => doc };
    const updated = await updateScheduleForUser(
      "demo",
      user,
      "sched-1",
      { title: "아침 할 일" },
      model,
      teacherDeps
    );
    expect(updated.title).toBe("아침 할 일");
    doc.title = "아침 할 일";
    doc.enabled = false;
    doc.nextRunAt = new Date("2020-01-01T00:00:00.000Z");
    const enabled = await setScheduleEnabled("demo", user, "sched-1", true, model, teacherDeps);
    expect(enabled.enabled).toBe(true);
    expect(new Date(enabled.nextRunAt).getTime()).toBeGreaterThan(Date.now() - 1000);
    const removed = await deleteScheduleForUser("demo", user, "sched-1", model);
    expect(removed).toEqual({ deleted: true, id: "sched-1" });
    expect(doc.deleted).toBe(true);
  });

  test("re-enabling a passed daily slot does not fire immediately", async () => {
    const doc = {
      _id: "sched-1",
      user: user._id,
      timezone: "Asia/Seoul",
      schedule: { kind: "daily", time: "09:00" },
      nextRunAt: new Date("2020-01-01T00:00:00.000Z"),
      enabled: false,
      save: async () => {},
    };
    const row = await setScheduleEnabled(
      "demo",
      user,
      "sched-1",
      true,
      { findOne: async () => doc },
      teacherDeps
    );
    const next = new Date(row.nextRunAt).getTime();
    expect(next).toBeGreaterThan(Date.now());
    expect(next - Date.now()).toBeLessThan(26 * 60 * 60 * 1000);
  });
});
