import { describeAlterRoutine } from "./alterScheduleLabel";

describe("describeAlterRoutine", () => {
  test("labels an event routine separately from a clock routine", () => {
    expect(
      describeAlterRoutine({
        trigger: "event",
        event: { types: ["form_submitted", "dm_received"], debounceMs: 15 * 60 * 1000 },
      })
    ).toBe("이벤트 · 제출, 1:1 메시지 · 15분 모아서");
    expect(
      describeAlterRoutine({
        trigger: "time",
        timezone: "Asia/Seoul",
        schedule: { kind: "daily", time: "08:00" },
      })
    ).toBe("매일 08:00 (Asia/Seoul)");
  });
});
