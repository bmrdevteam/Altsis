import { readFileSync } from "fs";
import { join } from "path";
import { buildAgentSystemPrompt } from "../../../services/alterAgentProtocol.js";
import { createAgentTools } from "../../../services/alterAgentTools.js";

const saved = JSON.parse(
  readFileSync(join(process.cwd(), "src/alter/tools/__tests__/prompt-snapshot.json"), "utf8")
);

const cases = [
  { id: "native-default", protocol: "native", deps: {} },
  { id: "fence-default", protocol: "fence", deps: {} },
  { id: "native-no-schedule", protocol: "native", deps: { includeScheduleTool: false } },
  {
    id: "native-trigger",
    protocol: "native",
    deps: { includeTriggerTool: true, includeScheduleTool: false },
  },
  { id: "native-all", protocol: "native", deps: { includeTriggerTool: true } },
  { id: "fence-all", protocol: "fence", deps: { includeTriggerTool: true } },
  {
    id: "native-context",
    protocol: "native",
    deps: {},
    pageNote: "수업 · 문학",
    guidelines: "학교 지침 한 줄",
  },
];

const meaning = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();

/** Lines that moved, with no added or removed text. */
const orderDiff = (before, after) => {
  const beforeLines = String(before).split("\n");
  const afterLines = String(after).split("\n");
  const added = meaning(after).filter((line) => !meaning(before).includes(line));
  const removed = meaning(before).filter((line) => !meaning(after).includes(line));
  const moved = [];
  afterLines.forEach((line, to) => {
    if (!line.trim()) return;
    const from = beforeLines.indexOf(line);
    if (from !== to) moved.push({ from, to, line });
  });
  return { added, removed, moved };
};

describe("assembled agent prompt", () => {
  test("same tool set keeps the same lines; only rule order moves", () => {
    const summaries = [];
    for (const row of cases) {
      const actual = buildAgentSystemPrompt({
        tools: createAgentTools(row.deps),
        protocol: row.protocol,
        pageNote: row.pageNote || "",
        guidelines: row.guidelines || "",
      });
      const before = saved[row.id];
      const diff = orderDiff(before, actual);
      expect({ id: row.id, added: diff.added, removed: diff.removed }).toEqual({
        id: row.id,
        added: [],
        removed: [],
      });
      expect(meaning(actual)).toEqual(meaning(before));
      if (actual !== before) {
        summaries.push(
          [
            row.id,
            ...diff.moved.map((rowMove) => `${rowMove.from}→${rowMove.to} ${rowMove.line}`),
          ].join("\n")
        );
      }
    }
    const shown = summaries.join("\n\n");
    expect(shown).toContain("native-default");
    expect(shown).toContain("어디서/어떻게/방법을 함께 물으면 search_product_guide도 같은 턴에 호출하세요");
    expect(shown).toContain("source=board");
    expect(shown).not.toContain("\n+");
    expect(shown).not.toContain("\n-");
  });

  test("removing a tool removes only that tool's hints", () => {
    const tools = createAgentTools().filter((tool) => tool.name !== "search_product_guide");
    const prompt = buildAgentSystemPrompt({ tools, protocol: "native" });
    expect(prompt).not.toContain("search_product_guide도 같은 턴에 호출");
    expect(prompt).not.toContain("메뉴·알림·기능은 search_product_guide");
    expect(prompt).toContain("emptyCourses는 수강생 없는 수업 수입니다");
    expect(prompt).toContain("manage_schedule은 저장하지 않습니다");
  });
});
