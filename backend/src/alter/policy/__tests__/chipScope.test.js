import { logger } from "../../../log/logger.js";
import { registerAuditPort, resetAuditPort } from "../../skills/auditPort.js";
import { lockedChipRefusal } from "../chipScope.js";

describe("locked chip", () => {
  const notes = [];

  beforeEach(() => {
    notes.length = 0;
    registerAuditPort(async (entry) => {
      notes.push(entry);
    });
  });

  afterEach(() => {
    resetAuditPort();
    jest.restoreAllMocks();
  });

  test("a form chip blocks web search and records the denial", async () => {
    const info = jest.spyOn(logger, "info").mockImplementation(() => {});
    const refused = await lockedChipRefusal({
      skillId: "form-draft",
      message: "오늘 서울 날씨 검색해줘",
      academyId: "demo",
      userId: "admin-1",
      role: "admin",
    });
    expect(refused.reasonCode).toBe("CHIP_SCOPE");
    expect(refused.blocked).toBe("web_search");
    expect(refused.text).toContain("양식");
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("blocked=web_search")
    );
    expect(notes).toEqual([
      expect.objectContaining({
        skillId: "web_search",
        decision: "deny",
        reasonCode: "CHIP_SCOPE",
      }),
    ]);
  });

  test("a form request on the form chip is not refused", async () => {
    const refused = await lockedChipRefusal({
      skillId: "form-draft",
      message: "10학년 주간 시간표 양식 초안을 만들어줘",
      academyId: "demo",
      userId: "admin-1",
      role: "admin",
    });
    expect(refused).toBeNull();
    expect(notes).toEqual([]);
  });

  test("chat and agent chips do not lock the turn", async () => {
    expect(
      await lockedChipRefusal({
        skillId: "chat",
        message: "오늘 서울 날씨 검색해줘",
      })
    ).toBeNull();
  });
});
