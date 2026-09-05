import { formatPersonLabel, formatReadableValue } from "./formFieldDisplay";

describe("formatReadableValue", () => {
  test("formats circulation people instead of [object Object]", () => {
    expect(
      formatReadableValue([
        { user: "u1", userId: "jo", userName: "조은길" },
        { user: "u2", userId: "kim", userName: "김민수" },
      ])
    ).toBe("조은길 (jo), 김민수 (kim)");
    expect(formatPersonLabel({ userName: "조은길", userId: "jo" })).toBe(
      "조은길 (jo)"
    );
  });

  test("does not stringify plain objects", () => {
    expect(formatReadableValue({})).toBe("");
    expect(formatReadableValue({ value: "현장학습" })).toBe("현장학습");
    expect(String({})).toBe("[object Object]");
  });

  test("keeps scalar text", () => {
    expect(formatReadableValue("단답")).toBe("단답");
    expect(formatReadableValue(3)).toBe("3");
  });

  test("formats people stored on a text field without [object Object]", () => {
    expect(
      formatReadableValue([{ userId: "jo", userName: "조은길" }])
    ).toBe("조은길 (jo)");
    expect(formatReadableValue({ userName: "조은길", userId: "jo" })).toBe(
      "조은길 (jo)"
    );
  });
});
