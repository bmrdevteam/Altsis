import { confirmationCardState } from "./confirmationCard";

describe("confirmation cards", () => {
  const card = {
    id: "abc",
    stage: "propose",
    status: "pending",
    expiresAt: "2026-10-20T00:00:00.000Z",
  };

  test("a pending proposal can proceed", () => {
    expect(confirmationCardState(card, Date.parse("2026-10-19T00:00:00.000Z"))).toBe("pending");
  });

  test("an expired card asks for a new confirmation", () => {
    expect(confirmationCardState(card, Date.parse("2026-10-21T00:00:00.000Z"))).toBe("expired");
  });

  test("a spent card cannot run again", () => {
    expect(confirmationCardState({ ...card, status: "consumed" })).toBe("consumed");
  });

  test("a cancelled card does not offer proceed again", () => {
    expect(confirmationCardState({ ...card, status: "cancelled" })).toBe("cancelled");
  });

  test("before_apply is the editor step", () => {
    expect(
      confirmationCardState({ ...card, stage: "before_apply" }, Date.parse("2026-10-19T00:00:00.000Z"))
    ).toBe("apply");
  });
});
