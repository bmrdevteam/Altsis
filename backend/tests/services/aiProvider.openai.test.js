import {
  openaiUsesCompletionTokens,
  openaiReasoningCompletionCap,
  openaiContentText,
  openaiBuildBody,
  openaiBodyForUnsupportedParams,
  generateText,
  resetOpenAINoneReasoningEffortCache,
} from "../../src/services/aiProvider.js";

const SAMPLE_TOOL = {
  name: "get_my_todos",
  description: "todos",
  parameters: { type: "object", additionalProperties: false, properties: {} },
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("openai GPT-5 / o-series Chat Completions params", () => {
  beforeEach(() => {
    resetOpenAINoneReasoningEffortCache();
  });

  test.each([
    ["gpt-5.6-luna", true],
    ["gpt-5", true],
    ["gpt-5-mini", true],
    ["gpt-5.4-nano", true],
    ["o3-mini", true],
    ["o4-mini", true],
    ["gpt-4o-mini", false],
    ["gpt-4o", false],
    ["gpt-4.1", false],
    ["chatgpt-4o-latest", false],
    ["", false],
    [undefined, false],
  ])("openaiUsesCompletionTokens(%s)", (model, expected) => {
    expect(openaiUsesCompletionTokens(model)).toBe(expected);
  });

  test("probe maxTokens stay small; chat budgets get a reasoning floor", () => {
    expect(openaiReasoningCompletionCap(32)).toBe(256);
    expect(openaiReasoningCompletionCap(2048)).toBe(4096);
    expect(openaiReasoningCompletionCap(8192)).toBe(8192);
  });

  test("gpt-4o-mini keeps max_tokens and temperature", () => {
    const body = openaiBuildBody({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "안녕" }],
      temperature: 0.7,
      maxTokens: 2048,
    });
    expect(body.max_tokens).toBe(2048);
    expect(body.max_completion_tokens).toBeUndefined();
    expect(body.temperature).toBe(0.7);
    expect(body.reasoning_effort).toBeUndefined();
  });

  test("gpt-5.6-luna uses max_completion_tokens and omits temperature", () => {
    const body = openaiBuildBody({
      model: "gpt-5.6-luna",
      systemInstruction: "You are Alter.",
      messages: [{ role: "user", content: "안녕" }],
      temperature: 0.7,
      maxTokens: 2048,
    });
    expect(body.model).toBe("gpt-5.6-luna");
    expect(body.max_tokens).toBeUndefined();
    expect(body.max_completion_tokens).toBe(4096);
    expect(body.temperature).toBeUndefined();
    expect(body.reasoning_effort).toBe("low");
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are Alter.",
    });
  });

  test("gpt-5.6-luna sends reasoning_effort none when tools are present", () => {
    const withTools = openaiBuildBody({
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: "평가할 수업" }],
      temperature: 0.2,
      maxTokens: 2048,
      tools: [SAMPLE_TOOL],
    });
    expect(withTools.reasoning_effort).toBe("none");
    expect(withTools.tool_choice).toBe("auto");
    expect(withTools.tools).toHaveLength(1);
    expect(withTools.temperature).toBeUndefined();
    expect(withTools.max_completion_tokens).toBe(4096);

    const forcedFinal = openaiBuildBody({
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: "평가할 수업" }],
      temperature: 0.2,
      maxTokens: 2048,
      tools: [SAMPLE_TOOL],
      toolChoice: "none",
    });
    expect(forcedFinal.reasoning_effort).toBe("none");
    expect(forcedFinal.tool_choice).toBe("none");
    expect(forcedFinal.tools).toHaveLength(1);
  });

  test("gpt-5.6-luna without tools still sends reasoning_effort low", () => {
    const body = openaiBuildBody({
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: "안녕" }],
      temperature: 0.2,
      maxTokens: 2048,
    });
    expect(body.tools).toBeUndefined();
    expect(body.reasoning_effort).toBe("low");
    expect(body.temperature).toBeUndefined();
  });

  test("gpt-5-mini keeps reasoning_effort low even with tools", () => {
    const body = openaiBuildBody({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "안녕" }],
      temperature: 0.2,
      maxTokens: 2048,
      tools: [SAMPLE_TOOL],
      toolChoice: "none",
    });
    expect(body.reasoning_effort).toBe("low");
    expect(body.tool_choice).toBe("none");
    expect(body.tools).toHaveLength(1);
    expect(body.temperature).toBeUndefined();
    expect(body.max_completion_tokens).toBe(4096);
  });

  test("gpt-4o-mini with tools does not send reasoning_effort", () => {
    const body = openaiBuildBody({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "안녕" }],
      temperature: 0.2,
      maxTokens: 2048,
      tools: [SAMPLE_TOOL],
    });
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(2048);
    expect(body.tool_choice).toBe("auto");
    expect(body.tools[0].function.name).toBe("get_my_todos");
  });

  test("gpt-5-chat does not send reasoning_effort", () => {
    const body = openaiBuildBody({
      model: "gpt-5-chat-latest",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 1024,
    });
    expect(body.max_completion_tokens).toBe(4096);
    expect(body.reasoning_effort).toBeUndefined();
  });

  test("openaiContentText joins string and part-array content", () => {
    expect(openaiContentText("hello")).toBe("hello");
    expect(openaiContentText(null)).toBe("");
    expect(
      openaiContentText([{ type: "text", text: "안" }, { text: "녕" }])
    ).toBe("안녕");
  });

  test("retries swap max_tokens to max_completion_tokens", () => {
    const retried = openaiBodyForUnsupportedParams(
      { model: "gpt-5.6-luna", max_tokens: 2048, temperature: 0.7 },
      {
        status: 400,
        apiMessage:
          "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
      }
    );
    expect(retried.max_tokens).toBeUndefined();
    expect(retried.max_completion_tokens).toBe(2048);
    expect(retried.temperature).toBeUndefined();
  });

  test("retries drop reasoning_effort when the model rejects it", () => {
    const retried = openaiBodyForUnsupportedParams(
      { model: "gpt-5.6-luna", reasoning_effort: "low", max_completion_tokens: 4096 },
      {
        status: 400,
        apiMessage: "Unsupported parameter: 'reasoning_effort'.",
      }
    );
    expect(retried.reasoning_effort).toBeUndefined();
    expect(retried.max_completion_tokens).toBe(4096);
  });

  test("retries set reasoning_effort to none when the error says so", () => {
    const retried = openaiBodyForUnsupportedParams(
      { model: "gpt-5-mini", reasoning_effort: "low", max_completion_tokens: 4096 },
      {
        status: 400,
        apiMessage:
          "Function tools with reasoning_effort are not supported for gpt-5-mini in /v1/chat/completions. Set reasoning_effort to 'none'.",
      }
    );
    expect(retried.reasoning_effort).toBe("none");
    expect(retried.max_completion_tokens).toBe(4096);
    expect(
      openaiBodyForUnsupportedParams(
        { model: "gpt-5-mini", reasoning_effort: "none" },
        {
          status: 400,
          apiMessage: "Set reasoning_effort to 'none'.",
        }
      )
    ).toBeNull();
  });

  test("caches a model after the none-effort 400 so the next tool call does not retry", async () => {
    const realFetch = global.fetch;
    const bodies = [];
    let calls = 0;
    const lunaError = {
      error: {
        message:
          "Function tools with reasoning_effort are not supported for gpt-5-mini in /v1/chat/completions. Set reasoning_effort to 'none'.",
      },
    };
    global.fetch = jest.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      bodies.push(body);
      calls += 1;
      if (calls === 1) return jsonResponse(lunaError, 400);
      return jsonResponse({
        choices: [{ message: { role: "assistant", content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });
    });

    try {
      const first = await generateText({
        provider: "openai",
        apiKey: "sk-test",
        model: "gpt-5-mini",
        messages: [{ role: "user", content: "할 일" }],
        temperature: 0.2,
        tools: [SAMPLE_TOOL],
      });
      expect(first.text).toBe("ok");
      expect(bodies.map((body) => body.reasoning_effort)).toEqual(["low", "none"]);
      expect(bodies[1].tools).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      bodies.length = 0;
      await generateText({
        provider: "openai",
        apiKey: "sk-test",
        model: "gpt-5-mini",
        messages: [{ role: "user", content: "한 번 더" }],
        tools: [SAMPLE_TOOL],
        toolChoice: "none",
      });
      expect(bodies).toHaveLength(1);
      expect(bodies[0].reasoning_effort).toBe("none");
      expect(bodies[0].tool_choice).toBe("none");
      expect(global.fetch).toHaveBeenCalledTimes(3);

      bodies.length = 0;
      await generateText({
        provider: "openai",
        apiKey: "sk-test",
        model: "gpt-5-mini",
        messages: [{ role: "user", content: "도구 없음" }],
        maxTokens: 128,
      });
      expect(bodies).toHaveLength(1);
      expect(bodies[0].reasoning_effort).toBe("low");
      expect(bodies[0].tools).toBeUndefined();
    } finally {
      global.fetch = realFetch;
      resetOpenAINoneReasoningEffortCache();
    }
  });

  test("non-400 errors are not rewritten", () => {
    expect(
      openaiBodyForUnsupportedParams(
        { max_tokens: 16 },
        { status: 401, apiMessage: "invalid api key" }
      )
    ).toBeNull();
  });
});
