import { generateText } from "../../src/services/aiProvider.js";
import {
  SCRIPTED_AGENT_FINAL_TEXT,
  isAlterAgentScriptedEnabled,
  scriptedAgentGenerate,
} from "../../src/services/alterAgentScriptedProvider.js";

const AGENT_PROMPT = "당신은 Altsis Alter의 읽기 전용 에이전트입니다.";

describe("alterAgentScriptedProvider", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFlag = process.env.ALTER_AGENT_SCRIPTED;
  const prevDelay = process.env.ALTER_AGENT_SCRIPTED_DELAY_MS;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevFlag == null) delete process.env.ALTER_AGENT_SCRIPTED;
    else process.env.ALTER_AGENT_SCRIPTED = prevFlag;
    if (prevDelay == null) delete process.env.ALTER_AGENT_SCRIPTED_DELAY_MS;
    else process.env.ALTER_AGENT_SCRIPTED_DELAY_MS = prevDelay;
  });

  test("stays off in production and when the flag is unset", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALTER_AGENT_SCRIPTED = "1";
    expect(isAlterAgentScriptedEnabled()).toBe(false);
    expect(
      await scriptedAgentGenerate({
        systemInstruction: AGENT_PROMPT,
        messages: [],
      })
    ).toBeNull();

    process.env.NODE_ENV = "development";
    delete process.env.ALTER_AGENT_SCRIPTED;
    expect(isAlterAgentScriptedEnabled()).toBe(false);
  });

  test("scripts a tool call then a final answer, and ignores other skills", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALTER_AGENT_SCRIPTED = "1";
    delete process.env.ALTER_AGENT_SCRIPTED_DELAY_MS;

    expect(
      await scriptedAgentGenerate({
        systemInstruction: "검색 SQL만 작성합니다.",
        messages: [],
      })
    ).toBeNull();

    const first = await generateText({
      provider: "gemini",
      apiKey: "not-used",
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: "오늘 할 일" }],
    });
    expect(first.text).toContain('"name":"get_my_todos"');
    expect(first.text).not.toContain("userId");

    const second = await scriptedAgentGenerate({
      systemInstruction: AGENT_PROMPT,
      messages: [
        { role: "user", content: "오늘 할 일" },
        { role: "user", content: "<tool_result name=\"get_my_todos\">[]</tool_result>" },
      ],
    });
    expect(second.text).toContain(SCRIPTED_AGENT_FINAL_TEXT);
  });
});
