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
