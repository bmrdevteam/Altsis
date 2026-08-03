import { app, ready } from "./app.js";
import { initializeWebSocket } from "./utils/webSocket.js";
import { initializeScheduler } from "./services/scheduler.js";
import { migrateExistingPostsToPublic } from "./migrations/postVisibilityPublic.js";
import { migrateSeasonAiToSchool } from "./migrations/migrateSeasonAiToSchool.js";
import { logger } from "./log/logger.js";

let server = undefined;

const startServer = async () => {
  await ready();
  server = app.listen(app.get("port"), function () {
    logger.info(`Express server listening on port ${server.address().port}`);
  });
  initializeWebSocket(server);
  await initializeScheduler();
  // 기존 문서 공개 상태 복구 (1회)
  migrateExistingPostsToPublic().catch((err) =>
    logger.error(`Post visibility migration error: ${err.message}`)
  );
  // 시즌 AI 설정 → 학교 aiConfig/라이브러리 이관 (1회)
  migrateSeasonAiToSchool().catch((err) =>
    logger.error(`Season→School AI migration error: ${err.message}`)
  );
};

startServer();

export { server };
