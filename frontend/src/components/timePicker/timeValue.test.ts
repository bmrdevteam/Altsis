import { formatTimeDisplay, parseTimeValue, toHHmm } from "./timeValue";

describe("parseTimeValue", () => {
  test("empty or invalid values are null", () => {
    expect(parseTimeValue("")).toBeNull();
    expect(parseTimeValue(undefined)).toBeNull();
    expect(parseTimeValue(null)).toBeNull();
    expect(parseTimeValue("nope")).toBeNull();
    expect(parseTimeValue("24:00")).toBeNull();
    expect(parseTimeValue("12:60")).toBeNull();
  });

  test("parses midnight and afternoon", () => {
    expect(parseTimeValue("00:00")).toEqual({
      ampm: "am",
      hour12: 12,
      minute: 0,
    });
    expect(parseTimeValue("13:05")).toEqual({
      ampm: "pm",
      hour12: 1,
      minute: 5,
    });
  });
});

describe("toHHmm", () => {
  test("converts 12-hour parts to HH:mm", () => {
    expect(toHHmm("am", 12, 0)).toBe("00:00");
    expect(toHHmm("pm", 1, 5)).toBe("13:05");
    expect(toHHmm("pm", 12, 0)).toBe("12:00");
  });
});

describe("formatTimeDisplay", () => {
  test("empty is blank", () => {
    expect(formatTimeDisplay("")).toBe("");
    expect(formatTimeDisplay("bad")).toBe("");
  });

  test("formats Korean 12-hour display", () => {
    expect(formatTimeDisplay("00:00")).toBe("오전 12:00");
    expect(formatTimeDisplay("13:05")).toBe("오후 01:05");
  });
});
