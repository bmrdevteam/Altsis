import {
  buildTimetableSlots,
  buildWeekGrid,
  parseTimetableAttrs,
  weekStartMonday,
  weekDates,
  weekdayIndexMon0,
} from "../../src/utils/timetableSlots.js";
import { renderMerge } from "../../src/utils/mergeEngine.js";

const dateId = "d1";
const periodId = "p1";
const roomId = "r1";
const nameId = "n1";

const fields = [
  { _id: dateId, label: "날짜", type: "multiDate" },
  {
    _id: periodId,
    label: "시간표",
    type: "select",
    options: ["1교시", "2교시", "저녁활동 1교시"],
  },
  { _id: roomId, label: "강의실", type: "select", options: ["돔2", "돔3"] },
  { _id: nameId, label: "이름", type: "text" },
];

function makeRow({ dates, period, room, name, respondent }) {
  return {
    data: {
      [dateId]: dates,
      [periodId]: period,
      [roomId]: room,
      [nameId]: name,
    },
    _respondentName: respondent || name,
    _respondentId: "u1",
  };
}

describe("timetableSlots", () => {
  test("weekStartMonday is Monday", () => {
    // 2026-08-12 is Wednesday
    expect(weekStartMonday("2026-08-12")).toBe("2026-08-10");
    expect(weekDates("2026-08-10")[0]).toBe("2026-08-10");
    expect(weekDates("2026-08-10")[6]).toBe("2026-08-16");
    expect(weekdayIndexMon0("2026-08-12")).toBe(2);
  });

  test("parseTimetableAttrs", () => {
    const a = parseTimetableAttrs("date=날짜 period=시간표 days=월,화,수");
    expect(a.dateLabel).toBe("날짜");
    expect(a.periodLabel).toBe("시간표");
    expect(a.dayIndexes).toEqual([0, 1, 2]);
  });

  test("expands multiDate into slots", () => {
    const rows = [
      makeRow({
        dates: ["2026-08-12", "2026-08-19"],
        period: "저녁활동 1교시",
        room: "돔2",
        name: "손영찬",
      }),
    ];
    const { slots, error, periodOrder } = buildTimetableSlots(rows, fields, {
      dateLabel: "날짜",
      periodLabel: "시간표",
    });
    expect(error).toBeNull();
    expect(slots).toHaveLength(2);
    expect(slots[0].period).toBe("저녁활동 1교시");
    expect(periodOrder).toContain("저녁활동 1교시");
  });

  test("buildWeekGrid places slots", () => {
    const rows = [
      makeRow({
        dates: ["2026-08-12"],
        period: "1교시",
        room: "돔2",
        name: "A",
      }),
    ];
    const { slots, periodOrder } = buildTimetableSlots(rows, fields, {
      dateLabel: "날짜",
      periodLabel: "시간표",
    });
    const { grid, weekStart } = buildWeekGrid(
      slots,
      periodOrder,
      "2026-08-10",
      null
    );
    expect(weekStart).toBe("2026-08-10");
    const row1 = grid.find((g) => g.period === "1교시");
    expect(row1.cells[2]).toHaveLength(1); // Wed
    expect(row1.cells[2][0].row.data[nameId]).toBe("A");
  });
  test("expands Korean CSV-style multiDate strings (no respondent)", () => {
    const rows = [
      {
        data: {
          [dateId]: "08. 12. (수), 08. 19. (수)",
          [periodId]: "1교시, 2교시",
          [roomId]: "돔2",
          [nameId]: "직접입력",
        },
        _respondentName: null,
        _respondentId: null,
        _respondent: null,
      },
    ];
    const { slots, error } = buildTimetableSlots(rows, fields, {
      dateLabel: "날짜",
      periodLabel: "시간표",
    });
    expect(error).toBeNull();
    // 2 dates × 2 periods
    expect(slots).toHaveLength(4);
    expect(slots.every((s) => s.date.startsWith("2026-08-") || s.date.startsWith(`${new Date().getFullYear()}-08-`))).toBe(true);
    expect(slots.map((s) => s.period).sort()).toEqual([
      "1교시",
      "1교시",
      "2교시",
      "2교시",
    ]);
  });

  test("expands ISO multiDate without respondent", () => {
    const rows = [
      {
        data: {
          [dateId]: ["2026-08-12"],
          [periodId]: "저녁활동 1교시",
          [roomId]: "세미나1",
          [nameId]: "CSV행",
        },
      },
    ];
    const { slots, error } = buildTimetableSlots(rows, fields, {
      dateLabel: "날짜",
      periodLabel: "시간표",
    });
    expect(error).toBeNull();
    expect(slots).toHaveLength(1);
    expect(slots[0].date).toBe("2026-08-12");
  });
});

describe("coerceFieldValueFromCsv", () => {
  test("parses Korean multiDate display string", async () => {
    const { coerceFieldValueFromCsv } = await import(
      "../../src/utils/timetableSlots.js"
    );
    const result = coerceFieldValueFromCsv("08. 12. (수), 08. 19. (수)", {
      type: "multiDate",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^\d{4}-08-12$/);
    expect(result[1]).toMatch(/^\d{4}-08-19$/);
  });
});

describe("mergeEngine timetable", () => {
  test("renders weekly markdown table with cell template", () => {
    const rows = [
      makeRow({
        dates: ["2026-08-12", "2026-08-19"],
        period: "저녁활동 1교시",
        room: "돔2",
        name: "손영찬",
      }),
      makeRow({
        dates: ["2026-08-12"],
        period: "1교시",
        room: "돔3",
        name: "김철수",
      }),
    ];
    const { content, stripped } = renderMerge(
      [
        "{{#timetable date=날짜 period=시간표 week=2026-08-10}}",
        "{{강의실}} {{이름}}",
        "{{/timetable}}",
      ].join("\n"),
      rows,
      fields
    );
    expect(stripped).toBe(false);
    expect(content).toContain("주간 시간표");
    expect(content).toContain("2026-08-10");
    expect(content).toContain("교시");
    expect(content).toContain("돔2");
    expect(content).toContain("손영찬");
    expect(content).toContain("돔3");
    expect(content).toContain("김철수");
    // second week date filtered out by week=
    expect(content.match(/손영찬/g)?.length).toBe(1);
  });

  test("reports missing field labels", () => {
    const { content } = renderMerge(
      "{{#timetable date=없는날짜 period=시간표}}\n{{이름}}\n{{/timetable}}",
      [makeRow({ dates: ["2026-08-12"], period: "1교시", room: "돔2", name: "A" })],
      fields
    );
    expect(content).toContain("찾을 수 없습니다");
  });
});
