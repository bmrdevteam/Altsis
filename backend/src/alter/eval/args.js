/** CLI flags for the eval runner. `--only` is optional; a missing value does not borrow the next flag. */
export const parseEvalArgs = (argv) => {
  const args = Array.isArray(argv) ? argv : [];
  let real = false;
  let only = "";
  let academyId = "bmr";
  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || "");
    if (arg === "--real") {
      real = true;
      continue;
    }
    if (arg === "--only") {
      const next = args[i + 1];
      if (next != null && !String(next).startsWith("--")) {
        only = String(next);
        i += 1;
      }
      continue;
    }
    if (arg.startsWith("--only=")) {
      only = arg.slice("--only=".length);
      continue;
    }
    if (arg.startsWith("--academy=")) {
      const value = arg.slice("--academy=".length);
      if (value) academyId = value;
    }
  }
  return { real, only, academyId, mode: real ? "real" : "scripted" };
};

/** Non-zero when nothing ran or any scenario failed. Skips alone are not a failure. */
export const evalExitCode = (report) => {
  const ran = Number(report?.ran) || 0;
  const failed = Number(report?.failed) || 0;
  if (ran === 0 || failed > 0) return 1;
  return 0;
};
