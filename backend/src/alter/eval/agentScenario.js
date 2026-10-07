import mongoose from "mongoose";
import { executeAgentSkill } from "../../services/alterAgent.js";
import { executeClaimedSchedule } from "../../services/alterScheduleRun.js";
import { runSkillAgent } from "../runners/skill/run.js";
import { selectSkill } from "../skills/registry.js";
import { SCRIPTED_AGENT_API_KEY } from "../../services/alterAgentScriptedProvider.js";
import { readFixtureTodoFacts } from "../tools/lib/fixtureTodoFacts.js";
import { EVAL_ACADEMY } from "./mongo.js";

const academyFor = (override) => ({
  aiProvider: override?.aiProvider || "openai",
  aiApiKey: override?.aiApiKey || SCRIPTED_AGENT_API_KEY,
  aiModel: override?.aiModel || "gpt-4o-mini",
  aiEnabled: true,
});

const cast = () => {
  const schoolId = new mongoose.Types.ObjectId();
  const seasonId = new mongoose.Types.ObjectId();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    userId: "teacher1",
    userName: "김교사",
    auth: "member",
  };
  return {
    user,
    school: { _id: schoolId },
    season: { _id: seasonId },
    registration: { role: "teacher" },
  };
};

const executeTurn = (scenario, people) => {
  const skill = selectSkill({
    message: scenario.input?.prompt || "",
    role: people.registration?.role,
  });
  if (!skill) return executeAgentSkill;
  return (params) => runSkillAgent({ ...params, skillId: skill.id });
};

const runAgent = async (scenario, people, academy, options) => {
  const parseEvents = [];
  const execute = executeTurn(scenario, people);
  const result = await execute({
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
  const people = cast();
  const academy = academyFor(options.academy);
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
