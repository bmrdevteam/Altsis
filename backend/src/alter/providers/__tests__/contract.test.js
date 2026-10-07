import { createAnthropicAdapter } from "../anthropic.js";
import { createGeminiAdapter } from "../gemini.js";
import { parseFenceTurn, withFenceTools } from "../fence.js";
import { createLlm } from "../llm.js";
import { createOpenAIAdapter } from "../openai.js";
import { createScriptedAdapter, SCRIPTED_AGENT_API_KEY } from "../scripted.js";

const AGENT = "당신은 Altsis Alter의 읽기 전용 에이전트입니다.";
const USAGE = {
  promptTokens: 11,
  candidatesTokens: 7,
  thoughtsTokens: 0,
  totalTokens: 18,
};
const REQUEST = {
  system: AGENT,
  messages: [{ role: "user", content: "오늘 할 일" }],
  tools: [
    {
      name: "get_my_todos",
      description: "할 일",
      parameters: { type: "object", properties: { scope: { type: "string" } } },
    },
  ],
};

const expectTool = (turn) => {
  expect(turn.finish).toBe("tool_calls");
  expect(turn.toolCalls).toHaveLength(1);
  expect(turn.toolCalls[0].name).toBe("get_my_todos");
  expect(turn.toolCalls[0].arguments).toEqual({ scope: "all" });
  expect(turn.usage).toEqual(USAGE);
};

const expectFinal = (turn) => {
  expect(turn.finish).toBe("stop");
  expect(turn.text).toBe("확인했습니다.");
  expect(turn.toolCalls).toEqual([]);
  expect(turn.usage).toEqual(USAGE);
};

