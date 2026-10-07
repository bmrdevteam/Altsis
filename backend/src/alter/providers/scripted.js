/**
 * Dev/test stand-in for the Alter agent loop.
 *
 * Active only outside production, and only for the academy whose aiApiKey is
 * the dummy SCRIPTED_AGENT_API_KEY. A second academy on the same process with
 * a real key still calls the real provider. Other skills on this key never
 * reach a provider: outside production they get a Korean notice, and in
 * production the key is rejected before any network call.
 */

/** Dummy academy.aiApiKey that selects the scripted agent. Not a secret. */
export const SCRIPTED_AGENT_API_KEY = "scripted-local-dev";

export const SCRIPTED_DEMO_ONLY_AGENT_MESSAGE =
  "로컬 데모용 가짜 키라 에이전트 모드만 쓸 수 있어요. 진짜 AI는 실제 API 키가 있는 학원에서 테스트하세요.";

const TOKEN_USAGE = {
  promptTokens: 8,
  candidatesTokens: 24,
  thoughtsTokens: 0,
  totalTokens: 32,
};

const TOOL_TURN = [
  "```alter",
  JSON.stringify({
    type: "tool",
    name: "get_my_todos",
    arguments: { scope: "all", limit: 10 },
  }),
  "```",
].join("\n");

const FINAL_TEXT =
  "로그인한 계정의 할 일을 조회했습니다. 보드에는 필수 양식 「출석 점검」이 남아 있고, 수업 「문학 탐구」는 확인이 필요합니다.";

const FINAL_TURN = [
  "```alter",
  JSON.stringify({ type: "final", text: FINAL_TEXT }),
  "```",
].join("\n");

const isProduction = () => String(process.env.NODE_ENV || "").trim() === "production";

export const isScriptedDemoKey = (apiKey) =>
  String(apiKey || "").trim() === SCRIPTED_AGENT_API_KEY;

export const isAlterAgentScriptedEnabled = (apiKey) => {
  if (isProduction()) return false;
  return isScriptedDemoKey(apiKey);
};

/**
 * Dummy key, but not the agent script. Production rejects it as an invalid
 * key. Anywhere else, return a notice and do not call a provider.
 * @param {string} [apiKey]
 * @returns {{ text: string, toolCalls: object[], tokenUsage: object } | null}
 */
export const scriptedDemoKeyBlocked = (apiKey) => {
  if (!isScriptedDemoKey(apiKey)) return null;
  if (isProduction()) {
    const err = new Error("AI API key is not valid");
    err.status = 401;
    err.code = "AI_INVALID_API_KEY";
    throw err;
  }
  return {
    text: SCRIPTED_DEMO_ONLY_AGENT_MESSAGE,
    toolCalls: [],
    tokenUsage: {
      promptTokens: 0,
      candidatesTokens: 0,
      thoughtsTokens: 0,
      totalTokens: 0,
    },
  };
};

const groupScriptedPlan = (steps, native) => {
  const turns = [];
  let batch = [];
  const flush = () => {
    if (!batch.length) return;
    if (native) turns.push({ toolCalls: batch });
    else {
      for (const call of batch) turns.push({ toolCalls: [call] });
    }
    batch = [];
  };
  for (const step of steps) {
    if (step?.call) {
      batch.push({
        name: String(step.call),
        arguments:
          step.arguments && typeof step.arguments === "object" && !Array.isArray(step.arguments)
            ? step.arguments
            : {},
      });
      continue;
    }
    flush();
    if (step && (step.final != null || step.invalid != null)) {
      turns.push({
        text: String(step.final != null ? step.final : step.invalid),
      });
    }
  }
  flush();
  return turns;
};

const playScriptedPlan = ({ messages, tools, toolChoice, native, scriptedPlan }) => {
  const listed = new Set((Array.isArray(tools) ? tools : []).map((tool) => tool?.name));
  const turns = groupScriptedPlan(scriptedPlan, native);
  const index = (messages || []).filter((row) => row?.role === "assistant").length;
  const turn = turns[index] || turns[turns.length - 1] || { text: "" };
  const calls = (turn.toolCalls || []).filter((call) => !listed.size || listed.has(call.name));
  const usage = { ...TOKEN_USAGE };
  if (toolChoice !== "none" && calls.length && index < turns.length) {
    if (native) {
      return {
        text: "",
        toolCalls: calls.map((call, i) => ({
          id: `scripted-plan-${index}-${i}`,
          name: call.name,
          arguments: call.arguments,
        })),
        tokenUsage: usage,
      };
    }
    const call = calls[0];
    return {
      text: ["```alter", JSON.stringify({ type: "tool", name: call.name, arguments: call.arguments }), "```"].join(
        "\n"
      ),
      tokenUsage: usage,
    };
  }
  const text = String(turn.text || "");
  if (native) return { text, toolCalls: [], tokenUsage: usage };
  return {
    text: ["```alter", JSON.stringify({ type: "final", text }), "```"].join("\n"),
    tokenUsage: usage,
  };
};

