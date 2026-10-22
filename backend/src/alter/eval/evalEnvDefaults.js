/**
 * Blanks the scripted importer still needs when `backend/.env` omits them.
 * Same placeholders as Jest's `backend/env.js`, applied only when a value
 * is missing. Shell and dotenv values stay. `NODE_ENV` is not filled here.
 */
const FILL = {
  ENCKEY_A: "RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=",
  SIGKEY_A:
    "DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==",
  ENCKEY_E: "RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=",
  SIGKEY_E:
    "DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==",
  DB_URL: "mongodb://127.0.0.1:27017",
  s3_accessKeyId: "test-access-key",
  s3_secretAccessKey: "test-secret-key",
  s3_accessKeyId2: "test-access-key-2",
  s3_secretAccessKey2: "test-secret-key-2",
  s3_region: "ap-northeast-2",
  s3_bucket: "test-bucket",
  s3_bucket2: "test-bucket-2",
};

const blank = (value) => !String(value ?? "").trim();

export const applyEvalEnvDefaults = (env = process.env) => {
  for (const [key, value] of Object.entries(FILL)) {
    if (blank(env[key])) env[key] = value;
  }
  return env;
};

/**
 * Scripted runs must keep `NODE_ENV=test` when the shell did not set it, so
 * importing models does not open a live cluster. Real runs must not be forced
 * into that test value, or the manual-mode guard refuses them. A `NODE_ENV`
 * already in the shell wins over dotenv.
 */
export const ensureEvalNodeEnv = (real, env = process.env, shellNodeEnv) => {
  if (shellNodeEnv !== undefined && !blank(shellNodeEnv)) {
    env.NODE_ENV = String(shellNodeEnv).trim();
    return env;
  }
  if (!real) {
    env.NODE_ENV = "test";
    return env;
  }
  if (blank(env.NODE_ENV)) env.NODE_ENV = "development";
  return env;
};
