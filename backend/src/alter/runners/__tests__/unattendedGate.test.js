import { runEventAgent } from "../../runners/event/run.js";
import { runScheduleAgent } from "../../runners/schedule/run.js";

const academy = {
  aiProvider: "openai",
  aiApiKey: "scripted-local-dev",
  aiModel: "gpt-4o-mini",
  aiEnabled: true,
  webSearchEnabled: true,
  imageGenEnabled: true,
};

const namesFor = async (run, extra) => {
  const names = [];
  const result = await run({
    academyId: "eval",
    academy,
    school: { _id: "school-1" },
    season: { _id: "season-1" },
    ...extra,
    generate: async ({ tools }) => {
      names.push(...(tools || []).map((tool) => tool.name));
      return extra.generated;
    },
  });
  return { names, result };
};

test("schedule and event use the skill gate and do not draft an image", async () => {
  const schedule = await namesFor(runScheduleAgent, {
    user: { _id: "teacher-1", auth: "member" },
    registration: { role: "teacher" },
    message: "예약으로 막대 차트 그림을 만들어 줘",
    generated: { text: "예약에서는 이미지를 만들지 않습니다.", toolCalls: [] },
  });
  expect(schedule.names).toContain("get_my_todos");
  expect(schedule.names).not.toContain("generate_image");
  expect(schedule.names).not.toContain("use_skill");
  expect(schedule.result.confirmation).toBeFalsy();
  expect(schedule.result.text).toContain("예약에서는 이미지를 만들지 않습니다.");

  const student = await namesFor(runScheduleAgent, {
    user: { _id: "student-1", auth: "student" },
    registration: { role: "student" },
    message: "할 일을 알려 줘",
    generated: { text: "확인할 수 있는 기능이 없습니다.", toolCalls: [] },
  });
  expect(student.names).not.toContain("get_my_todos");
  expect(student.names).not.toContain("web_search");

  const event = await namesFor(runEventAgent, {
    user: { _id: "teacher-1", auth: "member" },
    registration: { role: "teacher" },
    message: "제출이 들어오면 정리해 줘",
    triggerEvents: [{ type: "form_submitted", title: "출석" }],
    generated: { text: "이벤트를 확인했습니다.", toolCalls: [] },
  });
  expect(event.names).toContain("get_trigger_events");
  expect(event.names).not.toContain("generate_image");
  expect(event.names).not.toContain("use_skill");
});
