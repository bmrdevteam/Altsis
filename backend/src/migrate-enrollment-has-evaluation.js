/**
 * Enrollment.hasEvaluation 백필 마이그레이션 (선택 실행)
 *
 * 실행 방법:
 *   NODE_ENV=local node --experimental-specifier-resolution=node src/migrate-enrollment-has-evaluation.js
 *
 * 배경:
 * - evaluation은 암호화 필드라 DB 쿼리로 내용 유무를 판별할 수 없다.
 * - 학기 평가 데이터 존재 여부 검사를 O(인덱스)로 만들기 위해 비암호화 플래그
 *   hasEvaluation을 추가했다.
 * - 플래그 도입 이전 enrollment에는 이 필드가 없으며, 평가 양식 잠금 검사는
 *   필드가 없는 경우 보수적으로 "평가 데이터 있음"으로 간주해 잠근다.
 *
 * 이 스크립트는 필수가 아니다. 실행하면 레거시 enrollment의 실제 평가 유무를
 * 계산해 채워주므로, 평가 데이터가 없는 과거 학기의 양식 잠금을 해제할 수 있다.
 *
 * 수행 내용:
 * - 모든 academy의 모든 Enrollment를 순회하며 evaluation을 복호화해
 *   hasEvaluation 값을 계산하고, 값이 다른 경우에만 $set으로 갱신한다.
 * - $set은 컬렉션 단위 업데이트라 evaluation(_ct)을 재암호화하지 않는다.
 */

import "./env.js";
import mongoose from "mongoose";
import { conn } from "./_database/mongodb/index.js";
import { Enrollment } from "./models/index.js";
import { isEmptyValue } from "./utils/isEmptyValue.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BATCH_SIZE = 500;

const run = async () => {
  console.log("Waiting for DB connections...");
  await sleep(3000);

  const academyIds = Object.keys(conn).filter((id) => id !== "root");
  console.log(`Found ${academyIds.length} academy(ies)`);

  let grandTotal = 0;
  let grandUpdated = 0;

  for (const academyId of academyIds) {
    console.log(`\n--- Processing academy: ${academyId} ---`);

    const Model = Enrollment(academyId);
    const cursor = Model.find({}).select("+evaluation").cursor();

    let ops = [];
    let processed = 0;
    let updated = 0;

    const flush = async () => {
      if (ops.length === 0) return;
      const res = await Model.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
      ops = [];
    };

    for await (const enrollment of cursor) {
      processed++;
      const computed = !isEmptyValue(enrollment.evaluation);

      // 값이 이미 일치하면 건너뛰어 불필요한 쓰기를 줄인다.
      if (enrollment.hasEvaluation === computed) continue;

      ops.push({
        updateOne: {
          filter: { _id: enrollment._id },
          update: { $set: { hasEvaluation: computed } },
        },
      });

      if (ops.length >= BATCH_SIZE) {
        await flush();
      }
    }
    await flush();

    console.log(`  Processed: ${processed}, Updated: ${updated}`);
    grandTotal += processed;
    grandUpdated += updated;
  }

  console.log(`\n=== Migration complete ===`);
  console.log(`  Processed: ${grandTotal} enrollment(s)`);
  console.log(`  Updated:   ${grandUpdated} enrollment(s)`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
