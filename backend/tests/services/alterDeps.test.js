import { execFile } from "child_process";
import { mkdir, rm, rmdir, writeFile } from "fs/promises";

const probeDir = "src/alter/core";
const probe = `${probeDir}/depProbe.js`;

const cruise = () =>
  new Promise((resolve, reject) => {
    execFile(
      "./node_modules/.bin/depcruise",
      [
        "--config",
        ".dependency-cruiser.cjs",
        "--ignore-known",
        ".dependency-cruiser-known-violations.json",
        "src",
      ],
      { cwd: process.cwd() },
      (err, stdout, stderr) => {
        if (err) {
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });

describe("alter dependency boundaries", () => {
  afterEach(async () => {
    await rm(probe, { force: true });
    await rmdir(probeDir).catch(() => {});
  });

  test("the committed baseline has no new violations", async () => {
    const result = await cruise();
    expect(`${result.stdout}\n${result.stderr}`).not.toMatch(/error [a-z]/);
  });

  test("a core file that imports a domain service fails", async () => {
    await mkdir(probeDir, { recursive: true });
    await writeFile(
      probe,
      'import { maskSensitiveText } from "../../services/aiSafety.js";\nexport const probe = maskSensitiveText;\n'
    );
    await expect(cruise()).rejects.toMatchObject({
      stdout: expect.stringMatching(/core-depends-on-nothing/),
    });
  });
});
