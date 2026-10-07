import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/** Jest's babel transform cannot compile import.meta. Tests and the CLI run from backend/. */
const scenarioDir = join(process.cwd(), "src/alter/eval/scenarios");

export const loadScenarios = () =>
  readdirSync(scenarioDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(scenarioDir, name), "utf8")));

export const scenarioSelected = (id, only) => {
  const raw = String(only || "").trim();
  if (!raw) return true;
  return raw.split(",").some((part) => {
    const token = part.trim().replace(/\*$/, "");
    return token && String(id || "").startsWith(token);
  });
};
