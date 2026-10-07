import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { listTools } from "../../tools/registry.js";
import { describeSkills, getSkill, listSkills, selectSkill, toolsForSkill } from "../registry.js";

const skillsRoot = join(process.cwd(), "src/alter/skills");

const sourceFiles = (dir, found = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (name.endsWith(".js")) found.push(path);
  }
  return found;
};

describe("alter skill contract", () => {
  const skills = listSkills();

  test("the example skill has an id, a procedure, a role, and registry tools", () => {
    const ids = skills.map((skill) => skill.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["fixture-brief"]);
    const registered = new Set(listTools().map((tool) => tool.name));
    for (const skill of skills) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9-]{0,63}$/);
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.when.length).toBeGreaterThan(0);
      expect(skill.prompt.length).toBeGreaterThan(0);
      expect(skill.readOnly).toBe(true);
      expect(skill.permission.roles).toEqual(["teacher"]);
      expect(skill.parameters.type).toBe("object");
      expect(skill.parameters.additionalProperties).toBe(false);
      expect(skill.tools.length).toBeGreaterThan(0);
      for (const name of skill.tools) expect(registered.has(name)).toBe(true);
      const defs = listTools().filter((tool) => skill.tools.includes(tool.name));
      expect(defs.every((tool) => tool.readOnly === true)).toBe(true);
    }
  });

  test("selection follows the id and the role, and the tool list drops the rest", () => {
    expect(selectSkill({ message: "fixture-brief 로 할 일을 봐 줘", role: "teacher" })?.id).toBe(
      "fixture-brief"
    );
    expect(selectSkill({ message: "이번 주 할 일을 정리해 줘", role: "teacher" })).toBeNull();
    expect(selectSkill({ message: "fixture-brief", role: "student" })).toBeNull();
    expect(describeSkills("teacher").map((skill) => skill.id)).toEqual(["fixture-brief"]);
    expect(describeSkills("student")).toEqual([]);
    expect(getSkill("missing")).toBeNull();
    const offered = toolsForSkill(getSkill("fixture-brief"), { includeScheduleTool: true }).map(
      (tool) => tool.name
    );
    expect(offered).toEqual(["get_my_todos"]);
  });

  test("skill modules do not import providers or the agent", () => {
    const files = sourceFiles(skillsRoot);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(/alter\/(providers|agent)\//);
      expect(text).not.toMatch(/from ["'][^"']*(providers|agent)\//);
    }
  });
});
