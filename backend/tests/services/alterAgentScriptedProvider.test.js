import { generateText, generateTextStream } from "../../src/services/aiProvider.js";
import {
  SCRIPTED_AGENT_API_KEY,
  SCRIPTED_AGENT_FINAL_TEXT,
  SCRIPTED_DEMO_ONLY_AGENT_MESSAGE,
  SCRIPTED_SCHEDULE_FINAL_TEXT,
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
    const fetchSpy = jest.spyOn(global, "fetch");
    await expect(
      generateText({
        provider: "openai",
        apiKey: SCRIPTED_AGENT_API_KEY,
        model: "gpt-4o-mini",
        systemInstruction: AGENT_PROMPT,
        messages: [{ role: "user", content: "오늘 할 일" }],
      })
    ).rejects.toMatchObject({ status: 401, code: "AI_INVALID_API_KEY" });
    await expect(
      generateTextStream(
        {
          provider: "openai",
          apiKey: SCRIPTED_AGENT_API_KEY,
          model: "gpt-4o-mini",
          systemInstruction: "검색 SQL만 작성합니다.",
          messages: [{ role: "user", content: "출석" }],
        },
        () => {}
      )
    ).rejects.toMatchObject({ status: 401, code: "AI_INVALID_API_KEY" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

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

  test("a schedule request proposes manage_schedule and does not save", async () => {
    process.env.NODE_ENV = "development";
    const tools = [
      {
        name: "manage_schedule",
        description: "예약",
        parameters: { type: "object" },
      },
    ];
    const message = "매주 월요일 아침 8시에 이번 주 할 일 정리해 줘";
    const schedulePrompt = `${AGENT_PROMPT}\n- manage_schedule (예약)`;
    const first = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: schedulePrompt,
      messages: [{ role: "user", content: message }],
      tools,
    });
    expect(first.toolCalls).toEqual([
      {
        id: "scripted-call-schedule",
        name: "manage_schedule",
        arguments: {
          action: "propose_create",
          title: "매주 할 일",
          prompt: "이번 주 할 일을 조회하고, 입력 위치가 필요하면 제품 안내를 찾아 정리해 줘",
          schedule: { kind: "weekly", time: "08:00", weekdays: [1] },
        },
      },
    ]);
    expect(JSON.stringify(first)).not.toContain('"saved":true');

    const second = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: schedulePrompt,
      tools,
      messages: [
        { role: "user", content: message },
        {
          role: "tool",
          toolCallId: "scripted-call-schedule",
          name: "manage_schedule",
          content: "<tool_result>",
        },
      ],
    });
    expect(second.toolCalls).toEqual([]);
    expect(second.text).toBe(SCRIPTED_SCHEDULE_FINAL_TEXT);

    const fence = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: schedulePrompt,
      messages: [{ role: "user", content: message }],
    });
    expect(fence.text).toContain('"name":"manage_schedule"');
    expect(fence.text).not.toContain('"saved":true');

    const readonlyRun = await scriptedAgentGenerate({
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: message }],
      tools,
    });
    expect(readonlyRun.toolCalls[0].name).toBe("get_my_todos");
  });

  test("dummy key never calls a provider for non-agent skills", async () => {
    process.env.NODE_ENV = "development";
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { role: "assistant", content: "should-not-run" } }],
      }),
      text: async () => "",
    });

    const chat = await generateText({
      provider: "openai",
      apiKey: SCRIPTED_AGENT_API_KEY,
      model: "gpt-4o-mini",
      systemInstruction: "검색 SQL만 작성합니다.",
      messages: [{ role: "user", content: "출석 요약" }],
    });
    expect(chat.text).toBe(SCRIPTED_DEMO_ONLY_AGENT_MESSAGE);
    expect(chat.text).toContain("에이전트 모드만");

    const chunks = [];
    const streamed = await generateTextStream(
      {
        provider: "gemini",
        apiKey: `  ${SCRIPTED_AGENT_API_KEY}  `,
        model: "gemini-2.0-flash",
        systemInstruction: "평가 초안을 작성합니다.",
        messages: [{ role: "user", content: "평가" }],
      },
      (delta) => chunks.push(delta)
    );
    expect(streamed.text).toBe(SCRIPTED_DEMO_ONLY_AGENT_MESSAGE);
    expect(chunks).toEqual([SCRIPTED_DEMO_ONLY_AGENT_MESSAGE]);

    const agent = await generateText({
      provider: "openai",
      apiKey: SCRIPTED_AGENT_API_KEY,
      systemInstruction: AGENT_PROMPT,
      messages: [{ role: "user", content: "오늘 할 일" }],
    });
    expect(agent.text).toContain('"name":"get_my_todos"');
    expect(fetchSpy).not.toHaveBeenCalled();

    const real = await generateText({
      provider: "openai",
      apiKey: "sk-real-key",
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "안녕" }],
    });
    expect(real.text).toBe("should-not-run");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});
