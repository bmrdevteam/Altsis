import { evalExitCode, parseEvalArgs } from "./args.js";
import { redactSecrets } from "./redact.js";
import { realEvalStorageError } from "./realStorage.js";

const shellNodeEnv = Object.prototype.hasOwnProperty.call(process.env, "NODE_ENV")
  ? process.env.NODE_ENV
  : undefined;
const { real, only, academyId } = parseEvalArgs(process.argv.slice(2));
const { prepareEvalEnv } = await import("./prepareEvalEnv.js");
prepareEvalEnv(real, { shellNodeEnv });

const secrets = [];
const say = (line) => {
  process.stdout.write(`${redactSecrets(line, secrets)}\n`);
};

if (real) {
  const storageError = realEvalStorageError();
  if (storageError) {
    say(storageError);
    process.exit(1);
  }
}

const { runEval } = await import("./run.js");

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
  for (const item of row.diagnostics || []) {
    const bits = [item.name, item.error, item.status, item.providerCode].filter(
      (part) => part != null && part !== ""
    );
    if (bits.length) say(`  diagnostic ${bits.join(" ")}`);
  }
}
if (report.reportFile) say(report.reportFile);
process.exit(evalExitCode(report));
