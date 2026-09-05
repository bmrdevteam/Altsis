// Jest setup — ensure NODE_ENV=test for unit/integration tests
process.env.NODE_ENV = process.env.NODE_ENV || "test";

// Dummy keys so mongoose-encryption plugins can initialize when models load.
// Not used for real data; only needed because Archive/Enrollment register at import time.
process.env.ENCKEY_A =
  process.env.ENCKEY_A || "RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=";
process.env.SIGKEY_A =
  process.env.SIGKEY_A ||
  "DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==";
process.env.ENCKEY_E =
  process.env.ENCKEY_E || "RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=";
process.env.SIGKEY_E =
  process.env.SIGKEY_E ||
  "DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==";
process.env.DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017";
process.env.s3_accessKeyId = process.env.s3_accessKeyId || "test-access-key";
process.env.s3_secretAccessKey =
  process.env.s3_secretAccessKey || "test-secret-key";
process.env.s3_accessKeyId2 = process.env.s3_accessKeyId2 || "test-access-key-2";
process.env.s3_secretAccessKey2 =
  process.env.s3_secretAccessKey2 || "test-secret-key-2";
process.env.s3_region = process.env.s3_region || "ap-northeast-2";
process.env.s3_bucket = process.env.s3_bucket || "test-bucket";
process.env.s3_bucket2 = process.env.s3_bucket2 || "test-bucket-2";
