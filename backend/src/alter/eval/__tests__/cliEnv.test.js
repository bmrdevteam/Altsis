import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { localFileBucket } from "../../../services/alterImage.js";
import { applyEvalEnvDefaults, ensureEvalNodeEnv } from "../evalEnvDefaults.js";
import { REAL_EVAL_STORAGE_ERROR, realEvalStorageError } from "../realStorage.js";

const evalDir = resolve(process.cwd(), "src/alter/eval");
const cliPath = resolve(evalDir, "cli.js");
const prepareHref = pathToFileURL(resolve(evalDir, "prepareEvalEnv.js")).href;
const storageHref = pathToFileURL(resolve(evalDir, "realStorage.js")).href;

const childEnv = (extra = {}) => {
  const env = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "USER", "LANG", "MONGOMS_SYSTEM_BINARY"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return { ...env, ...extra };
};

const runNode = (args, { cwd, env, timeout = 30000 } = {}) =>
  spawnSync(process.execPath, args, {
    cwd,
    env: childEnv(env),
    encoding: "utf8",
    timeout,
  });

const probeEnv = (fileText, shell = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "alter-eval-env-"));
  try {
    if (fileText != null) writeFileSync(join(dir, ".env"), fileText);
    const probe = join(dir, "probe.mjs");
    writeFileSync(
      probe,
      `const shellNodeEnv = Object.prototype.hasOwnProperty.call(process.env, "NODE_ENV")
        ? process.env.NODE_ENV
        : undefined;
      const { prepareEvalEnv } = await import(${JSON.stringify(prepareHref)});
      const { realEvalStorageError } = await import(${JSON.stringify(storageHref)});
      prepareEvalEnv(true, { shellNodeEnv });
      process.stdout.write(JSON.stringify({
        nodeEnv: process.env.NODE_ENV || "",
        bucket: process.env.s3_bucket2 || "",
        endpoint: process.env.s3_endpoint2 || "",
        access: process.env.s3_accessKeyId2 || "",
        blocked: realEvalStorageError() ? "blocked" : "open",
      }));
`
    );
    const child = runNode([probe], { cwd: dir, env: shell });
    if (child.status !== 0) {
      throw new Error(child.stderr || child.stdout || `probe status ${child.status}`);
    }
    return JSON.parse(child.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe("alter eval env", () => {
  test("the cli loads the app env, and a shell variable wins over the file", () => {
    const cli = readFileSync(cliPath, "utf8");
    expect(cli).not.toContain("../../../env.js");
    expect(cli.indexOf("process.env.NODE_ENV")).toBeLessThan(cli.indexOf('import("./prepareEvalEnv.js")'));
    expect(cli.indexOf("realEvalStorageError")).toBeLessThan(cli.indexOf('import("./run.js")'));

    const fromFile = probeEnv(
      "s3_bucket2=dotenv-bucket\ns3_endpoint2=http://127.0.0.1:9000\ns3_accessKeyId2=dotenv-access\n"
    );
    expect(fromFile).toEqual({
      nodeEnv: "development",
      bucket: "dotenv-bucket",
      endpoint: "http://127.0.0.1:9000",
      access: "dotenv-access",
      blocked: "open",
    });

    const fromShell = probeEnv(
      "s3_bucket2=dotenv-bucket\ns3_endpoint2=http://127.0.0.1:9000\ns3_accessKeyId2=dotenv-access\n",
      { s3_bucket2: "shell-bucket", s3_endpoint2: "http://10.0.0.1:9000" }
    );
    expect(fromShell.bucket).toBe("shell-bucket");
    expect(fromShell.endpoint).toBe("http://10.0.0.1:9000");
    expect(fromShell.access).toBe("dotenv-access");
    expect(fromShell.blocked).toBe("open");
  });

  test("missing file values stay on the jest placeholders and block real mode", () => {
    const empty = {};
    applyEvalEnvDefaults(empty);
    expect(empty.s3_bucket2).toBe("test-bucket-2");
    expect(empty.s3_accessKeyId2).toBe("test-access-key-2");
    expect(empty.s3_endpoint2).toBeUndefined();
    expect(empty.NODE_ENV).toBeUndefined();
    expect(realEvalStorageError(empty)).toBe(REAL_EVAL_STORAGE_ERROR);

    const kept = {
      s3_bucket2: "dotenv-bucket",
      s3_accessKeyId2: "dotenv-access",
      s3_endpoint2: "http://127.0.0.1:9000",
    };
    applyEvalEnvDefaults(kept);
    expect(kept.s3_bucket2).toBe("dotenv-bucket");
    expect(realEvalStorageError(kept)).toBe("");

    const probed = probeEnv(null, {});
    expect(probed.bucket).toBe("test-bucket-2");
    expect(probed.access).toBe("test-access-key-2");
    expect(probed.endpoint).toBe("");
    expect(probed.blocked).toBe("blocked");
  });

  test("real mode refuses the same placeholders as local file storage", () => {
    const rows = [
      { s3_bucket2: "test-bucket-2", s3_accessKeyId2: "dotenv-access", s3_endpoint2: "" },
      { s3_bucket2: "altsis-files", s3_accessKeyId2: "test-access-key-2", s3_endpoint2: "" },
      { s3_bucket2: "local-files", s3_accessKeyId2: "dotenv-access", s3_endpoint2: "  " },
      {
        s3_bucket2: "test-bucket-2",
        s3_accessKeyId2: "test-access-key-2",
        s3_endpoint2: "http://127.0.0.1:9000",
      },
      { s3_bucket2: "altsis-files", s3_accessKeyId2: "dotenv-access", s3_endpoint2: "" },
    ];
    for (const env of rows) {
      expect(Boolean(realEvalStorageError(env))).toBe(
        localFileBucket(env.s3_bucket2, env.s3_accessKeyId2, env.s3_endpoint2)
      );
    }
    expect(REAL_EVAL_STORAGE_ERROR).toContain("test-bucket-2");
    expect(REAL_EVAL_STORAGE_ERROR).toContain("test-access-key-2");
    expect(REAL_EVAL_STORAGE_ERROR).toContain("모델을 호출하지 않");
    expect(REAL_EVAL_STORAGE_ERROR).not.toMatch(/secret|ENCKEY|SIGKEY/i);
  });

  test("scripted mode keeps NODE_ENV=test unless the shell set it", () => {
    const scripted = {};
    ensureEvalNodeEnv(false, scripted, undefined);
    expect(scripted.NODE_ENV).toBe("test");

    const fromFile = { NODE_ENV: "development" };
    ensureEvalNodeEnv(false, fromFile, undefined);
    expect(fromFile.NODE_ENV).toBe("test");

    const fromShell = { NODE_ENV: "development" };
    ensureEvalNodeEnv(false, fromShell, "development");
    expect(fromShell.NODE_ENV).toBe("development");

    const real = { NODE_ENV: "production" };
    ensureEvalNodeEnv(true, real, undefined);
    expect(real.NODE_ENV).toBe("production");

    const realBlank = {};
    ensureEvalNodeEnv(true, realBlank, undefined);
    expect(realBlank.NODE_ENV).toBe("development");
  });

  test("eval:real stops on the jest file bucket before it runs scenarios", () => {
    const dir = mkdtempSync(join(tmpdir(), "alter-eval-real-"));
    try {
      const child = runNode([cliPath, "--real", "--only", "image-ok"], {
        cwd: dir,
        env: { NODE_ENV: "development", s3_bucket2: "test-bucket-2" },
      });
      expect(child.status).toBe(1);
      expect(child.stdout).toContain(REAL_EVAL_STORAGE_ERROR);
      expect(child.stdout).not.toContain("scenarios");
      expect(child.stdout).not.toContain("학원 설정");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("eval:scripted still runs when the file bucket is the jest placeholder", () => {
    const child = runNode([cliPath, "--only", "does-not-exist"], {
      cwd: process.cwd(),
      timeout: 180000,
    });
    const report = child.stdout
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.includes(`${join("src", "alter", "eval", "out")}`));
    if (report) rmSync(report, { force: true });
    expect(child.status).toBe(1);
    expect(child.stdout).toContain("scripted scenarios passed 0 failed 0");
    expect(child.stdout).not.toContain("모델을 호출하지 않");
  }, 180000);
});
