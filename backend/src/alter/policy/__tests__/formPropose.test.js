import { runChatAgent } from "../../runners/chat/run.js";

test("live chat proposes a form and does not call the model", async () => {
  let generated = 0;
  const result = await runChatAgent({
    academyId: "eval",
    user: { _id: "admin-1", auth: "admin" },
    academy: { aiProvider: "openai", aiApiKey: "scripted-local-dev", aiModel: "gpt-4o-mini" },
    school: { _id: "school-1" },
    season: { _id: "season-1" },
    registration: { role: "teacher" },
    message: "시간표 양식을 만들어줘",
    generate: async () => {
      generated += 1;
      return { text: "읽기 전용입니다.", toolCalls: [] };
    },
  });
  expect(generated).toBe(0);
  expect(result.confirmation.stage).toBe("propose");
  expect(result.draft).toBeNull();
  expect(result.toolNames).toEqual([]);
});
