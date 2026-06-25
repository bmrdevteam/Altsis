import dotenv from "dotenv";
import { resolve } from "path";

/* NODE_ENV is logged via winston logger after initialization */

if (process.env.NODE_ENV?.trim() === "local") {
  const __dirname = resolve();
  dotenv.config({ path: resolve(__dirname, "../.env.local") });
} else if (process.env.NODE_ENV?.trim() === "test") {
  const __dirname = resolve();
  dotenv.config({ path: resolve(__dirname, "../.env.test") });
} else {
  dotenv.config();
}

if (process.env.NODE_ENV?.trim() === "test") {
  // Local/CI test environments may not provide encryption keys.
  // Use deterministic fallback keys so encrypted-schema plugins can initialize.
  const fallbackEncryptionKey = "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=";
  const fallbackSigningKey =
    "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMQ==";
  const testDefaults = {
    ENCKEY_A: fallbackEncryptionKey,
    SIGKEY_A: fallbackSigningKey,
    ENCKEY_E: fallbackEncryptionKey,
    SIGKEY_E: fallbackSigningKey,
    s3_accessKeyId: "test-access-key",
    s3_secretAccessKey: "test-secret-key",
    s3_accessKeyId2: "test-access-key-2",
    s3_secretAccessKey2: "test-secret-key-2",
    s3_region: "ap-northeast-2",
    s3_bucket: "altsis-test-profile",
    s3_bucket2: "altsis-test-file",
    URL: "http://localhost:3000",
    session_key: "altsis-test-session-key",
    SERVER_PORT: "3000",
    DB_URL: "mongodb://localhost:27017",
  };
  Object.entries(testDefaults).forEach(([key, value]) => {
    process.env[key] ??= value;
  });
}
