/**
 * 보드 시스템 마이그레이션: 권한 기반 → 초대 기반
 *
 * 실행 방법:
 *   NODE_ENV=local node --experimental-specifier-resolution=node src/migrate-boards-invitation.js
 *
 * 수행 내용:
 * - 모든 비-default 보드의 members.groups / writers.groups를 false로 설정
 * - 모든 비-default 보드의 members.users / writers.users를 비움 (생성자/admin만 접근 가능)
 * - default 보드(공지사항)는 변경하지 않음
 */

import "./env.js";
import mongoose from "mongoose";
import { conn } from "./_database/mongodb/index.js";
import { Board } from "./models/index.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  // DB 연결 대기
  console.log("Waiting for DB connections...");
  await sleep(3000);

  const academyIds = Object.keys(conn).filter((id) => id !== "root");
  console.log(`Found ${academyIds.length} academy(ies)`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const academyId of academyIds) {
    console.log(`\n--- Processing academy: ${academyId} ---`);

    const boards = await Board(academyId).find({ isActive: true });
    console.log(`  Found ${boards.length} active board(s)`);

    for (const board of boards) {
      if (board.isDefault) {
        console.log(`  [SKIP] "${board.name}" (기본 보드)`);
        totalSkipped++;
        continue;
      }

      const hadGroups =
        board.members?.groups?.manager ||
        board.members?.groups?.teacher ||
        board.members?.groups?.student;
      const hadUsers = (board.members?.users?.length || 0) > 0;

      // groups를 모두 false로, users를 비움
      board.members = {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      };
      board.writers = {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      };

      board.markModified("members");
      board.markModified("writers");
      await board.save();

      console.log(
        `  [RESET] "${board.name}" (groups: ${hadGroups ? "ON→OFF" : "OFF"}, users: ${hadUsers ? "cleared" : "empty"})`
      );
      totalUpdated++;
    }
  }

  console.log(`\n=== Migration complete ===`);
  console.log(`  Updated: ${totalUpdated} board(s)`);
  console.log(`  Skipped: ${totalSkipped} board(s) (default)`);

  // 연결 종료
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
