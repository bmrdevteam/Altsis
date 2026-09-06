import { parseSettingsTab } from "./settingsTab";

describe("parseSettingsTab", () => {
  test("accepts known tabs", () => {
    expect(parseSettingsTab("notification")).toBe("notification");
    expect(parseSettingsTab("theme")).toBe("theme");
    expect(parseSettingsTab("app")).toBe("app");
  });

  test("falls back to user", () => {
    expect(parseSettingsTab(null)).toBe("user");
    expect(parseSettingsTab(undefined)).toBe("user");
    expect(parseSettingsTab("")).toBe("user");
    expect(parseSettingsTab("install")).toBe("user");
    expect(parseSettingsTab("../secret")).toBe("user");
  });
});