const delayMs = () => {
  const n = Number(process.env.ALTER_AGENT_SCRIPTED_DELAY_MS || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), 10000);
};

const isAgentPrompt = (systemInstruction) =>
  /읽기 전용 에이전트/.test(String(systemInstruction || ""));

const sawToolResult = (messages) =>
  (messages || []).some((row) => {
    if (row?.role === "tool") return true;
    if (Array.isArray(row?.toolCalls) && row.toolCalls.length) return true;
    return String(row?.content || "").includes("<tool_result");
  });

const latestUserText = (messages) => {
  const rows = messages || [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row?.role !== "user") continue;
    const content = String(row.content || "");
    if (content.includes("<tool_result")) continue;
    return content;
  }
  return "";
};

const DAY_INDEX = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

/** Demo academy: a schedule-shaped request proposes manage_schedule and does not save. */
export const isScriptedScheduleRequest = (text) => {
  const value = String(text || "");
  if (/매주|매일|루틴/.test(value)) return true;
  return /예약/.test(value) && /할 일|정리|실행/.test(value);
};

export const scriptedScheduleArguments = (text) => {
  const value = String(text || "");
  const day = value.match(/([일월화수목금토])요일/);
  const weekday = day ? DAY_INDEX[day[1]] : 1;
  const hourMatch = value.match(/(\d{1,2})\s*시/);
  let hour = hourMatch ? Number(hourMatch[1]) : 8;
  if (/오후/.test(value) && hour < 12) hour += 12;
  if (hour > 23) hour = 8;
  const time = `${String(hour).padStart(2, "0")}:00`;
  const daily = /매일/.test(value) && !/매주/.test(value);
  const schedule = daily
    ? { kind: "daily", time }
    : { kind: "weekly", time, weekdays: [weekday] };
  return {
    action: "propose_create",
    title: daily ? "매일 할 일" : "매주 할 일",
    prompt: "이번 주 할 일을 조회하고, 입력 위치가 필요하면 제품 안내를 찾아 정리해 줘",
    schedule,
  };
};

const SCHEDULE_FINAL_TEXT =
  "예약은 아직 저장되지 않았습니다. 아래 카드에서 저장을 눌러 주세요.";

const scheduleFence = (args) =>
  ["```alter", JSON.stringify({ type: "tool", name: "manage_schedule", arguments: args }), "```"].join(
    "\n"
  );

const scheduleFinalFence = () =>
  ["```alter", JSON.stringify({ type: "final", text: SCHEDULE_FINAL_TEXT }), "```"].join("\n");

/**
 * Fence path (no tools): ```alter get_my_todos, then a fenced final answer.
 * Native path (tools passed): the same turn as OpenAI/Anthropic tool_calls,
 * then a plain-text final answer.
 * @param {{ apiKey?: string, systemInstruction?: string, messages?: object[], tools?: object[], toolChoice?: string }} params
 * @returns {Promise<{ text: string, toolCalls?: object[], tokenUsage: object } | null>}
 */
