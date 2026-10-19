import { runAlterAgent } from "../runAlterAgent.js";

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
});
