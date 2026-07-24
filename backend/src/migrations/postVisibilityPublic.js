/**
 * 기존 게시글을 공개(isDraft:false)로 일괄 복구.
 * 스키마 기본값이 일시적으로 true였던 영향으로 비공개로 잡힌 문서 보정.
 * 아카데미별로 1회만 실행.
 */
import { Academy } from "../models/index.js";
import { Post } from "../models/Post.js";
import { conn, isConnected } from "../_database/mongodb/index.js";
import { logger } from "../log/logger.js";

const MIGRATION_KEY = "2026-07-24-posts-isDraft-public";

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

    for (const academy of academies) {
      if (academy.academyId === "root") continue;
      if (!conn[academy.academyId]) continue;

      const result = await Post(academy.academyId).updateMany(
        { isDraft: true },
        { $set: { isDraft: false } }
      );
      total += result.modifiedCount || 0;
    }

    await migrations.insertOne({
      key: MIGRATION_KEY,
      ranAt: new Date(),
      modifiedCount: total,
    });

    logger.info(
      `Post visibility migration done: ${total} posts set to public`
    );
  } catch (err) {
    logger.error(`Post visibility migration failed: ${err.message}`);
  }
};
