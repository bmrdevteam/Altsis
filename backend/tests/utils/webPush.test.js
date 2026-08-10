import { WEB_PUSH_ELIGIBLE_TYPES } from "../../src/services/webPush.js";

describe("WEB_PUSH_ELIGIBLE_TYPES", () => {
  test("matches in-app auto notification types", () => {
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("classInvitation")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("classCancellation")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("classApproval")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("classApprovalCancel")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("scheduleStart")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("newPost")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("reminder")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("boardInvitation")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("altFormApprovalRequest")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("altFormApprovalResult")).toBe(true);
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("chatMessage")).toBe(true);
  });

  test("excludes non-auto / unused types", () => {
    expect(WEB_PUSH_ELIGIBLE_TYPES.has("direct")).toBe(false);
  });
});
