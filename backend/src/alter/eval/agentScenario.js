import mongoose from "mongoose";
import { executeAgentSkill } from "../../services/alterAgent.js";
import { executeClaimedSchedule } from "../../services/alterScheduleRun.js";
import { runSkillAgent } from "../runners/skill/run.js";
import { listSkills, selectSkill } from "../skills/registry.js";
import { SCRIPTED_AGENT_API_KEY } from "../../services/alterAgentScriptedProvider.js";
import { readFixtureTodoFacts } from "../tools/lib/fixtureTodoFacts.js";
import { EVAL_ACADEMY } from "./mongo.js";

const academyFor = (override) => ({
  aiProvider: override?.aiProvider || "openai",
  aiApiKey: override?.aiApiKey || SCRIPTED_AGENT_API_KEY,
  aiModel: override?.aiModel || "gpt-4o-mini",
  aiEnabled: true,
  webSearchEnabled: override?.webSearchEnabled === true,
});

const cast = (scenario) => {
  const schoolId = new mongoose.Types.ObjectId();
  const seasonId = new mongoose.Types.ObjectId();
  const role = scenario?.role === "student" ? "student" : "teacher";
  const user = {
    _id: new mongoose.Types.ObjectId(),
    userId: role === "student" ? "student1" : "teacher1",
    userName: role === "student" ? "김학생" : "김교사",
    auth: role === "student" ? "student" : "member",
  };
  return {
    user,
    school: { _id: schoolId },
    season: { _id: seasonId },
    registration: { role },
  };
};

const executeTurn = (scenario, people) => {
  const message = scenario.input?.prompt || "";
  const role = people.registration?.role;
  const skill = selectSkill({ message, role });
  if (skill) return (params) => runSkillAgent({ ...params, skillId: skill.id });
  const named = listSkills().find((item) => message.includes(item.id));
  if (named) return (params) => runSkillAgent({ ...params, skillId: named.id });
  return executeAgentSkill;
};

const runAgent = async (scenario, people, academy, options) => {
  const parseEvents = [];
  const execute = executeTurn(scenario, people);
  let result;
  try {
    result = await execute({
    academyId: "eval",
    user: people.user,
    academy,
    season: people.season,
    school: people.school,
    registration: people.registration,
    message: scenario.input?.prompt || "",
    history: [],
    allowScheduleTool: scenario.runner !== "event" && scenario.runner !== "schedule",
    triggerEvents: scenario.runner === "event" ? scenario.input?.events || [] : undefined,
    scriptedPlan: options.mode === "real" ? undefined : scenario.scripted,
    generate: options.generate,
    onEvent: (name, data) => {
      if (name === "tool" && data?.name === "_parse" && data?.status === "error") {
        parseEvents.push(data);
      }
    },
  });
  } catch (err) {
    if (err?.code === "FORBIDDEN" || err?.code === "PERMISSION_DENIED") {
      return {
        text: err.message || "권한이 없습니다.",
        toolNames: [],
        toolSteps: 0,
        links: [],
        proposal: null,
        parseErrors: 0,
        trace: [],
        tokenUsage: null,
        status: err.status || 403,
        code: err.code,
      };
    }
    throw err;
  }
  return {
    text: result.text || "",
    toolNames: result.toolNames || [],
    toolSteps: result.toolSteps || 0,
    links: result.links || [],
    proposal: result.scheduleProposal || null,
    parseErrors: parseEvents.length,
    trace: result.trace || [],
    tokenUsage: result.tokenUsage || null,
  };
};

const withFixtureTodos = async (scenario, people, result, mode) => {
  if (mode !== "real" || !scenario?.real?.text?.emptyCourses) return result;
  const fixtureTodos = await readFixtureTodoFacts({
    academyId: EVAL_ACADEMY,
    user: people.user,
    school: people.school,
    seasonId: String(people.season?._id || ""),
  });
  return { ...result, fixtureTodos };
};

export const runAgentScenario = async (scenario, options = {}) => {
  const people = cast(scenario);
  const academy = academyFor(options.academy);
  if (scenario.academy?.webSearchEnabled === true) academy.webSearchEnabled = true;
  if (scenario.runner === "chat") {
    const result = await runAgent(scenario, people, academy, options);
    return withFixtureTodos(scenario, people, result, options.mode);
  }
  const notifications = [];
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    user: people.user._id,
    prompt: scenario.input?.prompt || "",
    title: scenario.input?.title || scenario.id,
    trigger: scenario.runner === "event" ? "event" : "time",
    season: people.season._id,
    timezone: "Asia/Seoul",
    pending: { events: scenario.input?.events || [] },
  };
  const patch = await executeClaimedSchedule({
    academyId: "eval",
    doc,
    deps: {
      loadContext: async () => ({
        ...people,
        triggerEvents: scenario.runner === "event" ? scenario.input?.events || [] : undefined,
      }),
      executeAgent: (args) =>
        runAgent(
          { ...scenario, input: { ...scenario.input, prompt: args.message } },
          people,
          academy,
          options
        ).then((agent) => {
          doc._agent = agent;
          return agent;
        }),
      persistTurn: async () => ({ conversation: { _id: new mongoose.Types.ObjectId() } }),
      notify: async (payload) => {
        notifications.push(payload);
      },
      save: async () => {},
    },
  });
  const agent = doc._agent || {};
  const note = notifications[0];
  return withFixtureTodos(
    scenario,
    people,
    {
      text: agent.text || "",
      toolNames: agent.toolNames || patch?.runs?.at?.(-1)?.toolNames || [],
      toolSteps: agent.toolSteps || 0,
      links: agent.links || [],
      proposal: agent.proposal || null,
      parseErrors: agent.parseErrors || 0,
      trace: agent.trace || [],
      tokenUsage: agent.tokenUsage || null,
      notification: note
        ? { type: note.notificationType, description: note.description || "" }
        : null,
      runStatus: patch?.lastStatus || "",
    },
    options.mode
  );
};
