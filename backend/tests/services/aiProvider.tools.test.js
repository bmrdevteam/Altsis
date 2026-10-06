import { generateText } from "../../src/services/aiProvider.js";
import { createAgentTools } from "../../src/services/alterAgentTools.js";

const TOOLS = createAgentTools().map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
}));

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("native tool calling", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  test("tool schemas do not accept identity arguments", () => {
    for (const tool of TOOLS) {
      const names = Object.keys(tool.parameters.properties || {});
      expect(names).not.toEqual(expect.arrayContaining(["userId", "academyId", "seasonId", "schoolId"]));
      expect(tool.parameters.additionalProperties).toBe(false);
    }
  });

  test("OpenAI request uses tools and parses several tool_calls", async () => {
    let body;
    global.fetch = jest.fn(async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_todos",
                  type: "function",
                  function: {
                    name: "get_my_todos",
                    arguments: JSON.stringify({
                      scope: "course",
                      userId: "attacker",
                    }),
                  },
                },
                {
                  id: "call_guide",
                  type: "function",
                  function: {
                    name: "search_product_guide",
                    arguments: JSON.stringify({ query: "평가 입력" }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
      });
    });

    const result = await generateText({
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      systemInstruction: "agent",
      messages: [{ role: "user", content: "평가할 수업이 뭐고, 어디서 입력해?" }],
      tools: TOOLS,
    });

    expect(body.tool_choice).toBe("auto");
    expect(body.tools.map((tool) => tool.type)).toEqual(["function", "function"]);
    expect(body.tools.map((tool) => tool.function.name)).toEqual([
      "get_my_todos",
      "search_product_guide",
    ]);
    expect(body.tools[0].function.parameters.properties.userId).toBeUndefined();
    expect(result.toolCalls).toEqual([
      {
        id: "call_todos",
        name: "get_my_todos",
        arguments: { scope: "course", userId: "attacker" },
      },
      {
        id: "call_guide",
        name: "search_product_guide",
        arguments: { query: "평가 입력" },
      },
    ]);

    global.fetch = jest.fn(async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({
        choices: [{ message: { role: "assistant", content: "수업 화면에서 입력합니다." } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });
    });
    await generateText({
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "평가" },
        {
          role: "assistant",
          content: "",
          toolCalls: result.toolCalls,
        },
        {
          role: "tool",
          toolCallId: "call_todos",
          name: "get_my_todos",
          content: "<tool_result>untrusted</tool_result>",
        },
        {
          role: "tool",
          toolCallId: "call_guide",
          name: "search_product_guide",
          content: "<tool_result>guide</tool_result>",
        },
      ],
      tools: TOOLS,
    });
    const roles = body.messages.map((message) => message.role);
    expect(roles).toEqual(["user", "assistant", "tool", "tool"]);
    expect(body.messages[1].tool_calls).toHaveLength(2);
    expect(body.messages[1].tool_calls[0].function.arguments).toContain("attacker");
    expect(body.messages[2].tool_call_id).toBe("call_todos");
    expect(body.messages[3].role).toBe("tool");
  });

  test("Anthropic request uses input_schema and tool_result blocks", async () => {
    let body;
    global.fetch = jest.fn(async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({
        content: [
          { type: "text", text: "둘 다 확인합니다." },
          {
            type: "tool_use",
            id: "toolu_todos",
            name: "get_my_todos",
            input: { scope: "course", schoolId: "other" },
          },
          {
            type: "tool_use",
            id: "toolu_guide",
            name: "search_product_guide",
            input: { query: "평가 입력" },
          },
        ],
        usage: { input_tokens: 2, output_tokens: 3 },
      });
    });

    const result = await generateText({
      provider: "anthropic",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-4-5",
      systemInstruction: "agent",
      messages: [{ role: "user", content: "평가할 수업이 뭐고, 어디서 입력해?" }],
      tools: TOOLS,
    });

    expect(body.tool_choice).toEqual({ type: "auto" });
    expect(body.tools.map((tool) => tool.name)).toEqual([
      "get_my_todos",
      "search_product_guide",
    ]);
    expect(body.tools[0].input_schema.properties.academyId).toBeUndefined();
    expect(result.text).toBe("둘 다 확인합니다.");
    expect(result.toolCalls[0]).toMatchObject({
      id: "toolu_todos",
      name: "get_my_todos",
      arguments: { scope: "course", schoolId: "other" },
    });
    expect(result.toolCalls).toHaveLength(2);

    global.fetch = jest.fn(async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({
        content: [{ type: "text", text: "입력은 수업 화면입니다." }],
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    });
    await generateText({
      provider: "anthropic",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-4-5",
      messages: [
        { role: "user", content: "평가" },
        { role: "assistant", content: "둘 다 확인합니다.", toolCalls: result.toolCalls },
        {
          role: "tool",
          toolCallId: "toolu_todos",
          name: "get_my_todos",
          content: "<tool_result>todos</tool_result>",
        },
        {
          role: "tool",
          toolCallId: "toolu_guide",
          name: "search_product_guide",
          content: "<tool_result>guide</tool_result>",
        },
      ],
    });
    const assistant = body.messages.find((message) => message.role === "assistant");
    expect(assistant.content.some((block) => block.type === "tool_use" && block.id === "toolu_todos")).toBe(
      true
    );
    const toolResult = body.messages.find(
      (message) =>
        message.role === "user" &&
        Array.isArray(message.content) &&
        message.content.some((block) => block.type === "tool_result")
    );
    expect(toolResult.content.map((block) => block.tool_use_id)).toEqual(["toolu_todos", "toolu_guide"]);
    expect(body.tools).toBeUndefined();
  });

  test("a forced final keeps tools and sets tool_choice none", async () => {
    const history = [
      { role: "user", content: "평가할 수업이 뭐고, 어디서 입력해?" },
      {
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "call_todos", name: "get_my_todos", arguments: { scope: "course" } },
          { id: "call_guide", name: "search_product_guide", arguments: { query: "평가 입력" } },
        ],
      },
      {
        role: "tool",
        toolCallId: "call_todos",
        name: "get_my_todos",
        content: "<tool_result>todos</tool_result>",
      },
      {
        role: "tool",
        toolCallId: "call_guide",
        name: "search_product_guide",
        content: "<tool_result>guide</tool_result>",
      },
    ];

    let openaiBody;
    global.fetch = jest.fn(async (_url, options) => {
      openaiBody = JSON.parse(options.body);
      return jsonResponse({
        choices: [{ message: { role: "assistant", content: "수업 화면에서 입력합니다." } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });
    });
    await generateText({
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      messages: history,
      tools: TOOLS,
      toolChoice: "none",
    });
    expect(openaiBody.tools.map((tool) => tool.function.name)).toEqual([
      "get_my_todos",
      "search_product_guide",
    ]);
    expect(openaiBody.tool_choice).toBe("none");
    expect(openaiBody.messages.some((message) => message.role === "tool")).toBe(true);

    let anthropicBody;
    global.fetch = jest.fn(async (_url, options) => {
      anthropicBody = JSON.parse(options.body);
      return jsonResponse({
        content: [{ type: "text", text: "수업 화면에서 입력합니다." }],
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    });
    await generateText({
      provider: "anthropic",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-4-5",
      messages: history.map((row) =>
        row.toolCallId === "call_todos"
          ? { ...row, toolCallId: "toolu_todos" }
          : row.toolCallId === "call_guide"
            ? { ...row, toolCallId: "toolu_guide" }
            : row.role === "assistant"
              ? {
                  ...row,
                  toolCalls: row.toolCalls.map((call) => ({
                    ...call,
                    id: call.name === "get_my_todos" ? "toolu_todos" : "toolu_guide",
                  })),
                }
              : row
      ),
      tools: TOOLS,
      toolChoice: "none",
    });
    expect(anthropicBody.tools.map((tool) => tool.name)).toEqual([
      "get_my_todos",
      "search_product_guide",
    ]);
    expect(anthropicBody.tool_choice).toEqual({ type: "none" });
    const toolResult = anthropicBody.messages.find(
      (message) =>
        message.role === "user" &&
        Array.isArray(message.content) &&
        message.content.some((block) => block.type === "tool_result")
    );
    expect(toolResult.content.map((block) => block.tool_use_id)).toEqual(["toolu_todos", "toolu_guide"]);
  });

  test("Gemini ignores tools and stays on the text API", async () => {
    let body;
    global.fetch = jest.fn(async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({
        candidates: [{ content: { parts: [{ text: "펜스로 답합니다." }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      });
    });

    const result = await generateText({
      provider: "gemini",
      apiKey: "gem-test",
      model: "gemini-3.6-flash",
      messages: [{ role: "user", content: "할 일" }],
      tools: TOOLS,
    });
    expect(body.tools).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(result.toolCalls).toBeUndefined();
    expect(result.text).toBe("펜스로 답합니다.");
  });
});
