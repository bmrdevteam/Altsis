import { readFileSync, rmSync } from "fs";
import { evalExitCode, parseEvalArgs } from "../../src/alter/eval/args.js";
import { redactSecrets } from "../../src/alter/eval/redact.js";
import { runEval } from "../../src/alter/eval/run.js";

const stubAcademy = {
  aiApiKey: "stub-key-value-xxxx",
  aiProvider: "openai",
  aiModel: "stub",
};

describe("alter eval harness", () => {
  test("scripted golden scenarios pass", async () => {
    const report = await runEval({ mode: "scripted", writeReport: false });
    expect(report.failures).toEqual([]);
    expect(report.passed).toBe(16);
    expect(report.failed).toBe(0);
    expect(report.skipped).toBe(0);
    expect(report.ran).toBe(16);
    expect(report.total).toBe(16);
  }, 180000);

  test("real mode stays out of the test run", async () => {
    await expect(runEval({ mode: "real", writeReport: false })).rejects.toThrow(/수동/);
  });

  test("a bare --real flag is not treated as a scenario filter", () => {
    expect(parseEvalArgs(["--real"])).toMatchObject({ real: true, only: "", academyId: "bmr" });
    expect(parseEvalArgs(["--real", "--only", "demo-"]).only).toBe("demo-");
    expect(parseEvalArgs(["--only=soak-A"]).only).toBe("soak-A");
    expect(evalExitCode({ ran: 0, failed: 0 })).toBe(1);
    expect(evalExitCode({ ran: 2, failed: 1 })).toBe(1);
    expect(evalExitCode({ ran: 2, failed: 0 })).toBe(0);
  });

  test("an unknown filter runs nothing and is a failure", async () => {
    const report = await runEval({ mode: "scripted", only: "does-not-exist", writeReport: false });
    expect(report.ran).toBe(0);
    expect(report.passed).toBe(0);
    expect(report.failed).toBe(0);
    expect(evalExitCode(report)).toBe(1);
  });

  test("stubbed real mode records the loop trace and skips scripted-only scenarios", async () => {
    process.env.ALTER_EVAL_REAL = "1";
    let calls = 0;
    const generate = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          text: "",
          toolCalls: [
            { id: "t1", name: "get_my_todos", arguments: { scope: "all", limit: 10 } },
            {
              id: "t2",
              name: "search_product_guide",
              arguments: { query: "수업 평가는 어디서 하나요" },
            },
          ],
          tokenUsage: { promptTokens: 3, candidatesTokens: 4, totalTokens: 7 },
        };
      }
      return {
        text: "수업 페이지에서 평가합니다.",
        toolCalls: [],
        tokenUsage: { promptTokens: 1, candidatesTokens: 1, totalTokens: 2 },
      };
    };
    try {
      const report = await runEval({
        mode: "real",
        only: "demo-4,soak-E",
        writeReport: true,
        academy: stubAcademy,
        generate,
      });
      expect(report.passed).toBe(1);
      expect(report.failed).toBe(0);
      expect(report.skipped).toBe(1);
      expect(report.ran).toBe(1);
      expect(evalExitCode(report)).toBe(0);
      const demo = report.scenarios.find((row) => row.id === "demo-4");
      const soak = report.scenarios.find((row) => row.id === "soak-E");
      expect(demo.status).toBe("pass");
      expect(demo.toolNames).toEqual(["get_my_todos", "search_product_guide"]);
      expect(demo.tokens).toEqual({ prompt: 4, completion: 5, total: 9 });
      expect(demo.latencyMs).toBeGreaterThanOrEqual(0);
      expect(soak.status).toBe("skip");
      const saved = JSON.parse(readFileSync(report.reportFile, "utf8"));
      expect(saved.scenarios.map((row) => row.status)).toEqual(["pass", "skip"]);
      expect(JSON.stringify(saved)).not.toContain(stubAcademy.aiApiKey);
      rmSync(report.reportFile, { force: true });
    } finally {
      delete process.env.ALTER_EVAL_REAL;
    }
  }, 60000);

  test("printed output drops the provider key", () => {
    const key = "sk-live-secret-value";
    expect(redactSecrets(`provider said ${key} in the body`, [key])).toBe(
      "provider said [redacted] in the body"
    );
    expect(redactSecrets("short", ["ab"])).toBe("short");
  });
});
