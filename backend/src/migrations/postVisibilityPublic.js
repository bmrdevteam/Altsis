/**
 * 기존 게시글을 공개(isDraft:false)로 일괄 복구.
 * 스키마 기본값이 일시적으로 true였던 영향으로 비공개로 잡힌 문서 보정.
 * 의도적 비공개(기능 도입 이후 생성)는 건드리지 않는다.
 * 아카데미별로 1회만 실행.
 */
import { Academy } from "../models/index.js";
import { Post } from "../models/Post.js";
import { conn, isConnected } from "../_database/mongodb/index.js";
import { logger } from "../log/logger.js";

const MIGRATION_KEY = "2026-07-24-posts-isDraft-public-v2";
/** 비공개/공개 기능 도입일 — 이전 생성분만 공개로 복구 */
const LEGACY_CUTOFF = new Date("2026-07-24T00:00:00+09:00");

const waitForMongo = async (timeoutMs = 30000) => {
  const started = Date.now();
  while (!isConnected) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("MongoDB connection timeout");
    }
    await new Promise((r) => setTimeout(r, 200));
  }
};

export const migrateExistingPostsToPublic = async () => {
  try {
    await waitForMongo();

    if (!conn.root?.db) {
      logger.warn("Post visibility migration skipped: no root connection");
      return;
    }

    const migrations = conn.root.db.collection("_migrations");
    const existing = await migrations.findOne({ key: MIGRATION_KEY });
    if (existing) return;

    const academies = await Academy.find({}).select("+dbName academyId");
    let total = 0;
    const skipped = [];

    for (const academy of academies) {
      if (academy.academyId === "root") continue;
      if (!conn[academy.academyId]) {
        skipped.push(academy.academyId);
        continue;
      }

      const result = await Post(academy.academyId).updateMany(
        {
          isDraft: true,
          createdAt: { $lt: LEGACY_CUTOFF },
        },
        { $set: { isDraft: false } }
      );
      total += result.modifiedCount || 0;
    }

    if (skipped.length > 0) {
      logger.warn(
        `Post visibility migration deferred (missing conn): ${skipped.join(", ")}`
      );
      return;
    }

    await migrations.insertOne({
      key: MIGRATION_KEY,
      ranAt: new Date(),
      modifiedCount: total,
      cutoff: LEGACY_CUTOFF,
    });

    logger.info(
      `Post visibility migration done: ${total} posts set to public`
    );
  } catch (err) {
    logger.error(`Post visibility migration failed: ${err.message}`);
  }
};
