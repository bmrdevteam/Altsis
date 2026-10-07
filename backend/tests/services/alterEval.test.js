import { redactSecrets } from "../../src/alter/eval/redact.js";
import { runEval } from "../../src/alter/eval/run.js";

describe("alter eval harness", () => {
  test("scripted golden scenarios pass", async () => {
    const report = await runEval({ mode: "scripted" });
    expect(report.failures).toEqual([]);
    expect(report.passed).toBe(report.total);
    expect(report.total).toBeGreaterThanOrEqual(16);
  }, 180000);

  test("real mode stays out of the test run", async () => {
    await expect(runEval({ mode: "real" })).rejects.toThrow(/수동/);
  });

  test("printed output drops the provider key", () => {
    const key = "sk-live-secret-value";
    expect(redactSecrets(`provider said ${key} in the body`, [key])).toBe(
      "provider said [redacted] in the body"
    );
    expect(redactSecrets("short", ["ab"])).toBe("short");
  });
});