describe("provider adapter contract", () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  test("openai, anthropic, and gemini normalize the same turn", async () => {
    const openaiTool = {
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "get_my_todos", arguments: "{\"scope\":\"all\"}" },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    };
    const openaiFinal = {
      choices: [{ finish_reason: "stop", message: { content: "확인했습니다." } }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    };
    const anthropicTool = {
      stop_reason: "tool_use",
      content: [{ type: "tool_use", id: "toolu_1", name: "get_my_todos", input: { scope: "all" } }],
      usage: { input_tokens: 11, output_tokens: 7 },
    };
    const anthropicFinal = {
      stop_reason: "end_turn",
      content: [{ type: "text", text: "확인했습니다." }],
      usage: { input_tokens: 11, output_tokens: 7 },
    };
    const fence = (body) => ["```alter", JSON.stringify(body), "```"].join("\n");
    const gemini = (text) => ({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
      usageMetadata: {
        promptTokenCount: 11,
        candidatesTokenCount: 7,
        thoughtsTokenCount: 0,
        totalTokenCount: 18,
      },
    });

    const openai = createOpenAIAdapter({
      complete: async () => openaiTool,
    });
    const openaiDone = createOpenAIAdapter({ complete: async () => openaiFinal });
    const anthropic = createAnthropicAdapter({ complete: async () => anthropicTool });
    const anthropicDone = createAnthropicAdapter({ complete: async () => anthropicFinal });
    const geminiTools = withFenceTools(
      createGeminiAdapter({
        complete: async () =>
          gemini(fence({ type: "tool", name: "get_my_todos", arguments: { scope: "all" } })),
      })
    );
    const geminiDone = withFenceTools(
      createGeminiAdapter({
        complete: async () => gemini(fence({ type: "final", text: "확인했습니다." })),
      })
    );

    expectTool(await openai.generate(REQUEST));
    expectTool(await anthropic.generate(REQUEST));
    expectTool(await geminiTools.generate(REQUEST));
    expectFinal(await openaiDone.generate(REQUEST));
    expectFinal(await anthropicDone.generate(REQUEST));
    expectFinal(await geminiDone.generate(REQUEST));
  });

  test("openai reasoning tokens stay in the normalized usage", async () => {
    const adapter = createOpenAIAdapter({
      complete: async () => ({
        choices: [
          {
            finish_reason: "stop",
            message: { content: "확인했습니다." },
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 7,
          total_tokens: 20,
          completion_tokens_details: { reasoning_tokens: 2 },
        },
      }),
    });
    const turn = await adapter.generate(REQUEST);
    expect(turn.usage).toEqual({
      promptTokens: 11,
      candidatesTokens: 7,
      thoughtsTokens: 2,
      totalTokens: 20,
    });
  });

  test("the fence wrapper parses tools and hides native tool messages", async () => {
    let seen = null;
    const wrapped = withFenceTools(
      createGeminiAdapter({
        complete: async (req) => {
          seen = req;
          return {
            text: ["```alter", JSON.stringify({ type: "final", text: "확인했습니다." }), "```"].join(
              "\n"
            ),
            tokenUsage: {
              promptTokens: 11,
              candidatesTokens: 7,
              thoughtsTokens: 0,
              totalTokens: 18,
            },
          };
        },
      }),
      { renderSystem: () => "```alter\n{\"type\":\"tool\"}" }
    );
    const turn = await wrapped.generate({
      ...REQUEST,
      messages: [
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "c1", name: "get_my_todos", arguments: { scope: "all" } }],
        },
        { role: "tool", toolCallId: "c1", name: "get_my_todos", content: "<tool_result>1</tool_result>" },
      ],
    });
    expectFinal(turn);
    expect(seen.tools).toBeUndefined();
    expect(seen.system).toContain("```alter");
    expect(seen.messages.some((row) => row.role === "tool")).toBe(false);
    expect(seen.messages[0].content).toContain("get_my_todos");
    expect(seen.messages[1].role).toBe("user");
    expect(seen.messages[1].content).toContain("<tool_result>");
    expect(wrapped.capabilities.nativeTools).toBe(false);
  });

  test("scripted is an adapter, and the plan does not leak across calls", async () => {
    process.env.NODE_ENV = "test";
    const adapter = createScriptedAdapter();
    expect(adapter.id).toBe("scripted");
    expect(adapter.capabilities.nativeTools).toBe(true);
    const first = await adapter.generate({
      ...REQUEST,
      apiKey: SCRIPTED_AGENT_API_KEY,
      scriptedPlan: [
        { call: "get_my_todos", arguments: { scope: "all" } },
        { final: "확인했습니다." },
      ],
    });
    expect(first.toolCalls.map((call) => call.name)).toEqual(["get_my_todos"]);
    expect(first.toolCalls[0].arguments).toEqual({ scope: "all" });
    expect(first.finish).toBe("tool_calls");
    expect(first.usage).toEqual({
      promptTokens: 8,
      candidatesTokens: 24,
      thoughtsTokens: 0,
      totalTokens: 32,
    });

    const second = await adapter.generate({
      ...REQUEST,
      apiKey: SCRIPTED_AGENT_API_KEY,
      tools: [
        ...REQUEST.tools,
        { name: "search_product_guide", description: "안내", parameters: { type: "object" } },
      ],
      scriptedPlan: [{ call: "search_product_guide", arguments: { query: "평가" } }],
    });
    expect(second.toolCalls.map((call) => call.name)).toEqual(["search_product_guide"]);
    expect(second.toolCalls[0].arguments).toEqual({ query: "평가" });

    const again = await adapter.generate({
      ...REQUEST,
      apiKey: SCRIPTED_AGENT_API_KEY,
    });
    expect(again.toolCalls.map((call) => call.name)).toEqual(["get_my_todos"]);
  });

  test("resolve picks scripted from the provider id or the demo key, and not in production", () => {
    process.env.NODE_ENV = "test";
    const llm = createLlm({
      complete: () => {
        throw new Error("network");
      },
    });
    expect(llm.resolve({ provider: "openai", apiKey: "sk-real" }).id).toBe("openai");
    expect(llm.resolve({ provider: "anthropic", apiKey: "sk-real" }).id).toBe("anthropic");
    expect(llm.resolve({ provider: "gemini", apiKey: "sk-real" }).id).toBe("gemini");
    expect(llm.resolve({ provider: "scripted", apiKey: "sk-real" }).id).toBe("scripted");
    expect(llm.resolve({ provider: "openai", apiKey: SCRIPTED_AGENT_API_KEY }).id).toBe("scripted");

    process.env.NODE_ENV = "production";
    expect(() => llm.resolve({ provider: "openai", apiKey: SCRIPTED_AGENT_API_KEY })).toThrow(
      /not valid/
    );
    expect(llm.resolve({ provider: "scripted", apiKey: "sk-real" }).id).toBe("gemini");
  });

  test("a fence without a tool call stays text", () => {
    const turn = parseFenceTurn({ text: "그냥 답입니다.", usage: USAGE });
    expect(turn.text).toBe("그냥 답입니다.");
    expect(turn.toolCalls).toEqual([]);
    expect(turn.usage).toEqual(USAGE);
  });
});
