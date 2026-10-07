import { runSkillAgent } from "../run.js";

const usage = (n) => ({
  promptTokens: n,
  candidatesTokens: n,
  thoughtsTokens: 0,
  totalTokens: n * 2,
});

const teacher = {
  academyId: "eval",
  user: { _id: "u1", userId: "teacher1", userName: "김교사" },
  academy: { aiProvider: "openai", aiApiKey: "test-key", aiModel: "gpt-4o-mini", aiEnabled: true },
  season: { _id: "season1" },
  school: { _id: "school1" },
  registration: { role: "teacher" },
  message: "fixture-brief 로 이번 주 할 일을 확인해 줘",
};

describe("runSkillAgent", () => {
  test("offers only the skill tools and keeps the agent step cap", async () => {
    const offered = [];
    let sawProcedure = false;
    const result = await runSkillAgent({
      ...teacher,
      limits: { maxToolSteps: 1 },
      generate: async ({ tools, forceFinal, systemInstruction }) => {
        offered.push((tools || []).map((tool) => tool.name));
        if (String(systemInstruction || "").includes("get_my_todos만")) sawProcedure = true;
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
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((names) => names.join() === "get_my_todos")).toBe(true);
    expect(sawProcedure).toBe(true);
    expect(result.toolNames).not.toContain("manage_schedule");
    expect(result.toolSteps).toBe(1);
    expect(result.text).toBe("허용된 도구만 실행했습니다.");
  });

  test("a student cannot run the teacher skill", async () => {
    await expect(
      runSkillAgent({
        ...teacher,
        registration: { role: "student" },
        skillId: "fixture-brief",
        message: "확인해 줘",
        generate: async () => ({ text: "안 됨", toolCalls: [], usage: usage(1) }),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