export const scriptedAgentGenerate = async ({
  apiKey,
  systemInstruction,
  messages,
  tools,
  toolChoice,
  scriptedPlan,
  force = false,
} = {}) => {
  if (!force && !isAlterAgentScriptedEnabled(apiKey)) return null;
  if (force && isProduction() && isScriptedDemoKey(apiKey)) return null;
  if (!isAgentPrompt(systemInstruction)) return null;

  const instruction = String(systemInstruction || "");
  const fencePrompt = /```alter/.test(instruction);
  const native = Array.isArray(tools) && tools.length > 0 && !fencePrompt;
  const sawResult = sawToolResult(messages);
  const userText = latestUserText(messages);
  const scheduleToolAvailable = (Array.isArray(tools) ? tools : []).some(
    (tool) => tool?.name === "manage_schedule"
  );
  const triggerToolAvailable = (Array.isArray(tools) ? tools : []).some(
    (tool) => tool?.name === "get_trigger_events"
  );
  const scheduleRequest =
    scheduleToolAvailable && isScriptedScheduleRequest(userText);
  const scheduleArgs = scheduleRequest ? scriptedScheduleArguments(userText) : null;
  const wait = delayMs();
  if (wait) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  if (Array.isArray(scriptedPlan) && scriptedPlan.length) {
    return playScriptedPlan({ messages, tools, toolChoice, native, scriptedPlan });
  }
  const triggerRequest =
    triggerToolAvailable && /get_trigger_events/.test(userText) && !scheduleRequest;
  if (triggerRequest) {
    if (native) {
      if (!sawResult && toolChoice !== "none") {
        return {
          text: "",
          toolCalls: [{ id: "scripted-call-events", name: "get_trigger_events", arguments: {} }],
          tokenUsage: { ...TOKEN_USAGE },
        };
      }
      return {
        text: "트리거로 쌓인 항목을 조회했습니다.",
        toolCalls: [],
        tokenUsage: { ...TOKEN_USAGE },
      };
    }
    const fence = sawResult
      ? ["```alter", JSON.stringify({ type: "final", text: "트리거로 쌓인 항목을 조회했습니다." }), "```"].join("\n")
      : ["```alter", JSON.stringify({ type: "tool", name: "get_trigger_events", arguments: {} }), "```"].join("\n");
    return { text: fence, tokenUsage: { ...TOKEN_USAGE } };
  }
  if (scheduleRequest) {
    if (native) {
      if (!sawResult && toolChoice !== "none") {
        return {
          text: "",
          toolCalls: [
            {
              id: "scripted-call-schedule",
              name: "manage_schedule",
              arguments: scheduleArgs,
            },
          ],
          tokenUsage: { ...TOKEN_USAGE },
        };
      }
      return { text: SCHEDULE_FINAL_TEXT, toolCalls: [], tokenUsage: { ...TOKEN_USAGE } };
    }
    return {
      text: sawResult ? scheduleFinalFence() : scheduleFence(scheduleArgs),
      tokenUsage: { ...TOKEN_USAGE },
    };
  }
  if (native) {
    if (!sawResult && toolChoice !== "none") {
      return {
        text: "",
        toolCalls: [
          {
            id: "scripted-call-1",
            name: "get_my_todos",
            arguments: { scope: "all", limit: 10 },
          },
        ],
        tokenUsage: { ...TOKEN_USAGE },
      };
    }
    return { text: FINAL_TEXT, toolCalls: [], tokenUsage: { ...TOKEN_USAGE } };
  }
  return {
    text: sawResult ? FINAL_TURN : TOOL_TURN,
    tokenUsage: { ...TOKEN_USAGE },
  };
};

export const SCRIPTED_AGENT_FINAL_TEXT = FINAL_TEXT;
export const SCRIPTED_SCHEDULE_FINAL_TEXT = SCHEDULE_FINAL_TEXT;

const normalizedUsage = (usage) => ({
  promptTokens: Number(usage?.promptTokens) || 0,
  candidatesTokens: Number(usage?.candidatesTokens) || 0,
  thoughtsTokens: Number(usage?.thoughtsTokens) || 0,
  totalTokens: Number(usage?.totalTokens) || 0,
});

/** Official scripted provider. The plan is an argument of this call, never a global. */
export const createScriptedAdapter = () => ({
  id: "scripted",
  capabilities: { nativeTools: true, streaming: false, images: false },
  async generate(req = {}) {
    if (isProduction() && isScriptedDemoKey(req.apiKey)) {
      const err = new Error("AI API key is not valid");
      err.status = 401;
      err.code = "AI_INVALID_API_KEY";
      throw err;
    }
    const result = await scriptedAgentGenerate({
      apiKey: isScriptedDemoKey(req.apiKey) ? req.apiKey : SCRIPTED_AGENT_API_KEY,
      systemInstruction: req.system || req.systemInstruction,
      messages: req.messages,
      tools: req.tools,
      toolChoice: req.toolChoice,
      scriptedPlan: req.scriptedPlan,
      force: true,
    });
    if (!result) {
      return {
        text: SCRIPTED_DEMO_ONLY_AGENT_MESSAGE,
        toolCalls: [],
        usage: normalizedUsage(null),
        finish: "stop",
      };
    }
    const toolCalls = Array.isArray(result.toolCalls) ? result.toolCalls : [];
    return {
      text: String(result.text || ""),
      toolCalls,
      usage: normalizedUsage(result.tokenUsage),
      finish: toolCalls.length ? "tool_calls" : "stop",
    };
  },
});
