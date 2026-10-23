import { nextSkillOnChipClick, visibleSkillChips } from "./visibleSkillChips";

describe("visibleSkillChips", () => {
  test("an admin on a page suggesting only chat does not see form-draft", () => {
    const chips = visibleSkillChips({
      auth: "admin",
      suggested: ["chat"],
    });
    expect(chips).not.toContain("form-draft");
    expect(chips).toEqual(["agent", "search", "chat"]);
  });

  test("an admin on a page suggesting form-draft sees it", () => {
    const chips = visibleSkillChips({
      auth: "admin",
      suggested: ["form-draft"],
    });
    expect(chips).toContain("form-draft");
    expect(chips.slice(0, 3)).toEqual(["agent", "search", "chat"]);
  });

  test("a teacher never sees form-draft even if the page suggests it", () => {
    const chips = visibleSkillChips({
      auth: "member",
      registrationRole: "teacher",
      suggested: ["form-draft", "syllabus-draft", "chat"],
    });
    expect(chips).not.toContain("form-draft");
    expect(chips).toContain("syllabus-draft");
    expect(chips.slice(0, 3)).toEqual(["agent", "search", "chat"]);
  });

  test("a student only sees the three mode chips", () => {
    const chips = visibleSkillChips({
      auth: "member",
      registrationRole: "student",
      suggested: ["form-draft", "chat"],
      selected: "syllabus-draft",
    });
    expect(chips).toEqual(["agent", "search", "chat"]);
  });

  test("a chip already selected in the conversation stays visible", () => {
    const chips = visibleSkillChips({
      auth: "admin",
      suggested: ["chat"],
      selected: "document-draft",
    });
    expect(chips).toContain("document-draft");
    expect(chips).not.toContain("form-draft");
    expect(chips.slice(0, 3)).toEqual(["agent", "search", "chat"]);
  });

  test("pressing the selected form chip clears it", () => {
    expect(nextSkillOnChipClick("form-draft", "form-draft")).toBe("chat");
    expect(nextSkillOnChipClick("form-draft", "agent")).toBe("agent");
    expect(nextSkillOnChipClick("chat", "chat")).toBe("chat");
  });
});
