import { WEB_PUSH_ELIGIBLE_TYPES } from "../../src/services/webPush.js";

describe("WEB_PUSH_ELIGIBLE_TYPES", () => {
  test("includes MVP opt-in types only", () => {
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("classInvitation")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("altFormApprovalRequest")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("reminder")).toBe(true);
  });

  test("excludes high-volume notification types", () => {
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("newPost")).toBe(false);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("scheduleStart")).toBe(false);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("chatMessage")).toBe(false);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("boardInvitation")).toBe(false);
  });
});
