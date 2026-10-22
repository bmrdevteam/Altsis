import "./loadAppEnv.js";
import { applyEvalEnvDefaults, ensureEvalNodeEnv } from "./evalEnvDefaults.js";

/** Load the app env file, then keep scripted imports runnable. */
export const prepareEvalEnv = (real, { shellNodeEnv, env = process.env } = {}) => {
  ensureEvalNodeEnv(real, env, shellNodeEnv);
  applyEvalEnvDefaults(env);
};
