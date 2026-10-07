import { checkExpect } from "./assertions.js";
import { runAgentScenario } from "./agentScenario.js";
import { loadScenarios, scenarioSelected } from "./loadScenarios.js";
import { startEvalMongo, stopEvalMongo } from "./mongo.js";
import { redactSecrets } from "./redact.js";
import { runServiceCheck } from "./serviceChecks.js";

const loadRealAcademy = async (academyId, onSecret) => {
  const { Academy } = await import("../../models/Academy.js");
  const row = await Academy.findOne({ academyId })
    .select("+aiApiKey aiProvider aiModel")
    .lean();
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

export const runEval = async ({ mode = "scripted", only = "", onSecret, academyId = "bmr" } = {}) => {
  if (mode === "real" && process.env.NODE_ENV === "test" && process.env.ALTER_EVAL_REAL !== "1") {
    throw new Error("real 모드는 수동 실행입니다.");
  }
  const scenarios = loadScenarios().filter((row) => scenarioSelected(row.id, only));
  const secrets = [];
  const remember = (value) => {
    secrets.push(value);
    if (typeof onSecret === "function") onSecret(value);
  };
  let academy = null;
  if (mode === "real") academy = await loadRealAcademy(academyId, remember);
  await startEvalMongo();
  const failures = [];
  let passed = 0;
  try {
    for (const scenario of scenarios) {
      if (scenario.mode === "real" && mode !== "real") continue;
      try {
        const result = scenario.check
          ? await runServiceCheck(scenario, { mode, academy })
          : await runAgentScenario(scenario, { mode, academy });
        const found = checkExpect(scenario, result);
        if (found.length) failures.push(...found);
        else passed += 1;
      } catch (err) {
        const message = redactSecrets(err?.message || String(err), secrets);
        failures.push(`${scenario.id}: ${message}`);
      }
    }
  } finally {
    await stopEvalMongo();
  }
  return { passed, failed: failures, failures, total: scenarios.length, mode };
};
