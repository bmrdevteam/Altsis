import mongoose from "mongoose";
import { accessToEvent } from "../../services/alterEventAccess.js";
import { enqueueAlterEvent } from "../../services/alterEvent.js";
import {
  beginManualRun,
  confirmProposal,
  createScheduleForUser,
  findOwnedSchedule,
  setScheduleEnabled,
} from "../../services/alterScheduleService.js";
import { scheduleModelFor } from "../../services/alterScheduleService.js";
import { assertReadOnlyPrompt } from "../../services/alterScheduleTime.js";
import { EVAL_ACADEMY } from "./mongo.js";
import { runAgentScenario } from "./agentScenario.js";
import { runReadToolsCheck } from "../tools/readToolsFixture.js";
import { runOtherClassCheck } from "../tools/submissionBoundaryCheck.js";
import { runWebSearchCheck } from "../tools/webSearchFixture.js";
import { runImageGenCheck } from "../tools/imageGenFixture.js";

const person = (userId) => ({
  _id: new mongoose.Types.ObjectId(),
  userId,
  userName: userId,
  auth: "member",
});

const depsFor = (role) => {
  const seasonId = new mongoose.Types.ObjectId();
  const schoolId = new mongoose.Types.ObjectId();
  return {
    seasonId,
    schoolId,
    deps: {
      findSeason: async () => ({ _id: seasonId, school: schoolId }),
      findRegistration: async () => ({ role }),
      findAcademy: async () => ({ aiEnabled: true, alterEventTriggersEnabled: true }),
      model: scheduleModelFor(EVAL_ACADEMY),
    },
  };
};

const weekly = (title, index) => ({
  title,
  prompt: "이번 주 할 일을 조회해서 정리해 줘",
  timezone: "Asia/Seoul",
  schedule: { kind: "weekly", time: "08:00", weekdays: [((index || 0) % 5) + 1] },
});

const caught = async (fn) => {
  try {
    return { value: await fn() };
  } catch (err) {
    return { err };
  }
};

export const runServiceCheck = async (scenario, options) => {
  if (scenario.check === "cross-account") return crossAccount();
  if (scenario.check === "student-403") return studentDenied();
  if (scenario.check === "schedule-limit") return scheduleLimit();
  if (scenario.check === "duplicate-confirm") return duplicateConfirm();
  if (scenario.check === "write-intent") return writeIntent(scenario);
  if (scenario.check === "deleted-row") return deletedRow(scenario, options);
  if (scenario.check === "flag-off") return flagOff();
  if (scenario.check === "read-tools") return runReadToolsCheck();
  if (scenario.check === "read-other-class") return runOtherClassCheck();
  if (scenario.check === "web-search") return runWebSearchCheck();
  if (scenario.check === "image-gen") return runImageGenCheck();
  throw new Error(`unknown check ${scenario.check}`);
};

const crossAccount = async () => {
  const owner = person("teacher1");
  const other = person("teacherA");
  const { seasonId, deps } = depsFor("teacher");
  const saved = await createScheduleForUser(
    EVAL_ACADEMY,
    owner,
    { season: String(seasonId), ...weekly("월요일 아침 브리핑", 1) },
    "settings",
    deps
  );
  const missed = await caught(() =>
    findOwnedSchedule(EVAL_ACADEMY, other, saved._id, deps.model)
  );
  const disabled = await caught(() =>
    setScheduleEnabled(EVAL_ACADEMY, other, saved._id, false, deps.model)
  );
  const err = missed.err || disabled.err;
  return {
    status: err?.status,
    code: err?.code,
    message: err?.message,
    statuses: [missed.err?.status, disabled.err?.status],
    toolNames: [],
    text: "",
  };
};

const studentDenied = async () => {
  const student = person("student1");
  const { seasonId, deps } = depsFor("student");
  const body = { season: String(seasonId), ...weekly("학생 예약", 1) };
  const created = await caught(() =>
    createScheduleForUser(EVAL_ACADEMY, student, body, "settings", deps)
  );
  const confirmed = await caught(() =>
    confirmProposal(
      EVAL_ACADEMY,
      student,
      {
        season: String(seasonId),
        proposal: { saved: false, action: "create", ...weekly("학생 제안", 2) },
      },
      deps
    )
  );
  const ran = await caught(() =>
    beginManualRun(EVAL_ACADEMY, student, new mongoose.Types.ObjectId(), String(seasonId), deps)
  );
  return {
    statuses: [created.err?.status, confirmed.err?.status, ran.err?.status],
    codes: [created.err?.code, confirmed.err?.code, ran.err?.code].filter(Boolean),
    toolNames: [],
    text: "",
  };
};

