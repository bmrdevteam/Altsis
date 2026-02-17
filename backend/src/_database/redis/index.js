import { createClient } from "redis";
import { logger } from "../../log/logger.js";

let isConnected = false;
let client = undefined;

if (
  process.env.NODE_ENV.trim() !== "local" &&
  process.env.NODE_ENV.trim() !== "test"
) {
  client = createClient({
    url: process.env["REDIS_URL"],
    logErrors: true,
    legacyMode: true,
  });
} else {
  client = createClient({
    host: "127.0.0.1",
    port: 6369,
    db: 0,
    logErrors: true,
    legacyMode: true,
  });
}

client.connect();

client.on("error", function (err) {
  logger.error(err.message);
});

client.on("ready", async () => {
  logger.info("Redis is connected");
  isConnected = true;
});

export { client, isConnected };
