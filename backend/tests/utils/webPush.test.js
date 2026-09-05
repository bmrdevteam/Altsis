import {
  WEB_PUSH_ELIGIBLE_TYPES,
  pickClickSchoolId,
  tagForNotification,
} from "../../src/services/webPush.js";

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

describe("pickClickSchoolId", () => {
  test("prefers board school over the user's first school", () => {
    expect(pickClickSchoolId("bmrworkspace", "bmrhs")).toBe("bmrworkspace");
  });

  test("falls back to the user school when the entity has none", () => {
    expect(pickClickSchoolId("", "bmrhs")).toBe("bmrhs");
    expect(pickClickSchoolId(null, "bmrhs")).toBe("bmrhs");
    expect(pickClickSchoolId(undefined, "  bmrhs  ")).toBe("bmrhs");
  });

  test("returns null when both are empty", () => {
    expect(pickClickSchoolId("", "")).toBeNull();
    expect(pickClickSchoolId(null, undefined)).toBeNull();
  });
});

describe("tagForNotification", () => {
  test("collapses by related entity", () => {
    expect(
      tagForNotification({
        notificationType: "newPost",
        relatedEntity: { type: "post", id: "p1" },
        _id: "n1",
      })
    ).toBe("newPost:post:p1");
  });

  test("falls back to notification id when no entity", () => {
    expect(
      tagForNotification({
        notificationType: "reminder",
        _id: "n2",
      })
    ).toBe("reminder:n2");
  });
});
