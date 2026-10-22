/**
 * Same rule as `localFileBucket`: Jest placeholders and the local-guide
 * bucket are not a file store unless `s3_endpoint2` is set. Real eval stops
 * on that case before any model call.
 */
const PLACEHOLDER_BUCKETS = new Set(["test-bucket-2", "local-files"]);
const PLACEHOLDER_KEYS = new Set(["test-access-key-2"]);

export const REAL_EVAL_STORAGE_ERROR =
  "real 평가는 파일 저장소가 테스트용 기본값이라 모델을 호출하지 않고 멈춥니다. s3_bucket2가 test-bucket-2 또는 local-files이거나 s3_accessKeyId2가 test-access-key-2인데 s3_endpoint2가 없습니다. backend/.env가 반영되지 않았거나 셸 환경변수가 그 기본값을 넣고 있습니다. 셸 값이 우선합니다.";

export const realEvalStorageError = (env = process.env) => {
  if (String(env.s3_endpoint2 || "").trim()) return "";
  const bucket = String(env.s3_bucket2 || "").trim();
  const accessKeyId = String(env.s3_accessKeyId2 || "").trim();
  if (!PLACEHOLDER_BUCKETS.has(bucket) && !PLACEHOLDER_KEYS.has(accessKeyId)) return "";
  return REAL_EVAL_STORAGE_ERROR;
};
