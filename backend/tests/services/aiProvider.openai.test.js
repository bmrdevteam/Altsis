import {
  openaiUsesCompletionTokens,
  openaiReasoningCompletionCap,
  openaiContentText,
  openaiBuildBody,
  openaiBodyForUnsupportedParams,
} from "../../src/services/aiProvider.js";

describe("openai GPT-5 / o-series Chat Completions params", () => {
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

  test("non-400 errors are not rewritten", () => {
    expect(
      openaiBodyForUnsupportedParams(
        { max_tokens: 16 },
        { status: 401, apiMessage: "invalid api key" }
      )
    ).toBeNull();
  });
});
