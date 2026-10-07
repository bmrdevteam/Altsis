import "../../../env.js";
import { evalExitCode, parseEvalArgs } from "./args.js";
import { redactSecrets } from "./redact.js";
import { runEval } from "./run.js";

const { real, only, academyId } = parseEvalArgs(process.argv.slice(2));

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

say(
  `${report.mode} scenarios passed ${report.passed} failed ${report.failed} skipped ${report.skipped} ran ${report.ran} tokens ${report.tokens?.total ?? 0}`
);
say("id\tstatus\ttools\tms\ttokens");
for (const row of report.scenarios || []) {
  const tools = (row.toolNames || []).join(",") || "-";
  say(`${row.id}\t${row.status}\t${tools}\t${row.latencyMs ?? 0}\t${row.tokens?.total ?? 0}`);
  if (row.status !== "fail") continue;
  for (const line of row.assertions || []) say(`  ${line}`);
}
if (report.reportFile) say(report.reportFile);
process.exit(evalExitCode(report));
