import { resolveUnreadResponseCount } from "../../src/services/altForms.js";

describe("resolveUnreadResponseCount", () => {
  it("returns 0 when form was never opened", () => {
    const openedAtByForm = new Map();
    const unreadAggByForm = new Map([["form1", 5]]);
    expect(
      resolveUnreadResponseCount("form1", openedAtByForm, unreadAggByForm)
    ).toBe(0);
  });

  it("returns aggregated unread when lastOpenedAt exists", () => {
    const openedAtByForm = new Map([["form1", new Date("2026-01-01")]]);
    const unreadAggByForm = new Map([["form1", 3]]);
    expect(
      resolveUnreadResponseCount("form1", openedAtByForm, unreadAggByForm)
    ).toBe(3);
  });

  it("returns 0 when opened but no matching unread rows", () => {
    const openedAtByForm = new Map([["form1", new Date("2026-01-01")]]);
    const unreadAggByForm = new Map();
    expect(
      resolveUnreadResponseCount("form1", openedAtByForm, unreadAggByForm)
    ).toBe(0);
  });
});
