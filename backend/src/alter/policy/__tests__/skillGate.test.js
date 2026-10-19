import { resolveSkillMeta } from "../../core/skillMeta.js";
import { getCapability, listCapabilities } from "../../skills/catalog.js";
import { createAgentTools } from "../../tools/registry.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { runChatAgent } from "../../runners/chat/run.js";
import {
  actorFromAlterCtx,
  evaluateSkillAccess,
} from "../skillGate.js";

const usage = (n) => ({
  promptTokens: n,
  candidatesTokens: n,
  thoughtsTokens: 0,
  totalTokens: n * 2,
});

const teacherCtx = {
  user: { _id: "t1", auth: "member", userName: "김교사" },
  registration: { role: "teacher" },
  academy: { aiEnabled: true, aiProvider: "openai", aiApiKey: "test-key", aiModel: "gpt-4o-mini" },
  season: { _id: "season1" },
  school: { _id: "school1" },
};

describe("skill gate", () => {
  test("flags block the owner before the role check", () => {
    const image = getCapability("generate_image");
    const owner = actorFromAlterCtx({ user: { auth: "owner" }, registration: { role: "teacher" } });
    const denied = evaluateSkillAccess({
      actor: owner,
      flags: { imageGenEnabled: false, webSearchEnabled: false },
      capability: image,
      phase: "execute",
    });
    expect(denied.decision).toBe("deny");
    expect(denied.reasonCode).toBe("FLAG_OFF");
    expect(denied.nextAction).toBe("enable_flag");
    expect(denied.userMessage).toContain("이미지 생성");
    expect(denied.userMessage).toContain("학원 설정");

    const allowed = evaluateSkillAccess({
      actor: owner,
      flags: { imageGenEnabled: true },
      capability: image,
      phase: "list",
    });
    expect(allowed.decision).toBe("allow");
  });

  test("a student is denied new and draft skills and still allowed the screen tool", () => {
    const student = actorFromAlterCtx({
      user: { auth: "student" },
      registration: { role: "student" },
    });
    for (const id of ["form-draft", "web_search", "generate_image", "school-search"]) {
      const decision = evaluateSkillAccess({
        actor: student,
        flags: { webSearchEnabled: true, imageGenEnabled: true },
        capability: getCapability(id),
      });
      expect(decision.reasonCode).toBe("STUDENT_DENIED");
    }
    const screen = evaluateSkillAccess({
      actor: student,
      flags: {},
      capability: getCapability("get_current_screen"),
    });
    expect(screen.decision).toBe("allow");
  });

  test("a chip keeps only that skill's tools", () => {
    const teacher = actorFromAlterCtx(teacherCtx);
    const outside = evaluateSkillAccess({
      actor: teacher,
      flags: { webSearchEnabled: true },
      chip: { id: "fixture-brief", title: "픽스처 브리핑", allowedTools: ["get_my_todos"] },
      capability: getCapability("web_search"),
    });
    expect(outside.reasonCode).toBe("CHIP_SCOPE");
    expect(outside.userMessage).toContain("픽스처 브리핑");
    expect(outside.userMessage).not.toContain("web_search");
    const inside = evaluateSkillAccess({
      actor: teacher,
      flags: {},
      chip: { id: "fixture-brief", title: "픽스처 브리핑", allowedTools: ["get_my_todos"] },
      capability: getCapability("get_my_todos"),
    });
    expect(inside.decision).toBe("allow");
  });

  test("draft confirmation is before apply, and a high-cost draft asks twice", () => {
    expect(getCapability("form-draft").confirmation).toBe("before_apply");
    expect(getCapability("form-draft").channel).toBe("dispatch");
    expect(getCapability("generate_image").confirmation).toBe("both");
    expect(getCapability("generate_image").intendedChannel).toBe("dispatch");
    const pending = evaluateSkillAccess({
      actor: actorFromAlterCtx({ user: { auth: "admin" } }),
      flags: {},
      capability: getCapability("form-draft"),
      phase: "execute",
    });
    expect(pending.decision).toBe("needs_confirmation");
    expect(pending.stage).toBe("before_apply");
  });

  test("write confirmation cannot be weaker than both", () => {
    expect(() => resolveSkillMeta({ id: "save-note", kind: "write", confirmation: "none" })).toThrow(
      /both/
    );
  });

  test("every new dispatch skill stays closed to students", () => {
    const dispatch = listCapabilities().filter((item) => item.source === "dispatch");
    expect(dispatch.length).toBeGreaterThan(0);
    expect(dispatch.every((item) => item.studentAllowed === false)).toBe(true);
    expect(dispatch.every((item) => item.channel === "dispatch")).toBe(true);
  });

  test("live chat drops a tool outside the named skill", async () => {
    const offered = [];
    const result = await runChatAgent({
      academyId: "eval",
      ...teacherCtx,
      message: "fixture-brief 로 일정을 만들고 할 일도 봐 줘",
      generate: async ({ tools, forceFinal }) => {
        offered.push((tools || []).map((tool) => tool.name));
        if (!forceFinal) {
          return {
            text: "",
            toolCalls: [{ name: "manage_schedule", arguments: { action: "list" } }],
            usage: usage(1),
          };
        }
        return { text: "허용된 도구만 실행했습니다.", toolCalls: [], usage: usage(1) };
      },
    });
    expect(offered.every((names) => names.join() === "get_my_todos")).toBe(true);
    expect(result.toolNames).not.toContain("manage_schedule");
  });

  test("the execution gate blocks a flagged tool that was forced onto the list", async () => {
    let ran = false;
    const web = createAgentTools({ webSearchEnabled: true }).find((tool) => tool.name === "web_search");
    const wrapped = {
      ...web,
      async execute() {
        ran = true;
        return { summary: "검색함" };
      },
    };
    const result = await runAlterAgent({
      ctx: {
        ...teacherCtx,
        user: { _id: "owner", auth: "owner" },
        academy: { ...teacherCtx.academy, webSearchEnabled: false },
      },
      input: { message: "웹에서 찾아 줘" },
      mode: "chat",
      tools: [wrapped],
      skillGate: {
        actor: actorFromAlterCtx({ user: { auth: "owner" }, registration: { role: "teacher" } }),
        flags: { webSearchEnabled: false },
        chip: null,
      },
      provider: {
        async generate({ forceFinal }) {
          if (!forceFinal) {
            return {
              text: "",
              toolCalls: [{ name: "web_search", arguments: { query: "날씨" } }],
              usage: usage(1),
            };
          }
          return { text: "웹 검색은 꺼져 있습니다.", toolCalls: [], usage: usage(1) };
        },
      },
    });
    expect(ran).toBe(false);
    expect(result.toolNames).not.toContain("web_search");
  });
});
