import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { checkExpect } from "./assertions.js";
import { runAgentScenario } from "./agentScenario.js";
import { loadScenarios, scenarioSelected } from "./loadScenarios.js";
import { startEvalMongo, stopEvalMongo } from "./mongo.js";
import { redactSecrets } from "./redact.js";
import { runServiceCheck } from "./serviceChecks.js";
import { maskSensitiveText } from "../core/safety.js";
import { loadAcademyProviderSettings } from "../policy/access.js";

const ANSWER_PREVIEW = 1000;

/** Final answer stored in the report: PII masked, secrets redacted, then cut to about 1,000 chars. */
export const previewAnswer = (text, secrets = []) => {
  const masked = maskSensitiveText(text).text;
  const hidden = redactSecrets(masked, secrets);
  if (hidden.length <= ANSWER_PREVIEW) return hidden;
  return `${hidden.slice(0, ANSWER_PREVIEW)}…`;
};

const loadRealAcademy = async (academyId, onSecret) => {
  const row = await loadAcademyProviderSettings(academyId);
  const apiKey = String(row?.aiApiKey || "");
  if (!apiKey) {
    throw new Error("학원 설정에서 프로바이더 키를 읽지 못했습니다.");
  }
  if (typeof onSecret === "function") onSecret(apiKey);
  if (apiKey === "scripted-local-dev") {
    throw new Error("학원 키가 로컬 데모 키입니다. 실제 프로바이더 키로 바꿔 주세요.");
  }
  return {
    aiApiKey: apiKey,
    aiProvider: row.aiProvider || "openai",
    aiModel: row.aiModel || "",
  };
};

/** Explicit `modes` wins. A legacy `mode` label does not limit the run. */
export const scenarioModes = (scenario) => {
  if (Array.isArray(scenario?.modes) && scenario.modes.length) {
    return scenario.modes.map((mode) => String(mode));
  }
  return ["scripted", "real"];
};

const tokensFrom = (usage) => ({
  prompt: Number(usage?.promptTokens) || 0,
  completion: Number(usage?.candidatesTokens) || 0,
  total: Number(usage?.totalTokens) || 0,
});

const sumTokens = (rows) =>
  rows.reduce(
    (sum, row) => ({
      prompt: sum.prompt + (Number(row.tokens?.prompt) || 0),
      completion: sum.completion + (Number(row.tokens?.completion) || 0),
      total: sum.total + (Number(row.tokens?.total) || 0),
    }),
    { prompt: 0, completion: 0, total: 0 }
  );

const writeEvalReport = (report) => {
  const dir = join(process.cwd(), "src/alter/eval/out");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(dir, `${stamp}.json`);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return file;
};

export const runEval = async ({
  mode = "scripted",
  only = "",
  onSecret,
  academyId = "bmr",
  academy: injectedAcademy = null,
  generate,
  writeReport = true,
} = {}) => {
  if (mode === "real" && process.env.NODE_ENV === "test" && process.env.ALTER_EVAL_REAL !== "1") {
    throw new Error("real 모드는 수동 실행입니다.");
  }
  const scenarios = loadScenarios().filter((row) => scenarioSelected(row.id, only));
  const secrets = [];
  const remember = (value) => {
    secrets.push(value);
    if (typeof onSecret === "function") onSecret(value);
  };
  let academy = injectedAcademy;
  if (mode === "real" && !academy) academy = await loadRealAcademy(academyId, remember);
  if (academy?.aiApiKey) remember(academy.aiApiKey);
  await startEvalMongo();
  const rows = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  try {
    for (const scenario of scenarios) {
      if (!scenarioModes(scenario).includes(mode)) {
        skipped += 1;
        rows.push({
          id: scenario.id,
          status: "skip",
          assertions: [],
          toolNames: [],
          tokens: tokensFrom(null),
          latencyMs: 0,
          text: "",
        });
        continue;
      }
      const started = Date.now();
      try {
        const result = scenario.check
          ? await runServiceCheck(scenario, { mode, academy, generate })
          : await runAgentScenario(scenario, { mode, academy, generate });
        const found = checkExpect(scenario, result, mode).map((line) => redactSecrets(line, secrets));
        const row = {
          id: scenario.id,
          status: found.length ? "fail" : "pass",
          assertions: found,
          toolNames: result.toolNames || [],
          tokens: tokensFrom(result.tokenUsage),
          latencyMs: Date.now() - started,
          text: previewAnswer(result.text, secrets),
        };
        rows.push(row);
        if (found.length) failed += 1;
        else passed += 1;
      } catch (err) {
        failed += 1;
        const message = redactSecrets(err?.message || String(err), secrets);
        rows.push({
          id: scenario.id,
          status: "fail",
          assertions: [`${scenario.id}: ${message}`],
          toolNames: [],
          tokens: tokensFrom(null),
          latencyMs: Date.now() - started,
          text: "",
        });
      }
    }
  } finally {
    await stopEvalMongo();
  }
  const report = {
    mode,
    passed,
    failed,
    skipped,
    ran: passed + failed,
    total: scenarios.length,
    tokens: sumTokens(rows),
    scenarios: rows,
    failures: rows.filter((row) => row.status === "fail").flatMap((row) => row.assertions),
  };
  if (writeReport) report.reportFile = writeEvalReport(report);
  return report;
};
