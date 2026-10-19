import { logger } from "../../../log/logger.js";
import { runAlterAgent } from "../runAlterAgent.js";
import { createAgentTools } from "../../tools/registry.js";
import { toolsForSkill, getSkill } from "../../skills/registry.js";

const usage = (n) => ({
  promptTokens: n,
  candidatesTokens: n,
  thoughtsTokens: 0,
  totalTokens: n * 2,
});

const tool = ({ name, readOnly, effect, executed }) => ({
  name,
  label: name,
  description: name,
  readOnly,
  effect,
  parameters: { type: "object", properties: {} },
  async execute() {
    executed.push(name);
    return { summary: "완료" };
  },
});

const scripted = () => {
  const offered = [];
  let asked = false;
  return {
    offered,
    async generate({ tools, forceFinal }) {
      offered.push((tools || []).map((item) => item.name));
      if (!forceFinal && !asked) {
        asked = true;
        return {
          text: "",
          toolCalls: [
            { name: "send_note", arguments: {} },
            { name: "post_note", arguments: {} },
          ],
          usage: usage(1),
        };
      }
      return { text: "확인한 내용이 있습니다.", toolCalls: [], usage: usage(1) };
    },
  };
};

describe("runAlterAgent", () => {
  test("a disabled web search tells the user it is off instead of searching school data", async () => {
    let system = "";
    await runAlterAgent({
      ctx: { academy: { webSearchEnabled: false, imageGenEnabled: false } },
      input: { message: "오늘 서울 날씨를 웹에서 찾아 줘" },
      mode: "chat",
      provider: {
        async generate(turn) {
          system = turn.systemInstruction || "";
          return { text: "웹 검색은 꺼져 있습니다.", toolCalls: [], usage: usage(1) };
        },
      },
    });
    expect(system).toContain("웹 검색은 꺼져 있습니다.");
    expect(system).toContain("AI 설정");
    expect(system).toContain("search_school_data");
    expect(system).not.toContain("web_search를 호출");
  });

  test("sanitized web query is traced and https sources are attached", async () => {
    const result = await runAlterAgent({
      ctx: { academy: { webSearchEnabled: true } },
      input: { message: "날씨" },
      mode: "chat",
      tools: [
        {
          name: "web_search",
          label: "웹 검색",
          description: "검색",
          readOnly: true,
          promptHints: ["제목만"],
          parameters: { type: "object", properties: { query: { type: "string" } } },
          async execute() {
            return {
              summary: "검색 결과: 공공 날씨 안내",
              auditQuery: "날씨",
              links: [{ kind: "web", title: "공공 날씨 안내", path: "https://example.com/weather" }],
              sourceUrls: ["https://example.com/weather"],
            };
          },
        },
      ],
      provider: {
        async generate({ forceFinal }) {
          if (!forceFinal) {
            return {
              text: "",
              toolCalls: [{ name: "web_search", arguments: { query: "010-1234-5678 날씨" } }],
              usage: usage(1),
            };
          }
          return {
            text: "공공 날씨 안내입니다. URL은 답변 하단에 첨부됩니다.",
            toolCalls: [],
            usage: usage(1),
          };
        },
      },
    });
    expect(result.trace[0].audits).toEqual([{ name: "web_search", query: "날씨" }]);
    expect(JSON.stringify(result.trace)).not.toContain("010-1234-5678");
    expect(result.links).toEqual([
      { kind: "web", title: "공공 날씨 안내", path: "https://example.com/weather" },
    ]);
    expect(result.text).toContain("공공 날씨 안내");
    expect(result.text).toContain("출처는 답 아래에 있습니다.");
    expect(result.text).not.toContain("URL은 답변 하단");
  });

  test("web search is offered on every runner only when the academy flag is on", async () => {
    const cases = [
      { mode: "chat", enabled: false },
      { mode: "schedule", enabled: true },
      { mode: "event", enabled: true },
    ];
    for (const row of cases) {
      const plan = scripted();
      await runAlterAgent({
        ctx: {
          academy: { webSearchEnabled: row.enabled },
          triggerEvents: row.mode === "event" ? [] : undefined,
        },
        input: { message: "날씨" },
        mode: row.mode,
        provider: { generate: plan.generate },
      });
      if (row.enabled) expect(plan.offered[0]).toContain("web_search");
      else expect(plan.offered[0]).not.toContain("web_search");
    }
  });

  test("image generation stays off outside chat even when the academy flag is on", async () => {
    for (const mode of ["schedule", "event"]) {
      const plan = scripted();
      await runAlterAgent({
        ctx: {
          academy: { imageGenEnabled: true },
          triggerEvents: mode === "event" ? [] : undefined,
        },
        input: { message: "차트" },
        mode,
        provider: { generate: plan.generate },
      });
      expect(plan.offered[0]).not.toContain("generate_image");
    }
    const chat = scripted();
    await runAlterAgent({
      ctx: { academy: { imageGenEnabled: true } },
      input: { message: "차트" },
      mode: "chat",
      provider: { generate: chat.generate },
    });
    expect(chat.offered[0]).toContain("generate_image");

    const executed = [];
    const offered = [];
    await runAlterAgent({
      ctx: { academy: { imageGenEnabled: true } },
      input: { message: "차트" },
      mode: "schedule",
      tools: [
        tool({ name: "lookup_note", readOnly: true, effect: "read", executed }),
        {
          ...tool({ name: "generate_image", readOnly: true, effect: "read", executed }),
          chatOnly: true,
        },
      ],
      provider: {
        async generate({ tools }) {
          offered.push((tools || []).map((item) => item.name));
          return {
            text: "예약에서는 이미지를 만들지 않습니다.",
            toolCalls: [{ name: "generate_image", arguments: { prompt: "차트" } }],
            usage: usage(1),
          };
        },
      },
    });
    expect(offered[0]).toEqual(["lookup_note"]);
    expect(executed).not.toContain("generate_image");
  });

  test("schedule and event cannot call write tools", async () => {
    for (const mode of ["schedule", "event"]) {
      const executed = [];
      const plan = scripted();
      const result = await runAlterAgent({
        ctx: {},
        input: { message: "오늘 일정" },
        mode,
        tools: [
          tool({ name: "lookup_note", readOnly: true, effect: "read", executed }),
          tool({ name: "send_note", readOnly: true, effect: "write", executed }),
          tool({ name: "post_note", readOnly: false, effect: "read", executed }),
        ],
        provider: { generate: plan.generate },
      });
      expect(plan.offered[0]).toEqual(["lookup_note"]);
      expect(executed).toEqual([]);
      expect(result.toolNames).not.toContain("send_note");
      expect(result.toolNames).not.toContain("post_note");
      expect(result.usage).toEqual(usage(2));
      expect(result.tokenUsage).toEqual(result.usage);
    }
  });

  test("chat can call a write tool and returns the same usage object", async () => {
    const executed = [];
    const plan = scripted();
    const result = await runAlterAgent({
      ctx: {},
      input: { message: "기록 남겨 줘" },
      mode: "chat",
      tools: [
        tool({ name: "lookup_note", readOnly: true, effect: "read", executed }),
        tool({ name: "send_note", readOnly: true, effect: "write", executed }),
        tool({ name: "post_note", readOnly: false, effect: "read", executed }),
      ],
      provider: { generate: plan.generate },
    });
    expect(plan.offered[0]).toEqual(["lookup_note", "send_note", "post_note"]);
    expect(executed.sort()).toEqual(["post_note", "send_note"]);
    expect(result.usage).toEqual({
      promptTokens: 2,
      candidatesTokens: 2,
      thoughtsTokens: 0,
      totalTokens: 4,
    });
    expect(result.tokenUsage).toBe(result.usage);
  });

  test("nested tool usage is traced and reported after the outer usage log", async () => {
    const seen = [];
    let billed = null;
    let asked = false;
    const result = await runAlterAgent({
      ctx: {},
      input: { message: "오늘 결석" },
      mode: "chat",
      tools: [
        {
          name: "search_school_data",
          label: "학사 검색",
          description: "검색",
          readOnly: true,
          effect: "read",
          parameters: { type: "object", properties: {} },
          async execute() {
            return {
              summary: "조회되지 않았습니다.",
              usage: {
                promptTokens: 4000,
                candidatesTokens: 400,
                thoughtsTokens: 0,
                totalTokens: 4400,
              },
            };
          },
        },
      ],
      provider: {
        async generate({ messages, forceFinal }) {
          seen.push(messages);
          if (!forceFinal && !asked) {
            asked = true;
            return {
              text: "",
              toolCalls: [{ id: "c1", name: "search_school_data", arguments: {} }],
              usage: usage(1),
            };
          }
          return { text: "조회되지 않았습니다.", toolCalls: [], usage: usage(1) };
        },
        onComplete(tokenUsage) {
          billed = tokenUsage;
        },
      },
    });

    expect(billed).toEqual({
      promptTokens: 2,
      candidatesTokens: 2,
      thoughtsTokens: 0,
      totalTokens: 4,
    });
    expect(result.tokenUsage).toEqual({
      promptTokens: 4002,
      candidatesTokens: 402,
      thoughtsTokens: 0,
      totalTokens: 4404,
    });
    expect(result.usage).toBe(result.tokenUsage);
    expect(result.trace[0].usage).toEqual({
      promptTokens: 4000,
      candidatesTokens: 400,
      thoughtsTokens: 0,
      totalTokens: 4400,
    });
    const toolMessage = seen.at(-1).find((row) => row.role === "tool");
    expect(toolMessage.content).toContain("조회되지 않았습니다.");
    expect(toolMessage.content).not.toContain("4400");
    expect(toolMessage.content).not.toContain("promptTokens");
  });

  test("disabled hints follow the runner and the flag, including an academy admin", async () => {
    const capture = async (mode, academy) => {
      let system = "";
      await runAlterAgent({
        ctx: {
          academy,
          user: { auth: "admin" },
          registration: { role: "teacher" },
          triggerEvents: mode === "event" ? [] : undefined,
        },
        input: { message: "날씨와 차트를 만들어 줘" },
        mode,
        provider: {
          async generate(turn) {
            system = turn.systemInstruction || "";
            return { text: "확인했습니다.", toolCalls: [], usage: usage(1) };
          },
        },
      });
      return system;
    };

    const off = await capture("chat", { webSearchEnabled: false, imageGenEnabled: false });
    expect(off).toContain("웹 검색은 꺼져 있습니다.");
    expect(off).toContain("이미지 생성은 꺼져 있습니다.");
    expect(off).not.toContain("web_search를 호출");
    expect(off).not.toContain("generate_image를 호출");

    for (const mode of ["schedule", "event"]) {
      const system = await capture(mode, { webSearchEnabled: false, imageGenEnabled: true });
      expect(system).toContain("웹 검색은 꺼져 있습니다.");
      expect(system).toContain("예약과 이벤트에서는 이미지를 만들지 않습니다.");
      expect(system).not.toContain("generate_image를 호출");
    }

    const chatOn = await capture("chat", { webSearchEnabled: true, imageGenEnabled: true });
    expect(chatOn).not.toContain("웹 검색은 꺼져 있습니다.");
    expect(chatOn).toContain("web_search를 호출");
    expect(chatOn).toContain("generate_image를 호출");
  });

  test("a skill tool list does not inherit chat capability hints", async () => {
    const tools = toolsForSkill(getSkill("school-search"), {
      webSearchEnabled: true,
      imageGenEnabled: true,
    });
    expect(tools.map((tool) => tool.name)).toEqual(["search_school_data"]);
    let system = "";
    await runAlterAgent({
      ctx: { academy: { webSearchEnabled: false, imageGenEnabled: false } },
      input: { message: "school-search 날씨" },
      tools,
      provider: {
        async generate(turn) {
          system = turn.systemInstruction || "";
          return { text: "확인했습니다.", toolCalls: [], usage: usage(1) };
        },
      },
    });
    expect(system).not.toContain("웹 검색은 꺼져 있습니다.");
    expect(system).not.toContain("web_search");
  });

  test("a fake oversized search stays a short tool error and records the tokens", async () => {
    const key = "sk-test-secret-value";
    const phone = "010-1234-5678";
    const blob = "X".repeat(40000);
    let requestBody = null;
    let toolPayload = "";
    const lines = [];
    const spy = jest.spyOn(logger, "info").mockImplementation((msg) => {
      lines.push(String(msg));
    });
    const tool = createAgentTools({ webSearchEnabled: true }).find((item) => item.name === "web_search");
    let asked = false;
    try {
      const result = await runAlterAgent({
        ctx: {
          academy: {
            webSearchEnabled: true,
            aiProvider: "openai",
            aiApiKey: key,
            aiModel: "gpt-5.6-luna",
          },
          user: { auth: "member" },
          registration: { role: "teacher" },
          fetchWeb: async (_url, init) => {
            requestBody = JSON.parse(init.body);
            return {
              ok: true,
              status: 200,
              text: async () =>
                JSON.stringify({
                  status: "incomplete",
                  output: [{ type: "reasoning", summary: [{ text: blob }] }],
                  usage: { input_tokens: 28000, output_tokens: 800, total_tokens: 28800 },
                }),
            };
          },
        },
        input: { message: "날씨" },
        mode: "chat",
        tools: [tool],
        provider: {
          async generate({ messages, forceFinal }) {
            if (!forceFinal && !asked) {
              asked = true;
              return {
                text: "",
                toolCalls: [{ name: "web_search", arguments: { query: `${phone} 오늘 날씨` } }],
                usage: usage(1),
              };
            }
            const row = messages.find((item) => item.role === "tool");
            toolPayload = String(row?.content || "");
            return { text: "출처를 가져오지 못했습니다.", toolCalls: [], usage: usage(1) };
          },
        },
      });
      expect(requestBody.reasoning).toEqual({ effort: "low" });
      expect(requestBody.max_output_tokens).toBe(4096);
      expect(requestBody.tools[0].search_context_size).toBe("low");
      expect(JSON.stringify(requestBody).length).toBeLessThan(500);
      expect(requestBody.input).toContain("오늘 날씨");
      expect(requestBody.input).not.toContain(phone);
      expect(toolPayload.length).toBeLessThan(800);
      expect(toolPayload).toContain("중단되어");
      expect(toolPayload).not.toContain(blob.slice(0, 80));
      expect(toolPayload).not.toContain(key);
      expect(toolPayload).not.toContain(phone);
      expect(toolPayload).not.toContain("28800");
      expect(result.tokenUsage.totalTokens).toBe(28804);
      expect(result.trace[0].audits).toEqual([{ name: "web_search", query: "오늘 날씨" }]);
      expect(JSON.stringify(result.trace)).not.toContain(phone);
      expect(JSON.stringify(result.trace)).not.toContain(key);
      expect(lines.join("\n")).toContain("alter web_search audit 오늘 날씨");
      expect(lines.join("\n")).not.toContain(phone);
    } finally {
      spy.mockRestore();
    }
  });

  test("a search that cites nothing still attaches its source list", async () => {
    let toolPayload = "";
    const tool = createAgentTools({ webSearchEnabled: true }).find((item) => item.name === "web_search");
    let asked = false;
    const result = await runAlterAgent({
      ctx: {
        academy: {
          webSearchEnabled: true,
          aiProvider: "openai",
          aiApiKey: "sk-test-secret-value",
          aiModel: "gpt-4o-mini",
        },
        user: { auth: "member" },
        registration: { role: "teacher" },
        fetchWeb: async () => ({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              status: "completed",
              output: [
                {
                  type: "web_search_call",
                  status: "completed",
                  action: {
                    type: "search",
                    sources: [
                      { type: "url", url: "https://random.org/weather" },
                      { type: "url", url: "https://randombasis.com/guide" },
                    ],
                  },
                },
                {
                  type: "message",
                  content: [{ type: "output_text", text: "검색 결과가 없습니다.", annotations: [] }],
                },
              ],
              usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
            }),
        }),
      },
      input: { message: "오늘 공공 날씨를 웹에서 찾아 출처와 함께 알려 줘" },
      mode: "chat",
      tools: [tool],
      provider: {
        async generate({ messages, forceFinal }) {
          if (!forceFinal && !asked) {
            asked = true;
            return {
              text: "",
              toolCalls: [{ name: "web_search", arguments: { query: "오늘 공공 날씨" } }],
              usage: usage(1),
            };
          }
          const row = messages.find((item) => item.role === "tool");
          toolPayload = String(row?.content || "");
          return {
            text: "오늘의 공공 날씨에 대한 검색 결과가 없습니다",
            toolCalls: [],
            usage: usage(1),
          };
        },
      },
    });
    expect(toolPayload).toContain("https://random.org/weather");
    expect(toolPayload).toContain("https://randombasis.com/guide");
    expect(toolPayload).toContain("검색 결과:");
    expect(result.links.map((link) => link.path)).toEqual([
      "https://random.org/weather",
      "https://randombasis.com/guide",
    ]);
    expect(result.text).toContain("출처는 답 아래에 있습니다.");
    expect(result.tokenUsage.totalTokens).toBe(124);
  });

  test("the scripted demo shows the off note, a source link, and an image url", async () => {
    let fetched = false;
    const fetchImpl = async () => {
      fetched = true;
      throw new Error("network");
    };
    const provider = { id: "openai", apiKey: "scripted-local-dev", model: "gpt-4o-mini" };
    const ctx = {
      academy: {
        aiProvider: "openai",
        aiApiKey: "scripted-local-dev",
        aiModel: "gpt-4o-mini",
        webSearchEnabled: false,
        imageGenEnabled: false,
      },
      registration: { role: "teacher" },
      user: { _id: "teacher", userId: "teacher1", userName: "김교사", auth: "member" },
      fetchWeb: fetchImpl,
      fetchImage: fetchImpl,
    };

    const off = await runAlterAgent({
      ctx,
      input: { message: "오늘 서울 날씨를 웹에서 찾아 줘" },
      mode: "chat",
      provider,
    });
    expect(off.text).toContain("웹 검색은 꺼져 있습니다.");
    expect(off.text).toContain("AI 설정");
    expect(off.toolNames).not.toContain("web_search");

    const cited = await runAlterAgent({
      ctx: { ...ctx, academy: { ...ctx.academy, webSearchEnabled: true } },
      input: { message: "오늘 공공 날씨를 웹에서 찾아 줘" },
      mode: "chat",
      provider,
    });
    expect(cited.toolNames).toContain("web_search");
    expect(cited.links).toEqual([
      expect.objectContaining({ kind: "web", path: "https://example.com/weather" }),
    ]);
    expect(cited.text).toContain("공공 날씨 안내");
    expect(cited.text).toContain("출처는 답 아래에 있습니다.");
    expect(cited.text).not.toContain("https://example.com/weather");

    const picture = await runAlterAgent({
      ctx: { ...ctx, academy: { ...ctx.academy, imageGenEnabled: true } },
      input: { message: "간단한 막대 차트 그림을 만들어 줘" },
      mode: "chat",
      provider,
    });
    expect(picture.toolNames).toContain("generate_image");
    expect(picture.images[0].url).toBe("https://example.com/generated/chart.png");
    expect(picture.text).toContain("https://example.com/generated/chart.png");

    const blocked = await runAlterAgent({
      ctx: {
        ...ctx,
        academy: { ...ctx.academy, imageGenEnabled: true },
        triggerEvents: [],
      },
      input: { message: "막대 차트 그림을 만들어 줘" },
      mode: "event",
      provider,
    });
    expect(blocked.toolNames).not.toContain("generate_image");
    expect(blocked.text).toContain("예약과 이벤트에서는 이미지를 만들지 않습니다.");
    expect(fetched).toBe(false);
  });
});
