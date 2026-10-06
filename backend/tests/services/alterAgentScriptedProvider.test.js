import { generateText } from "../../src/services/aiProvider.js";
import {
  SCRIPTED_AGENT_API_KEY,
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

  test("stays off in production and for any other api key", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALTER_AGENT_SCRIPTED = "1";
    expect(isAlterAgentScriptedEnabled(SCRIPTED_AGENT_API_KEY)).toBe(false);
    expect(
      await scriptedAgentGenerate({
        apiKey: SCRIPTED_AGENT_API_KEY,
        systemInstruction: AGENT_PROMPT,
        messages: [],
      })
    ).toBeNull();

    process.env.NODE_ENV = "development";
    expect(isAlterAgentScriptedEnabled("sk-real-key")).toBe(false);
    expect(isAlterAgentScriptedEnabled("")).toBe(false);
    expect(
      await scriptedAgentGenerate({
        apiKey: "sk-real-key",
        systemInstruction: AGENT_PROMPT,
        messages: [],
      })
    ).toBeNull();
    delete process.env.ALTER_AGENT_SCRIPTED;
  });

  test("scripts only the dummy-key academy, then a final answer", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALTER_AGENT_SCRIPTED_DELAY_MS;

    expect(
      await scriptedAgentGenerate({
        apiKey: SCRIPTED_AGENT_API_KEY,
        systemInstruction: "검색 SQL만 작성합니다.",
        messages: [],
      })
    ).toBeNull();

    const first = await generateText({
      provider: "openai",
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: "오늘 할 일" }],
    });
    expect(first.text).toContain('"name":"get_my_todos"');
    expect(first.text).not.toContain("userId");

    const realAcademy = await scriptedAgentGenerate({
      apiKey: "sk-real-key",
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: "오늘 할 일" }],
    });
    expect(realAcademy).toBeNull();

    const second = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      messages: [
        { role: "user", content: "오늘 할 일" },
        { role: "user", content: '<tool_result name="get_my_todos">[]</tool_result>' },
      ],
    });
    expect(second.text).toContain(SCRIPTED_AGENT_FINAL_TEXT);
  });

  test("returns native tool_calls when the caller passes tools", async () => {
    process.env.NODE_ENV = "development";
    const tools = [
      {
        name: "get_my_todos",
        description: "할 일",
        parameters: { type: "object", properties: { scope: { type: "string" } } },
      },
    ];
    const first = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: "오늘 할 일" }],
      tools,
    });
    expect(first.toolCalls).toEqual([
      {
        id: "scripted-call-1",
        name: "get_my_todos",
        arguments: { scope: "all", limit: 10 },
      },
    ]);
    expect(first.text).toBe("");

    const second = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      tools,
      messages: [
        { role: "user", content: "오늘 할 일" },
        { role: "assistant", content: "", toolCalls: first.toolCalls },
        { role: "tool", toolCallId: "scripted-call-1", name: "get_my_todos", content: "<tool_result>" },
      ],
    });
    expect(second.toolCalls).toEqual([]);
    expect(second.text).toBe(SCRIPTED_AGENT_FINAL_TEXT);
    expect(second.text).not.toContain("```");

    const forced = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: "오늘 할 일" }],
      tools,
      toolChoice: "none",
    });
    expect(forced.toolCalls).toEqual([]);
    expect(forced.text).toBe(SCRIPTED_AGENT_FINAL_TEXT);
  });
});
