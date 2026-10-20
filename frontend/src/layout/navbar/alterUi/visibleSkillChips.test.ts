import { nextSkillOnChipClick, visibleSkillChips } from "./visibleSkillChips";

describe("visibleSkillChips", () => {
  test("an admin sees the form chip even when the page only suggests chat", () => {
    const chips = visibleSkillChips({
      auth: "admin",
      suggested: ["chat"],
    });
    expect(chips).toContain("form-draft");
    expect(chips.slice(0, 3)).toEqual(["agent", "search", "chat"]);
  });

  test("a teacher sees drafts except the form chip", () => {
    const chips = visibleSkillChips({
      auth: "member",
      registrationRole: "teacher",
      suggested: ["chat"],
    });
    expect(chips).toContain("syllabus-draft");
    expect(chips).not.toContain("form-draft");
  });

  test("a student only sees the three mode chips", () => {
    const chips = visibleSkillChips({
      auth: "member",
      registrationRole: "student",
      suggested: ["form-draft", "chat"],
    });
    expect(chips).toEqual(["agent", "search", "chat"]);
  });

  test("pressing the selected form chip clears it", () => {
    expect(nextSkillOnChipClick("form-draft", "form-draft")).toBe("chat");
    expect(nextSkillOnChipClick("form-draft", "agent")).toBe("agent");
    expect(nextSkillOnChipClick("chat", "chat")).toBe("chat");
  });
});
