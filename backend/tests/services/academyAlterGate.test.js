jest.mock("../../src/models/index.js", () => ({
  Academy: { findOne: jest.fn() },
}));

import { Academy } from "../../src/models/index.js";
import { requireAcademyAlter } from "../../src/middleware/alter.js";

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
  return res;
};

describe("requireAcademyAlter", () => {
  test("CTRL이 꺼지면 Alter API를 403으로 거부한다", async () => {
    Academy.findOne.mockResolvedValue({
      aiEnabled: false,
      plans: { ctrl: { enabled: false } },
    });
    const res = mockRes();
    const next = jest.fn();
    await requireAcademyAlter(
      { user: { academyId: "demo" } },
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("AI_NOT_ENABLED");
  });

  test("aiEnabled만 꺼져도 거부하고, 다시 켜면 통과한다", async () => {
    Academy.findOne.mockResolvedValueOnce({
      aiEnabled: true,
      plans: { ctrl: { enabled: false } },
    });
    const blocked = mockRes();
    const next = jest.fn();
    await requireAcademyAlter(
      { user: { academyId: "demo" } },
      blocked,
      next
    );
    expect(blocked.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();

    Academy.findOne.mockResolvedValueOnce({
      aiEnabled: true,
      plans: { ctrl: { enabled: true } },
    });
    const allowed = mockRes();
    await requireAcademyAlter(
      { user: { academyId: "demo" } },
      allowed,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(allowed.statusCode).toBe(200);
  });
});
