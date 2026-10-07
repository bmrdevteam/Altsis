import "../../../env.js";
import { redactSecrets } from "./redact.js";
import { runEval } from "./run.js";

const args = process.argv.slice(2);
const real = args.includes("--real");
const onlyFlag = args.find((arg) => arg.startsWith("--only"));
const only = onlyFlag?.includes("=")
  ? onlyFlag.slice("--only=".length)
  : args[args.indexOf("--only") + 1] || "";
const academyFlag = args.find((arg) => arg.startsWith("--academy="));
const academyId = academyFlag ? academyFlag.slice("--academy=".length) : "bmr";

const secrets = [];
const say = (line) => {
  process.stdout.write(`${redactSecrets(line, secrets)}\n`);
};

let report;
try {
  report = await runEval({
    mode: real ? "real" : "scripted",
    only,
    academyId,
    onSecret: (value) => secrets.push(value),
  });
} catch (err) {
  say(err?.message || "eval failed");
  process.exit(1);
}
say(`${report.mode} passed ${report.passed} failed ${report.failures.length} total ${report.total}`);
for (const row of report.failures) say(row);
process.exit(report.failures.length ? 1 : 0);
