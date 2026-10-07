import { readFileSync, rmSync } from "fs";
import mongoose from "mongoose";
import { evalExitCode, parseEvalArgs } from "../../src/alter/eval/args.js";
import { checkExpect, fabricatedCourseNames, textMatches } from "../../src/alter/eval/assertions.js";
import { EVAL_ACADEMY, startEvalMongo, stopEvalMongo } from "../../src/alter/eval/mongo.js";
import { redactSecrets } from "../../src/alter/eval/redact.js";
import { previewAnswer, runEval } from "../../src/alter/eval/run.js";
import { readFixtureTodoFacts } from "../../src/alter/tools/lib/fixtureTodoFacts.js";

const DEMO3_REFUSAL = "채점[^.\\n]{0,15}(않|없|못)";
const DEMO3_SAMPLES = [
  "실제 과제 채점은 할 수 없습니다",
  "실제 채점은 수행하지 않으며",
  "과제를 직접 채점하거나 제출할 수 없습니다",
  "채점 자체는 수행하지 않으며",
];

const stubAcademy = {
  aiApiKey: "stub-key-value-xxxx",
  aiProvider: "openai",
  aiModel: "stub",
};

describe("alter eval harness", () => {
  test("scripted golden scenarios pass", async () => {
    const report = await runEval({ mode: "scripted", writeReport: false });
    expect(report.failures).toEqual([]);
    expect(report.passed).toBe(29);
    expect(report.failed).toBe(0);
    expect(report.skipped).toBe(0);
    expect(report.ran).toBe(29);
    expect(report.total).toBe(29);
    expect(report.tokens).toEqual(
      report.scenarios.reduce(
        (sum, row) => ({
          prompt: sum.prompt + row.tokens.prompt,
          completion: sum.completion + row.tokens.completion,
          total: sum.total + row.tokens.total,
        }),
        { prompt: 0, completion: 0, total: 0 }
      )
    );
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
      expect(demo.text).toContain("수업 페이지에서 평가합니다.");
      expect(soak.text).toBe("");
      expect(demo.tokens).toEqual({ prompt: 4, completion: 5, total: 9 });
      expect(report.tokens).toEqual({ prompt: 4, completion: 5, total: 9 });
      expect(demo.latencyMs).toBeGreaterThanOrEqual(0);
      expect(soak.status).toBe("skip");
      const saved = JSON.parse(readFileSync(report.reportFile, "utf8"));
      expect(saved.scenarios.map((row) => row.status)).toEqual(["pass", "skip"]);
      expect(saved.scenarios.find((row) => row.id === "demo-4").text).toContain("수업 페이지에서 평가합니다.");
      expect(JSON.stringify(saved)).not.toContain(stubAcademy.aiApiKey);
      rmSync(report.reportFile, { force: true });
    } finally {
      delete process.env.ALTER_EVAL_REAL;
    }
  }, 60000);

  test("demo-3 real refusal regex accepts the observed wordings", () => {
    const scenario = JSON.parse(readFileSync("src/alter/eval/scenarios/03-demo-3.json", "utf8"));
    expect(scenario.real.text.matches).toEqual([DEMO3_REFUSAL]);
    for (const sample of DEMO3_SAMPLES) {
      expect(textMatches(sample, DEMO3_REFUSAL)).toBe(true);
      expect(
        checkExpect(
          { id: "demo-3", real: { text: { matches: [DEMO3_REFUSAL] } } },
          { text: sample },
          "real"
        )
      ).toEqual([]);
    }
    expect(textMatches("채점했습니다", DEMO3_REFUSAL)).toBe(false);
    expect(textMatches("채점. 없습니다", DEMO3_REFUSAL)).toBe(false);
    expect(
      checkExpect(
        { id: "demo-3", real: { text: { matches: ["("] } } },
        { text: "채점 없음" },
        "real"
      )[0]
    ).toMatch(/bad pattern/);
  });

  test("demo-1 requires the empty-course phrase only when the fixture count is above zero", () => {
    const scenario = JSON.parse(readFileSync("src/alter/eval/scenarios/01-demo-1.json", "utf8"));
    expect(scenario.expect.text.containsOnce).toEqual(["수강생이 없는 수업"]);
    expect(scenario.real.text.anyOf).toBeUndefined();
    const judge = (text, fixtureTodos) =>
      checkExpect(
        scenario,
        {
          text,
          toolNames: ["get_my_todos"],
          toolSteps: 1,
          notification: { type: "alterSchedule", description: "이번 주 할 일이 없습니다." },
          fixtureTodos,
        },
        "real"
      );
    const none = { emptyCourseCount: 0, courseNames: [] };
    expect(judge("이번 주 할 일이 없습니다.", none)).toEqual([]);
    expect(judge("확인할 수업은 없고, 이번 주 할 일이 없습니다.", none)).toEqual([]);
    expect(fabricatedCourseNames("수강생이 없는 수업은 없습니다.", [])).toEqual([]);
    expect(judge("이번 주 할 일이 없습니다. 수학 수업 평가가 있습니다.", none)[0]).toMatch(
      /fabricated course names 수학/
    );
    expect(judge("이번 주 할 일이 없습니다. 수학은 평가 대상이 아닙니다.", none)[0]).toMatch(
      /fabricated course names 수학/
    );
    expect(judge("수강생이 없는 수업은 11개입니다.", none)[0]).toMatch(/text missed/);
    expect(judge("수강생이 없는 수업은 2개입니다.", { emptyCourseCount: 2, courseNames: ["문학"] })).toEqual(
      []
    );
    expect(judge("이번 주 할 일이 없습니다.", { emptyCourseCount: 2, courseNames: [] })[0]).toMatch(
      /수강생이 없는 수업/
    );
    expect(
      judge("이번 주 할 일이 없습니다. 수학은 수강생이 있습니다.", {
        emptyCourseCount: 0,
        courseNames: ["수학"],
      })
    ).toEqual([]);
    expect(judge("이번 주 할 일이 없습니다.", undefined)[0]).toMatch(/empty-course count missing/);
  });

  test("the eval-teacher fixture has no courses without students", async () => {
    await startEvalMongo();
    try {
      const facts = await readFixtureTodoFacts({
        academyId: EVAL_ACADEMY,
        user: { _id: new mongoose.Types.ObjectId(), userId: "teacher1" },
        school: { _id: new mongoose.Types.ObjectId() },
        seasonId: String(new mongoose.Types.ObjectId()),
      });
      expect(facts).toEqual({ emptyCourseCount: 0, courseNames: [] });
    } finally {
      await stopEvalMongo();
    }
  });

  test("report answers are masked and truncated", () => {
    expect(previewAnswer("메일 teacher@school.com 전화 010-1234-5678")).toBe(
      "메일 [이메일] 전화 [연락처]"
    );
    expect(previewAnswer("주민 900101-1234567")).toBe("주민 [개인정보]");
    const key = "sk-live-secret-value";
    expect(previewAnswer(`key ${key} here`, [key])).toBe("key [redacted] here");
    const long = "가".repeat(1200);
    const preview = previewAnswer(long);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBe(1001);
  });

  test("printed output drops the provider key", () => {
    const key = "sk-live-secret-value";
    expect(redactSecrets(`provider said ${key} in the body`, [key])).toBe(
      "provider said [redacted] in the body"
    );
    expect(redactSecrets("short", ["ab"])).toBe("short");
  });
});