const scheduleLimit = async () => {
  const user = person("teacher-limit");
  const { seasonId, deps } = depsFor("teacher");
  let created = 0;
  let err = null;
  for (let n = 1; n <= 6; n += 1) {
    const result = await caught(() =>
      createScheduleForUser(
        EVAL_ACADEMY,
        user,
        { season: String(seasonId), ...weekly(`예약 ${n}`, n) },
        "settings",
        deps
      )
    );
    if (result.err) {
      err = result.err;
      break;
    }
    created += 1;
  }
  return {
    created,
    status: err?.status,
    code: err?.code,
    message: err?.message,
    toolNames: [],
    text: "",
  };
};

const duplicateConfirm = async () => {
  const user = person("teacher-confirm");
  const { seasonId, deps } = depsFor("teacher");
  const proposal = {
    saved: false,
    action: "create",
    ...weekly("같은 제안", 1),
  };
  const body = { season: String(seasonId), proposal };
  const first = await confirmProposal(EVAL_ACADEMY, user, body, deps);
  const second = await confirmProposal(EVAL_ACADEMY, user, body, deps);
  const count = await deps.model.countDocuments({ user: user._id });
  return {
    sameId: String(first._id) === String(second._id),
    count,
    toolNames: [],
    text: "",
  };
};

const writeIntent = async (scenario) => {
  const allowedText = scenario.input?.allowed || "미제출인지 알려 줘";
  const refusedText = scenario.input?.refused || "제출해 줘";
  let allowed = false;
  let refused = false;
  try {
    assertReadOnlyPrompt(allowedText);
    allowed = true;
  } catch (_) {
    allowed = false;
  }
  try {
    assertReadOnlyPrompt(refusedText);
  } catch (err) {
    refused = err?.status === 400;
  }
  return { allowed, refused, toolNames: [], text: "" };
};

const deletedRow = async (scenario, options) => {
  const owner = person("teacher1");
  const boardId = String(new mongoose.Types.ObjectId());
  const formId = String(new mongoose.Types.ObjectId());
  const title = scenario.input?.title || "출석 이상 보고";
  const seen = await accessToEvent(
    EVAL_ACADEMY,
    { user: owner._id, owner },
    {
      type: "form_submitted",
      entityType: "altSheetRow",
      entityId: String(new mongoose.Types.ObjectId()),
      formId,
      boardId,
      title,
    },
    {
      owner: async () => owner,
      row: async () => null,
      form: async () => ({ title, board: boardId }),
      board: async () => ({ _id: boardId }),
      manage: () => true,
    }
  );
  const agent = await runAgentScenario(
    {
      ...scenario,
      runner: "event",
      input: {
        prompt: scenario.input?.prompt,
        title: scenario.input?.scheduleTitle || "삭제된 제출",
        events: [
          {
            type: "form_submitted",
            title,
            excerpt: title,
            unavailable: true,
            at: new Date().toISOString(),
          },
        ],
      },
    },
    options
  );
  return {
    ...agent,
    unavailable: seen?.unavailable === true,
    excerpt: seen?.excerpt || "",
    runStatus: agent.runStatus,
  };
};

const flagOff = async () => {
  let listed = false;
  const queued = await enqueueAlterEvent(
    EVAL_ACADEMY,
    {
      type: "form_submitted",
      entityType: "altSheetRow",
      entityId: String(new mongoose.Types.ObjectId()),
      title: "제출",
    },
    {
      findAcademy: async () => ({ alterEventTriggersEnabled: false }),
      findRoutines: async () => {
        listed = true;
        return [];
      },
    }
  );
  const user = person("teacher-flag");
  const { seasonId, deps } = depsFor("teacher");
  deps.findAcademy = async () => ({ aiEnabled: true, alterEventTriggersEnabled: false });
  const created = await caught(() =>
    createScheduleForUser(
      EVAL_ACADEMY,
      user,
      {
        season: String(seasonId),
        title: "제출 알림",
        prompt: "제출이 있으면 제목만 알려 줘",
        timezone: "Asia/Seoul",
        trigger: "event",
        event: { types: ["form_submitted"], debounceMs: 15 * 60 * 1000 },
      },
      "settings",
      deps
    )
  );
  return {
    enqueueReason: queued.reason,
    status: created.err?.status,
    code: created.err?.code,
    notified: listed,
    toolNames: [],
    text: "",
  };
};
