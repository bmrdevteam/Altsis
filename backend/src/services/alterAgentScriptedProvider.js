/**
 * Dev/test stand-in for the Alter agent loop.
 *
 * Active only when ALTER_AGENT_SCRIPTED=1 and NODE_ENV is not production.
 * The first agent model call returns a get_my_todos tool fence. After a
 * <tool_result> is in the transcript, the next call returns a final answer.
 * Other skills keep using the real provider.
 */

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

export const isAlterAgentScriptedEnabled = () => {
  if (String(process.env.NODE_ENV || "").trim() === "production") return false;
  return String(process.env.ALTER_AGENT_SCRIPTED || "").trim() === "1";
};

const delayMs = () => {
  const n = Number(process.env.ALTER_AGENT_SCRIPTED_DELAY_MS || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), 10000);
};

const isAgentPrompt = (systemInstruction) =>
  /읽기 전용 에이전트/.test(String(systemInstruction || ""));

/**
 * @param {{ systemInstruction?: string, messages?: Array<{ content?: string }> }} params
 * @returns {Promise<{ text: string, tokenUsage: object } | null>}
 */
export const scriptedAgentGenerate = async ({ systemInstruction, messages } = {}) => {
  if (!isAlterAgentScriptedEnabled()) return null;
  if (!isAgentPrompt(systemInstruction)) return null;

  const sawResult = (messages || []).some((row) =>
    String(row?.content || "").includes("<tool_result")
  );
  const wait = delayMs();
  if (wait) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return {
    text: sawResult ? FINAL_TURN : TOOL_TURN,
    tokenUsage: { ...TOKEN_USAGE },
  };
};

export const SCRIPTED_AGENT_FINAL_TEXT = FINAL_TEXT;
